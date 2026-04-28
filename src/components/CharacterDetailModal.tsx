import React, { useState, useEffect, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Play, Upload, Save, Loader, Pause, Wand2, X, Mic, Volume2, Copy, Globe, Lock, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { api_tts } from '../services/api_tts';
import { authService, fetchWithAuth, API_URL } from '../services/authService';
import { GlobalAudioContext } from '../contexts/GlobalAudioContext';
import { TTS_SUPPORTED_LANGUAGES, cleanVoiceName, cleanVoiceDescription } from '../utils/system_presets';
import { resolveImageUrl } from '../utils/urlUtils';
import toast from 'react-hot-toast';

interface CharacterDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: any;
    reload: () => void;
}

export function CharacterDetailModal({ isOpen, onClose, character, reload }: CharacterDetailModalProps) {
    const context = useContext(GlobalAudioContext);
    const globalPlayer = context?.globalPlayer;
    const setGlobalPlayer = context?.setGlobalPlayer || (() => { });
    const userId = authService.getCurrentUserId();
    const username = localStorage.getItem('username');
    const currentRole = localStorage.getItem('svc_role') || 'user';
    const isOwner = character ? (currentRole === 'admin' || character.ownerID === userId || character.user_id === userId || character.user_id === username) : false;

    // Local state for character metadata
    const [editData, setEditData] = useState({
        name: character ? cleanVoiceName(character.name) : '',
        description: character ? cleanVoiceDescription(character.description || '') : '',
        language: character?.language || 'Vietnamese',
        is_public: character ? (!!character.isPublic || !!character.is_public) : false
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (character) {
            setEditData({
                name: cleanVoiceName(character.name),
                description: cleanVoiceDescription(character.description || ''),
                language: character.language || 'Vietnamese',
                is_public: !!character.isPublic || !!character.is_public
            });
        }
    }, [character]);

    const isDirty = character ? (
        editData.name !== cleanVoiceName(character.name) ||
        editData.description !== cleanVoiceDescription(character.description || '') ||
        editData.language !== (character.language || 'Vietnamese') ||
        editData.is_public !== (!!character.isPublic || !!character.is_public)
    ) : false;

    const handleSaveCharacter = async () => {
        if (!editData.name.trim()) return toast.error("Tên không được để trống");
        setIsSaving(true);
        try {
            const isLegacy = character.imageUrl !== undefined || character.exteriorUrl !== undefined || typeof character.id === 'number' || (typeof character.id === 'string' && !character.id.includes('-'));
            const oldName = character.name;

            if (isLegacy) {
                // Update Legacy Character
                const updatePayload = { name: editData.name, prompt: editData.description };
                await fetchWithAuth(`${API_URL}/veo3/character/${character.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload)
                });
                
                // Try to update counterpart TTS Voice
                try {
                    const ttsRes = await api_tts.getVoices();
                    const counterpart = ttsRes.data?.find((v: any) => cleanVoiceName(v.name).toLowerCase() === cleanVoiceName(oldName).toLowerCase());
                    if (counterpart) {
                        await api_tts.updateVoice(counterpart.id, editData.name, editData.description, editData.language, undefined, editData.is_public, avatarFile || undefined);
                    }
                } catch (e) { console.error("Failed to sync TTS Voice", e); }
            } else {
                // Update TTS Voice
                await api_tts.updateVoice(
                    character.id, editData.name, editData.description, editData.language, undefined, editData.is_public, avatarFile || undefined
                );

                // Try to update counterpart Legacy Character
                try {
                    const legacyRes = await fetchWithAuth(`${API_URL}/veo3/character`);
                    if (legacyRes.ok) {
                        const legacyChars = await legacyRes.json();
                        const counterpart = legacyChars.find((c: any) => cleanVoiceName(c.name).toLowerCase() === cleanVoiceName(oldName).toLowerCase());
                        if (counterpart) {
                            await fetchWithAuth(`${API_URL}/veo3/character/${counterpart.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: editData.name, prompt: editData.description })
                            });
                        }
                    }
                } catch (e) { console.error("Failed to sync Legacy Character", e); }
            }

            toast.success("Cập nhật nhân vật thành công!");
            setAvatarFile(null);
            reload();
        } catch (e) {
            toast.error("Lỗi khi cập nhật nhân vật");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCharacter = async () => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa nhân vật này không? Toàn bộ mẫu âm cũng sẽ bị xóa!")) return;
        setIsDeleting(true);
        try {
            const isLegacy = character.imageUrl !== undefined || character.exteriorUrl !== undefined || typeof character.id === 'number' || (typeof character.id === 'string' && !character.id.includes('-'));
            const oldName = character.name;

            if (isLegacy) {
                // Delete Legacy Character
                await fetchWithAuth(`${API_URL}/veo3/character/${character.id}`, { method: 'DELETE' });
                
                // Try to delete counterpart TTS Voice
                try {
                    const ttsRes = await api_tts.getVoices();
                    const counterpart = ttsRes.data?.find((v: any) => cleanVoiceName(v.name).toLowerCase() === cleanVoiceName(oldName).toLowerCase());
                    if (counterpart) await api_tts.deleteVoice(counterpart.id);
                } catch (e) { console.error("Failed to sync delete TTS Voice", e); }
            } else {
                // Delete TTS Voice
                await api_tts.deleteVoice(character.id);

                // Try to delete counterpart Legacy Character
                try {
                    const legacyRes = await fetchWithAuth(`${API_URL}/veo3/character`);
                    if (legacyRes.ok) {
                        const legacyChars = await legacyRes.json();
                        const counterpart = legacyChars.find((c: any) => cleanVoiceName(c.name).toLowerCase() === cleanVoiceName(oldName).toLowerCase());
                        if (counterpart) await fetchWithAuth(`${API_URL}/veo3/character/${counterpart.id}`, { method: 'DELETE' });
                    }
                } catch (e) { console.error("Failed to sync delete Legacy Character", e); }
            }

            toast.success("Đã xóa nhân vật");
            onClose();
            reload();
        } catch (e) {
            toast.error("Lỗi khi xóa nhân vật");
        } finally {
            setIsDeleting(false);
        }
    };

    // Upload state
    const [file, setFile] = useState<File | null>(null);
    const [emotion, setEmotion] = useState('NEUTRAL');
    const [transcript, setTranscript] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [transMode, setTransMode] = useState<'manual' | 'auto'>('auto');
    const [uploadMode, setUploadMode] = useState<'ultimate' | 'controllable' | 'design'>('ultimate');
    const [controlInstruction, setControlInstruction] = useState('');

    const handleUpload = async () => {
        if (uploadMode !== 'design' && !file) return toast.error("Vui lòng chọn file audio mẫu!");
        const autoTranscribe = transMode === 'auto';
        if (uploadMode === 'ultimate' && !autoTranscribe && !transcript.trim()) return toast.error("Bắt buộc phải nhập văn bản mẫu!");

        setIsUploading(true);
        try {
            await api_tts.addVoiceSample(character.id, uploadMode === 'design' ? null : file, emotion, transcript, uploadMode, controlInstruction, autoTranscribe);
            setFile(null);
            setEmotion("NEUTRAL");
            setTranscript("");
            toast.success("Thêm mẫu âm thành công!");
            reload();
        } catch (e) {
            toast.error("Lỗi khi tải mẫu");
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen || !character) return null;

    const getDisplayUrl = () => {
        if (character.imageUrl || character.exteriorUrl) {
            return resolveImageUrl(character.imageUrl || character.exteriorUrl);
        }
        if (character.avatar_path) {
            if (character.avatar_path.startsWith('http')) return character.avatar_path;
            return `${import.meta.env.VITE_SVC_API_URL}/api/tts_static/${character.avatar_path}`;
        }
        return '';
    };
    const displayUrl = getDisplayUrl();

    return (
        <AnimatePresence>
            <div 
                className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-[#161B2E] border border-white/10 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Left Side: Avatar & Basic Info */}
                    <div className="w-full md:w-[40%] bg-black/20 p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto">
                        <div className="relative group w-full mb-6">
                            <div className="w-full max-h-[350px] rounded-2xl overflow-hidden border-2 border-indigo-500/30 shadow-2xl bg-slate-800 flex items-center justify-center relative">
                                {avatarPreview || displayUrl ? (
                                    <img 
                                        src={avatarPreview || displayUrl!} 
                                        alt={character.name} 
                                        className="max-w-full max-h-[350px] object-contain" 
                                        style={{ imageRendering: '-webkit-optimize-contrast' }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-5xl font-black text-indigo-400 bg-indigo-500/10 tracking-tighter">
                                        {editData.name.charAt(0)}
                                    </div>
                                )}
                                
                                {isOwner && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 border border-white/20 transition-all"
                                        >
                                            <Upload className="w-4 h-4" /> Thay ảnh
                                        </button>
                                    </div>
                                )}
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setAvatarFile(file);
                                        setAvatarPreview(URL.createObjectURL(file));
                                    }
                                }}
                            />
                        </div>

                        <div className="w-full space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tên Nhân Vật</label>
                                <input
                                    value={editData.name}
                                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Tên nhân vật..."
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Mô tả</label>
                                <textarea
                                    value={editData.description}
                                    onChange={e => setEditData({ ...editData, description: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all resize-none h-24"
                                    placeholder="Mô tả tính cách, giọng điệu..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Ngôn ngữ</label>
                                    <select
                                        value={editData.language}
                                        onChange={e => setEditData({ ...editData, language: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 outline-none"
                                    >
                                        {TTS_SUPPORTED_LANGUAGES.map(lang => (
                                            <option key={lang.value} value={lang.value} className="bg-slate-900">{lang.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Quyền hạn</label>
                                    <button
                                        onClick={() => setEditData({ ...editData, is_public: !editData.is_public })}
                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${editData.is_public ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-700/20 text-slate-400 border-white/10'}`}
                                    >
                                        {editData.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                        {editData.is_public ? 'Public' : 'Private'}
                                    </button>
                                </div>
                            </div>

                            {(isDirty || avatarFile) && (
                                <button
                                    onClick={handleSaveCharacter}
                                    disabled={isSaving}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-xs tracking-tight disabled:opacity-50"
                                >
                                    {isSaving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    LƯU THÔNG TIN
                                </button>
                            )}

                            {isOwner && (
                                <button
                                    onClick={handleDeleteCharacter}
                                    disabled={isDeleting}
                                    className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold mt-3 disabled:opacity-50"
                                >
                                    {isDeleting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    XÓA NHÂN VẬT
                                </button>
                            )}
                        </div>

                    </div>

                    {/* Right Side: Samples & Upload */}
                    <div className="flex-1 p-6 flex flex-col min-h-0 bg-[#0F1423]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-vietnam font-medium text-white flex items-center gap-2 tracking-wide">
                                <Mic className="w-5 h-5 text-indigo-400" /> CÁC TÔNG CẢM XÚC
                            </h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-6">
                            {!(character.samples || character.voiceSamples) || (character.samples || character.voiceSamples).length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-slate-600">
                                    <Volume2 className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-sm italic">Chưa có mẫu âm thanh nào</p>
                                </div>
                            ) : (
                                (character.samples || character.voiceSamples).map((sample: any) => (
                                    <div key={sample.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 group hover:bg-white/[0.07] transition-all">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                                                    {sample.emotion}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{sample.mode}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {(sample.audioPath || sample.audio_path) ? (
                                                    (() => {
                                                        const isBoolTrue = sample.audioPath === true || sample.audio_path === true;
                                                        let baseAudioUrl = '';
                                                        let downloadAudioUrl = '';
                                                        
                                                        if (isBoolTrue) {
                                                            const token = localStorage.getItem('svc_access_token') || localStorage.getItem('access_token');
                                                            baseAudioUrl = `${import.meta.env.VITE_SVC_API_URL}/api/tts/stream?sample_id=${sample.id}&token=${token}`;
                                                            downloadAudioUrl = `${import.meta.env.VITE_SVC_API_URL}/api/tts/stream?sample_id=${sample.id}&download=true&token=${token}`;
                                                        } else {
                                                            baseAudioUrl = resolveImageUrl(sample.audioPath || sample.audio_path);
                                                            downloadAudioUrl = baseAudioUrl;
                                                        }
                                                        
                                                        return (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        const url = isBoolTrue ? baseAudioUrl : `${baseAudioUrl}?ts=${Date.now()}`;
                                                                        if (globalPlayer?.url === url) setGlobalPlayer(null);
                                                                        else setGlobalPlayer({ url, title: `${character.name} - ${sample.emotion}`, id: sample.id });
                                                                    }}
                                                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${globalPlayer?.id === sample.id ? 'bg-rose-500 text-white' : 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white'}`}
                                                                >
                                                                    {globalPlayer?.id === sample.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (isBoolTrue) {
                                                                            window.location.href = downloadAudioUrl;
                                                                        } else {
                                                                            const link = document.createElement('a');
                                                                            link.href = downloadAudioUrl;
                                                                            link.download = `${character.name}_${sample.emotion}.mp3`;
                                                                            document.body.appendChild(link);
                                                                            link.click();
                                                                            document.body.removeChild(link);
                                                                        }
                                                                    }}
                                                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                                                                    title="Tải về"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className="text-[10px] text-slate-500 italic px-2">No Preview</span>
                                                )}
                                                {isOwner && (
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm("Bạn có chắc chắn muốn xóa mẫu âm này không?")) {
                                                                await api_tts.deleteSample(sample.id);
                                                                toast.success("Đã xóa mẫu âm");
                                                                reload();
                                                            }
                                                        }}
                                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {sample.textTranscript && (
                                            <div className="relative group/text">
                                                <p className="text-xs text-slate-400 italic line-clamp-2 leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5">
                                                    "{sample.textTranscript}"
                                                </p>
                                                <button
                                                    onClick={() => { navigator.clipboard.writeText(sample.textTranscript); toast.success("Copied!"); }}
                                                    className="absolute top-1 right-1 p-1 bg-white/10 rounded opacity-0 group-hover/text:opacity-100 transition-opacity"
                                                >
                                                    <Copy className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Upload Form */}
                        {isOwner && (
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-vietnam font-semibold text-slate-400 uppercase tracking-widest">
                                        Upload Mẫu Âm Thanh Mới
                                    </span>
                                    <div className="flex bg-white/5 p-1 rounded-lg">
                                        {(['ultimate', 'controllable', 'design'] as const).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setUploadMode(m)}
                                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all capitalize ${uploadMode === m ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="text-[10px] text-slate-500 font-bold mb-1 block">Cảm Xúc</label>
                                        <input
                                            list="emotion-suggestions-modal"
                                            value={emotion}
                                            onChange={e => setEmotion(e.target.value.toUpperCase())}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                            placeholder="Ví dụ : Angry, Sad ..."
                                        />
                                        <datalist id="emotion-suggestions-modal">
                                            <option value="Neutral" />
                                            <option value="Hesitant" />
                                            <option value="Angry" />
                                            <option value="Confused" />
                                            <option value="Sad" />
                                            <option value="Happy" />
                                            <option value="Whisper" />
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold mb-1 block">Âm Thanh (.mp3/.wav)</label>
                                        <input
                                            type="file"
                                            accept=".mp3,.wav"
                                            onChange={e => setFile(e.target.files?.[0] || null)}
                                            className="w-full text-[10px] text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:bg-indigo-600/20 file:text-indigo-400 hover:file:bg-indigo-600/30 file:cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {uploadMode === 'ultimate' && (
                                    <div className="space-y-3">
                                        <div className="flex bg-white/5 p-1 rounded-xl">
                                            <button onClick={() => setTransMode('manual')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${transMode === 'manual' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Nhập Thủ Công</button>
                                            <button onClick={() => setTransMode('auto')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${transMode === 'auto' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>
                                                <Wand2 className="w-3 h-3" /> Tự Động Lấy Text
                                            </button>
                                        </div>
                                        {transMode === 'manual' && (
                                            <textarea
                                                value={transcript}
                                                onChange={e => setTranscript(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs h-16 focus:border-indigo-500 outline-none resize-none"
                                                placeholder="Nhập nội dung của đoạn audio..."
                                            />
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleUpload}
                                    disabled={isUploading || (!file && uploadMode !== 'design')}
                                    className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs tracking-tight uppercase"
                                >
                                    {isUploading ? (
                                        <><Loader className="w-4 h-4 animate-spin" /> Đang xử lí ...</>
                                    ) : (
                                        <><Upload className="w-4 h-4" /> Tải lên mẫu âm</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
