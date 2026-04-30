import { SvcApiClient } from '../../SvcApiClient';

// Sử dụng trực tiếp base URL bản Online mà người dùng cung cấp (đã bỏ /api vì SvcApiClient tự thêm /api/...)
export const baseUrl = import.meta.env.VITE_SVC_API_URL;

const svcClient = new SvcApiClient(baseUrl);

// Wrapper để tự động lấy token mới nhất từ localStorage trước mỗi request
const getClientAsync = async () => {
    let token = localStorage.getItem('svc_access_token');

    // Nếu chưa có token riêng cho SVC, tự động login bằng tài khoản đã lưu
    if (!token) {
        const username = localStorage.getItem('username');
        const password = localStorage.getItem('saved_password');

        const computerId = localStorage.getItem('computerId') || 'unknown'; // Dù không lưu chuẩn, authService thường có. Nếu không thì báo trống. Hoặc lấy trực tiếp giống auth

        if (username && password) {
            try {
                // SvcApiClient.login dùng form urlencoded và thiếu computerId nên ta phải fetch thủ công
                const svcRes = await fetch(`${baseUrl}/api/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ username, password, computerId })
                });

                if (svcRes.ok) {
                    const svcData = await svcRes.json();
                    if (svcData && svcData.access_token) {
                        token = svcData.access_token;
                        localStorage.setItem('svc_access_token', token as string);
                    }
                }
            } catch (err) {
                console.error("SvcApiClient auto-login failed:", err);
            }
        }

        // Fallback: Nếu vẫn chưa có token (do auto-login xịt hoặc chưa có pass), thử dùng token của dashboard
        if (!token) {
            token = localStorage.getItem('access_token');
        }
    }

    if (token) {
        svcClient.setToken(token);
    }
    return svcClient;
};

// Adapter mapping các hàm cũ sang SvcApiClient, giữ nguyên cấu trúc trả về { data: ... }
export const api_tts = {
    // Projects
    getProjects: async () => {
        const token = localStorage.getItem('svc_access_token') || localStorage.getItem('access_token');
        const res = await fetch(`${baseUrl}/api/tts/projects`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.json();
    },
    createProject: async (name: string) => {
        const token = localStorage.getItem('svc_access_token') || localStorage.getItem('access_token');
        const formData = new FormData();
        formData.append('name', name);
        const res = await fetch(`${baseUrl}/api/tts/projects`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        return res.json();
    },

    // Voices
    getVoices: async () => {
        const client = await getClientAsync();
        const data = await client.getTtsVoices();
        return { data };
    },
    checkHealth: async () => {
        const client = await getClientAsync();
        return client.checkMe().then(data => ({ data }));
    },
    createVoice: async (name: string, description?: string, language: string = "Japanese", gender: string = "unknown", is_public: boolean = false, avatar?: File | null) => {
        const payload = { name, description, language, gender, is_public, avatar };
        const client = await getClientAsync();
        return client.createTtsVoice(payload).then(data => ({ data }));
    },
    updateVoice: async (voiceId: string, name: string, description?: string, language: string = "Japanese", gender?: string, is_public?: boolean, avatar?: File | null) => {
        const payload = { name, description, language, gender, is_public, avatar };
        const client = await getClientAsync();
        return client.updateTtsVoice(voiceId, payload).then(data => ({ data }));
    },
    deleteVoice: async (voiceId: string) => {
        const client = await getClientAsync();
        return client.deleteTtsVoice(voiceId).then(data => ({ data }));
    },
    deleteSample: async (sampleId: string) => {
        const client = await getClientAsync();
        return client.deleteTtsVoiceSample(sampleId).then(data => ({ data }));
    },
    toggleVoiceActive: async (voiceId: string) => {
        const client = await getClientAsync();
        return client.toggleTtsVoiceActive(voiceId).then(data => ({ data }));
    },

    // Voice Samples
    addVoiceSample: async (voiceId: string, file: File | null, emotion: string, text_transcript: string, mode: string = "ultimate", control_instruction: string = "", auto_transcribe: boolean = false) => {
        const payload = { file, emotion, text_transcript, mode, control_instruction, auto_transcribe };
        const client = await getClientAsync();
        return client.createTtsVoiceSample(voiceId, payload).then(data => ({ data }));
    },

    deleteVoiceSample: async (sampleId: string) => {
        const client = await getClientAsync();
        return client.deleteTtsVoiceSample(sampleId).then(data => ({ data }));
    },
    toggleSampleActive: async (sampleId: string) => {
        const client = await getClientAsync();
        return client.toggleTtsVoiceSampleActive(sampleId).then(data => ({ data }));
    },
    updateVoiceSample: async (sampleId: string, emotion: string, text_transcript: string, mode: string = "ultimate", control_instruction: string = "") => {
        const payload = { emotion, text_transcript, mode, control_instruction };
        const client = await getClientAsync();
        return client.updateTtsVoiceSample(sampleId, payload).then(data => ({ data }));
    },

    // Whisper
    transcribeAudio: async (file: File) => {
        const client = await getClientAsync();
        return client.transcribeAudio(file, "vi").then(data => ({ data }));
    },

    // Scripts
    getScripts: async (projectId?: string) => {
        const token = localStorage.getItem('svc_access_token') || localStorage.getItem('access_token');
        const url = projectId ? `${baseUrl}/api/tts/scripts?project_id=${projectId}` : `${baseUrl}/api/tts/scripts`;
        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return { data: await res.json() };
    },
    createScript: async (title: string, language: string = "Japanese", chunkLimit: number = 200, projectId?: string) => {
        const token = localStorage.getItem('svc_access_token') || localStorage.getItem('access_token');
        const formData = new FormData();
        formData.append('title', title);
        formData.append('language', language);
        formData.append('chunk_limit', chunkLimit.toString());
        if (projectId) {
            formData.append('project_id', projectId);
        }
        
        const res = await fetch(`${baseUrl}/api/tts/scripts`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        return { data };
    },
    updateScript: async (scriptId: string, title?: string, language?: string, chunkLimit?: number, projectId?: string) => {
        const token = localStorage.getItem('svc_access_token') || localStorage.getItem('access_token');
        const formData = new FormData();
        if (title !== undefined) formData.append('title', title);
        if (language !== undefined) formData.append('language', language);
        if (chunkLimit !== undefined) formData.append('chunk_limit', chunkLimit.toString());
        if (projectId !== undefined) formData.append('project_id', projectId);

        const res = await fetch(`${baseUrl}/api/tts/scripts/${scriptId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        return { data };
    },
    deleteScript: async (scriptId: string) => {
        const client = await getClientAsync();
        return client.deleteTtsScript(scriptId).then(data => ({ data }));
    },

    // Sentences
    getSentences: async (scriptId: string) => {
        const client = await getClientAsync();
        return client.getTtsSentences(scriptId).then(data => ({ data }));
    },
    addSentence: async (scriptId: string, text: string, voiceId?: string, emotion?: string, mode?: string, control_instruction?: string, speed: number = 1.0, pitch: number = 1.0, orderIndex: number = 0, characterName?: string) => {
        const formData = new FormData();
        formData.append('text', text);
        if (voiceId) formData.append('voice_id', voiceId);
        if (emotion) formData.append('emotion', emotion);
        if (mode) formData.append('mode', mode);
        if (control_instruction) formData.append('control_instruction', control_instruction);
        formData.append('speed', speed.toString());
        formData.append('pitch', pitch.toString());
        formData.append('order_index', orderIndex.toString());
        if (characterName) formData.append('character_name', characterName);

        const token = localStorage.getItem('svc_access_token') || localStorage.getItem('access_token');
        const response = await fetch(`${baseUrl}/api/tts/scripts/${scriptId}/sentences`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return { data };
    },
    updateSentence: async (sentenceId: string, payload: { text?: string, voice_id?: string, emotion?: string, mode?: string, control_instruction?: string, speed?: number, pitch?: number, order_index?: number }) => {
        const client = await getClientAsync();
        return client.updateTtsSentence(sentenceId, payload).then(data => ({ data }));
    },
    deleteSentence: async (sentenceId: string) => {
        const client = await getClientAsync();
        return client.deleteTtsSentence(sentenceId).then(data => ({ data }));
    },
    renderSentence: async (sentenceId: string) => {
        const client = await getClientAsync();
        return client.renderTtsSentence(sentenceId).then(data => ({ data }));
    },
    cancelSentence: async (sentenceId: string) => {
        const client = await getClientAsync();
        return client.cancelTtsSentenceRender(sentenceId).then(data => ({ data }));
    },

    // Master Script Wizard
    analyzeMasterScript: async (text: string, mode: string = "Dialogue") => {
        const client = await getClientAsync();
        return client.analyzeMasterScript(text, "vi").then(data => ({ data }));
    },
    importMasterScript: async (scriptId: string, payload: { text: string, character_voice_map: any, replace_missing_with_neutral: boolean, mode: string }) => {
        const client = await getClientAsync();
        return client.importMasterScript(scriptId, payload).then(data => ({ data }));
    },

    // Concat Audio & SRT
    mergeSentences: async (scriptId: string, payload: { sentence_ids: string[], gap_min: number, gap_max: number }) => {
        const client = await getClientAsync();
        return client.mergeScript(scriptId).then(data => ({ data }));
    },

    // Get Streaming URL for Audio
    getStreamUrl: (sentenceId: string) => {
        const token = localStorage.getItem('svc_access_token') || localStorage.getItem('access_token');
        return `${baseUrl}/api/tts/stream?sentence_id=${sentenceId}${token ? `&token=${token}` : ''}`;
    }
};
