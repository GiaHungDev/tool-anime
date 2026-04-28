import { SvcApiClient } from '../../SvcApiClient';

export const API_URL = import.meta.env.VITE_API_URL;
export const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL;
export const SVC_API_URL = import.meta.env.VITE_SVC_API_URL;
const setStoredToken = (token: string) => localStorage.setItem('access_token', token);
const getStoredToken = () => localStorage.getItem('access_token');
const removeStoredToken = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('svc_access_token');
};

export const fetchWithAuth = async (url: string, options: any = {}) => {
  const token = localStorage.getItem('access_token');
  const localId = localStorage.getItem('local_owner_id');
  const headers: any = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (localId) headers['x-owner-id'] = localId;

  return fetch(url, { ...options, headers });
};

// Hàm đóng vai trò như verifyAndBindDevice / saveAccountInfo của Firebase
// nhưng chúng ta sẽ lưu thông tin này xuống Local DB.
const verifyAndBindDeviceLocalDb = async (username: string, password: string, computerId: string) => {
  try {
    const res = await fetch(`${API_URL}/auth/login-tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, computerId })
    });
    if (!res.ok) {
      if (res.status === 400) {
        const data = await res.json();
        throw new Error(data.message || 'Device mismatch');
      }
      return { success: false, localUserId: null };
    }
    const data = await res.json();
    let localUserId = null;
    if (data && data.user && data.user.id) {
      localUserId = data.user.id;
    } else if (data && data.access_token) {
       try {
         const pl = JSON.parse(atob(data.access_token));
         localUserId = pl.userId;
       } catch(e) {}
    }
    return { success: true, localUserId }; // Khớp, trả về local owner ID
  } catch (e: any) {
    throw e;
  }
};

export const authService = {
  login: async (username: string, password: string, computerId: string) => {
    try {
      // 1. Đăng nhập qua API Remote thực tế (api.dashboard.yteco.live)
      const response = await fetch(`${AUTH_API_URL}/auth/login-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, computerId }), // Dù remote có dùng hay không, ta cứ chuyển lên
      });

      if (!response.ok) {
        let errorMessage = `Login failed: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch(e) {}
        
        if (response.status === 401 && errorMessage.includes('401')) {
           throw new Error('Invalid credentials');
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result && result.access_token) {
        const token = result.access_token;
        setStoredToken(token);
        localStorage.setItem('username', username);

        // 2. Xác minh và liên kết thiết bị trên DB nội bộ (thay cho Firebase)
        try {
          const bindResult = await verifyAndBindDeviceLocalDb(username, password, computerId);
          if (!bindResult.success) {
            removeStoredToken();
            throw new Error('Mã thiết bị (Computer ID) không trùng khớp với hệ thống.');
          }
          if (bindResult.localUserId) {
            localStorage.setItem('local_owner_id', bindResult.localUserId.toString());
          }
        } catch (dbError: any) {
          removeStoredToken();
          // Quăng đúng nội dung lỗi
          if (dbError.message && (dbError.message.includes('Device mismatch') || dbError.message.includes('Mã thiết bị'))) {
            throw new Error('Mã thiết bị (Computer ID) không trùng khớp với hệ thống. Vui lòng kiểm tra lại!');
          }
          throw dbError;
        }

        // 3. Đăng nhập vào hệ thống SVC (TTS Online)
        try {
            const svcRes = await fetch(`${SVC_API_URL}/api/auth/login`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ username, password, computerId })
            });

            if (!svcRes.ok) {
                throw new Error(`HTTP Error: ${svcRes.status}`);
            }

            const svcData = await svcRes.json();
            if (svcData && svcData.access_token) {
                localStorage.setItem('svc_access_token', svcData.access_token);
            }
        } catch (svcError: any) {
            console.error("SVC Login failed:", svcError);
            removeStoredToken();
            throw new Error('Đăng nhập hệ thống AI (SVC) thất bại. Vui lòng kiểm tra lại tài khoản hoặc liên hệ Admin.');
        }

        // Đã qua 3 vòng, lưu để hiển thị lại và cho auto-login fallback
        localStorage.setItem('saved_password', password);
        localStorage.setItem('computerId', computerId);

        return {
          token,
          isLoggedIn: true,
        };
      }

      return { token: null, isLoggedIn: false };
    } catch (error: any) {
      console.error("Login API call failed:", error);
      removeStoredToken();
      throw error;
    }
  },

  getLoginStatus: () => {
    const token = getStoredToken();
    const username = localStorage.getItem('username');
    if (!token) return { isLoggedIn: false, token: null, username: null };
    return { isLoggedIn: true, token, username };
  },

  getCurrentUserId: () => {
    // Ưu tiên trả về Local Owner ID (để đồng bộ hệ thống Video Cục Bộ)
    const localId = localStorage.getItem('local_owner_id');
    if (localId) return Number(localId);

    const token = getStoredToken();
    if (!token) return null;
    try {
      // Giải mã JWT chuẩn (từ remote) hoặc Base64 raw (từ local cũ)
      let payloadString = token;
      if (token.includes('.')) {
        payloadString = atob(token.split('.')[1]);
      } else {
        payloadString = atob(token);
      }
      const payload = JSON.parse(payloadString);
      // Remote có thể trả về `.id`, `.sub`, `.userId` 
      const remoteId = payload.userId || payload.sub || payload.id || null;
      return remoteId ? Number(remoteId) : null;
    } catch (e) {
      return null;
    }
  },

  logout: async () => {
    removeStoredToken();
    localStorage.removeItem('local_owner_id');
    return Promise.resolve();
  }
};
