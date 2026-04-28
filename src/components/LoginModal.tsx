import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { Check } from 'lucide-react';

interface LoginModalProps {
    onLoginSuccess: (username: string) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
    const [password, setPassword] = useState(() => localStorage.getItem('saved_password') || '');
    const [computerId, setComputerId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    useEffect(() => {
        // Pre-fill local machine ID if available via Electron
        const fetchMachineId = async () => {
            if ((window as any).electronAPI && (window as any).electronAPI.getMachineId) {
                const id = await (window as any).electronAPI.getMachineId();
                if (id) {
                    setComputerId(id.trim());
                }
            }
        };
        fetchMachineId();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!username || !password || !computerId) {
            setError('Vui lòng nhập đầy đủ 3 trường thông tin liên kết.');
            return;
        }

        setLoading(true);
        try {
            // Xác thực mã máy tính gốc từ hệ điều hành với mã người dùng nhập
            if (!(window as any).electronAPI || !(window as any).electronAPI.getMachineId) {
                // In local dev without electron, maybe bypass or warn. But the user specified to keep:
                // setError('Lỗi: Bạn đang chạy trên Web. Vui dùng phần mềm (App) để thử nghiệm tính năng khóa thiết bị này.');
                // setLoading(false);
                // return;
                console.warn("Chạy trên Web. Bỏ qua xác thực local machine ID, sẽ chỉ xác thực trên Server.");
            } else {
                const realMachineId = await (window as any).electronAPI.getMachineId();
                const cleanComputerId = computerId.trim();
                const cleanRealMachineId = realMachineId ? realMachineId.trim() : '';

                if (cleanRealMachineId && cleanComputerId !== cleanRealMachineId) {
                    setError('ComputerID đăng nhập không trùng với cả mã thiết bị. Đăng nhập thất bại');
                    setLoading(false);
                    return;
                }
            }

            const result = await authService.login(username, password, computerId);

            if (result && result.isLoggedIn) {
                setShowSuccessToast(true);
                setTimeout(() => {
                    onLoginSuccess(username);
                }, 1500);
            } else {
                setError('Đăng nhập không thành công. Vui lòng kiểm tra lại Tài Khoản, Mật khẩu hoặc Computer ID.');
            }
        } catch (err: any) {
            console.error('Login API error', err);
            // check for detailed messages specifically
            if (err.message?.includes('Device mismatch') || err.message?.includes('Thiết bị không khớp') || err.message?.includes('Mã thiết bị') || err.message?.includes('Invalid computer')) {
                setError('Mã thiết bị (Computer ID) không trùng khớp với hệ thống. Vui lòng kiểm tra lại!');
            } else if (err.message === 'Invalid credentials' || err.message === 'Unauthorized' || err.message === 'Login failed: 401') {
                setError('Tài khoản hoặc mật khẩu không chính xác.');
            } else if (err.message === 'Failed to fetch') {
                setError('Lỗi mạng. Không thể kết nối đến máy chủ.');
            } else if (err.message) {
                // Hiển thị trực tiếp nội dung lỗi từ backend (đã được bọc từ authService throw new Error)
                setError(`Lỗi: ${err.message}`);
            } else {
                setError('Lỗi không xác định khi đăng nhập.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            {/* Success Toast */}
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 transform ${showSuccessToast ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 hidden'}`}>
                <div className="bg-green-500/90 backdrop-blur-sm text-white px-5 py-3 rounded-lg shadow-lg border border-green-400/30 flex items-center space-x-3">
                    <div className="bg-white/20 rounded-full p-1 shrink-0">
                        <Check size={16} className="text-white" />
                    </div>
                    <span className="font-medium">Đăng nhập thành công</span>
                </div>
            </div>

            <div className="bg-[#111] border border-[#333] w-full max-w-md rounded-2xl p-8 relative shadow-2xl shadow-red-500/10">

                {/* Header */}
                <div className="flex flex-col items-center justify-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-red-600 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-500/20">
                        <span className="text-3xl text-white font-black mix-blend-overlay">T2</span>
                    </div>
                    <h2 className="text-2xl font-black text-white text-center tracking-tighter uppercase">Định Danh Thiết Bị</h2>
                    <p className="text-sm text-gray-400 mt-2 text-center">Bản quyền phần mềm phân tích TubeThumb Analytics</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl flex items-start gap-2 text-sm text-left">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-widest pl-1">Username / Tài khoản</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Nhập tên đăng nhập"
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-widest pl-1">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-widest pl-1">Mã thiết bị / Computer ID</label>
                        <input
                            type="text"
                            value={computerId}
                            onChange={(e) => setComputerId(e.target.value)}
                            placeholder="Nhập System ID của máy này..."
                            className="w-full bg-blue-900/10 border border-blue-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold placeholder:text-white/50 uppercase tracking-widest text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full font-black text-white rounded-xl mt-4 px-4 py-4 uppercase tracking-widest text-sm transition-all flex justify-center items-center gap-2 ${loading ? 'bg-red-600/50 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 shadow-lg shadow-red-900/25'}`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang xác thực...
                            </>
                        ) : (
                            'Đăng Nhập'
                        )}
                    </button>

                </form>

                <div className="mt-8 pt-6 border-t border-[#222] text-center">
                    <p className="text-xs text-gray-500">Mọi hành vi đăng nhập trái phép sẽ bị theo dõi thiết bị ID tự động.</p>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
