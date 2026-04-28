/**
 * SVC Studio - API Client SDK (Zero Dependency)
 * 
 * Hướng dẫn tích hợp:
 * 1. Copy file này vào dự án Web/App của bạn.
 * 2. Khởi tạo client: const client = new SvcApiClient("http://your-svc-server:8000");
 * 3. Đăng nhập: await client.login("YOUR_USERNAME", "YOUR_PASSWORD");
 * 4. Gọi các hàm có sẵn để sử dụng AI (TTS, RVC, Voice Cloning).
 */

export class SvcApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/$/, ""); // Xóa dấu '/' ở cuối nếu có
    }

    /**
     * Gán token trực tiếp nếu bạn đã đăng nhập từ trước
     */
    public setToken(token: string) {
        this.token = token;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string> || {})
        };

        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        // Tự động thêm Content-Type JSON nếu có body mà không phải FormData
        if (options.body && typeof options.body === 'string') {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
            try {
                const errJson = await response.json();
                if (errJson.detail) errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
            } catch (e) { }
            throw new Error(errorMsg);
        }

        return response.json();
    }

    // =========================================================
    // 1. AUTHENTICATION & USER MANAGEMENT
    // =========================================================

    public async login(username: string, password: string): Promise<{ access_token: string, token_type: string }> {
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);

        const data = await this.request<{ access_token: string, token_type: string }>("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });
        this.setToken(data.access_token);
        return data;
    }

    public async checkMe(): Promise<any> {
        return this.request<any>("/api/auth/checkme");
    }

    public async getMe(): Promise<any> {
        return this.request<any>("/api/auth/me");
    }

    // [Admin] Users
    public async adminGetUsers(): Promise<any[]> {
        return this.request<any[]>("/api/admin/users");
    }

    public async adminToggleUserActive(userId: string): Promise<any> {
        return this.request<any>(`/api/admin/users/${userId}/toggle_active`, { method: "PUT" });
    }

    public async adminUpdateUserPermissions(userId: string, permissions: string): Promise<any> {
        return this.request<any>(`/api/admin/users/${userId}/permissions`, {
            method: "PUT",
            body: JSON.stringify({ permissions })
        });
    }

    public async adminDeleteUser(userId: string): Promise<any> {
        return this.request<any>(`/api/admin/users/${userId}`, { method: "DELETE" });
    }

    // =========================================================
    // 2. RVC AI COVER (VOICE CONVERSION)
    // =========================================================

    public async generateRvc(audioFile: File, modelId: string, pitch: number = 0, options: any = {}): Promise<{ job_id: string, message: string }> {
        const formData = new FormData();
        formData.append("audio_file", audioFile);
        formData.append("model_id", modelId);
        formData.append("pitch", pitch.toString());
        for (const [key, value] of Object.entries(options)) {
            formData.append(key, value as any);
        }
        return this.request<{ job_id: string, message: string }>("/api/generate", {
            method: "POST",
            body: formData as any
        });
    }

    public async getJobsHistory(): Promise<any[]> {
        return this.request<any[]>("/api/history");
    }

    public async getJobStatus(jobId: string): Promise<{ id: string, status: string, result_audio_url?: string }> {
        return this.request<any>(`/api/jobs/${jobId}`);
    }

    public async cancelJob(jobId: string): Promise<any> {
        return this.request<any>(`/api/jobs/${jobId}/cancel`, { method: "POST" });
    }

    public async deleteJob(jobId: string): Promise<any> {
        return this.request<any>(`/api/jobs?job_ids=${jobId}`, { method: "DELETE" });
    }

    public async recreateJob(jobId: string): Promise<any> {
        return this.request<any>(`/api/jobs/${jobId}/recreate`, { method: "POST" });
    }

    // RVC Models
    public async getModels(): Promise<any[]> {
        return this.request<any[]>("/api/models");
    }

    public async getPublicModels(): Promise<any[]> {
        return this.request<any[]>("/api/public-models");
    }

    public async deleteModel(modelId: string): Promise<any> {
        return this.request<any>(`/api/models/${modelId}`, { method: "DELETE" });
    }

    // =========================================================
    // 3. TTS SCRIPT MANAGEMENT (KỊCH BẢN)
    // =========================================================

    public async getTtsScripts(): Promise<any[]> {
        return this.request<any[]>("/api/tts/scripts");
    }

    public async createTtsScript(title: string, language: string = "Vietnamese", chunkLimit: number = 200): Promise<{ id: string, title: string }> {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("language", language);
        formData.append("chunk_limit", chunkLimit.toString());

        return this.request<any>("/api/tts/scripts", {
            method: "POST",
            body: formData as any
        });
    }

    public async updateTtsScript(scriptId: string, updates: any): Promise<any> {
        const formData = new FormData();
        if (updates.title !== undefined) formData.append("title", updates.title);
        if (updates.language !== undefined) formData.append("language", updates.language);
        if (updates.chunk_limit !== undefined) formData.append("chunk_limit", updates.chunk_limit.toString());

        return this.request<any>(`/api/tts/scripts/${scriptId}`, {
            method: "PUT",
            body: formData as any
        });
    }

    public async deleteTtsScript(scriptId: string): Promise<any> {
        return this.request<any>(`/api/tts/scripts/${scriptId}`, { method: "DELETE" });
    }

    public async analyzeMasterScript(text: string, language: string): Promise<any> {
        return this.request<any>("/api/tts/scripts/analyze-master", {
            method: "POST",
            body: JSON.stringify({ text, language })
        });
    }

    public async importMasterScript(scriptId: string, payload: { text: string, mode: string, character_voice_map: Record<string, string>, replace_missing_with_neutral: boolean }): Promise<any> {
        return this.request<any>(`/api/tts/scripts/${scriptId}/import-master`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    public async exportScriptZip(scriptId: string): Promise<Blob> {
        // Đặc biệt: API này trả về File Blob
        const url = `${this.baseUrl}/api/tts/scripts/${scriptId}/export-zip`;
        const headers: Record<string, string> = this.token ? { "Authorization": `Bearer ${this.token}` } : {};
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error("Failed to export ZIP");
        return response.blob();
    }

    public async mergeScript(scriptId: string): Promise<{ message: string, mp3_url: string, srt_url: string }> {
        return this.request<any>(`/api/tts/scripts/${scriptId}/merge`, { method: "POST" });
    }

    public async renderScript(scriptId: string): Promise<any> {
        return this.request<any>(`/api/tts/scripts/${scriptId}/render`, { method: "POST" });
    }

    public async cancelScriptRender(scriptId: string): Promise<any> {
        return this.request<any>(`/api/tts/scripts/${scriptId}/cancel`, { method: "POST" });
    }

    // =========================================================
    // 4. TTS SENTENCES (CÂU THOẠI TRONG KỊCH BẢN)
    // =========================================================

    public async getTtsSentences(scriptId: string): Promise<any[]> {
        return this.request<any[]>(`/api/tts/scripts/${scriptId}/sentences`);
    }

    public async createTtsSentence(scriptId: string, payload: any): Promise<any> {
        return this.request<any>(`/api/tts/scripts/${scriptId}/sentences`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    public async updateTtsSentence(sentenceId: string, payload: any): Promise<any> {
        return this.request<any>(`/api/tts/sentences/${sentenceId}`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });
    }

    public async deleteTtsSentence(sentenceId: string): Promise<any> {
        return this.request<any>(`/api/tts/sentences/${sentenceId}`, { method: "DELETE" });
    }

    public async renderTtsSentence(sentenceId: string): Promise<any> {
        return this.request<any>(`/api/tts/sentences/${sentenceId}/render`, { method: "POST" });
    }

    public async cancelTtsSentenceRender(sentenceId: string): Promise<any> {
        return this.request<any>(`/api/tts/sentences/${sentenceId}/cancel`, { method: "POST" });
    }

    // =========================================================
    // 5. TTS VOICES & SAMPLES (QUẢN LÝ GIỌNG ĐỌC)
    // =========================================================

    public async getTtsVoices(): Promise<any[]> {
        return this.request<any[]>("/api/tts/voices");
    }

    public async createTtsVoice(payload: any): Promise<any> {
        const formData = new FormData();
        formData.append("name", payload.name || "");
        if (payload.description) formData.append("description", payload.description);
        if (payload.language) formData.append("language", payload.language);
        if (payload.gender) formData.append("gender", payload.gender);
        formData.append("is_public", payload.is_public ? "true" : "false");
        if (payload.avatar) formData.append("avatar", payload.avatar);

        return this.request<any>("/api/tts/voices", {
            method: "POST",
            body: formData as any
        });
    }

    public async updateTtsVoice(voiceId: string, payload: any): Promise<any> {
        const formData = new FormData();
        if (payload.name !== undefined) formData.append("name", payload.name);
        if (payload.description !== undefined) formData.append("description", payload.description);
        if (payload.language !== undefined) formData.append("language", payload.language);
        if (payload.gender !== undefined) formData.append("gender", payload.gender);
        if (payload.is_public !== undefined) formData.append("is_public", payload.is_public ? "true" : "false");
        if (payload.avatar) formData.append("avatar", payload.avatar);

        return this.request<any>(`/api/tts/voices/${voiceId}`, {
            method: "PUT",
            body: formData as any
        });
    }

    public async toggleTtsVoiceActive(voiceId: string): Promise<any> {
        return this.request<any>(`/api/tts/voices/${voiceId}/toggle_active`, { method: "PUT" });
    }

    public async deleteTtsVoice(voiceId: string): Promise<any> {
        return this.request<any>(`/api/tts/voices/${voiceId}`, { method: "DELETE" });
    }

    public async createTtsVoiceSample(voiceId: string, payload: any): Promise<any> {
        const formData = new FormData();
        if (payload.file) formData.append("file", payload.file);
        if (payload.emotion !== undefined) formData.append("emotion", payload.emotion);
        if (payload.text_transcript !== undefined) formData.append("text_transcript", payload.text_transcript);
        if (payload.mode !== undefined) formData.append("mode", payload.mode);
        if (payload.control_instruction !== undefined) formData.append("control_instruction", payload.control_instruction);
        if (payload.auto_transcribe !== undefined) formData.append("auto_transcribe", payload.auto_transcribe ? "true" : "false");

        return this.request<any>(`/api/tts/voices/${voiceId}/samples`, {
            method: "POST",
            body: formData as any
        });
    }

    public async updateTtsVoiceSample(sampleId: string, payload: any): Promise<any> {
        const formData = new FormData();
        if (payload.emotion !== undefined) formData.append("emotion", payload.emotion);
        if (payload.text_transcript !== undefined) formData.append("text_transcript", payload.text_transcript);
        if (payload.mode !== undefined) formData.append("mode", payload.mode);
        if (payload.control_instruction !== undefined) formData.append("control_instruction", payload.control_instruction);

        return this.request<any>(`/api/tts/samples/${sampleId}`, {
            method: "PUT",
            body: formData as any
        });
    }

    public async toggleTtsVoiceSampleActive(sampleId: string): Promise<any> {
        return this.request<any>(`/api/tts/samples/${sampleId}/toggle_active`, { method: "PUT" });
    }

    public async deleteTtsVoiceSample(sampleId: string): Promise<any> {
        return this.request<any>(`/api/tts/samples/${sampleId}`, { method: "DELETE" });
    }

    // =========================================================
    // 6. UTILITIES
    // =========================================================

    public async getTtsLanguages(): Promise<any[]> {
        return this.request<any[]>("/api/tts/languages");
    }

    public async transcribeAudio(audioFile: File, language: string): Promise<any> {
        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("language", language);
        return this.request<any>("/api/tts/transcribe", {
            method: "POST",
            body: formData as any
        });
    }
}
