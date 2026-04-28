import React, { useState, useEffect, useContext, useRef } from 'react';
import { VoiceCard } from '../components/VoiceCard';
import { GlobalAudioContext } from '../contexts/GlobalAudioContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Mic, Play, FileText, ChevronLeft, Save, Copy, Loader2, Music, Check, ArrowRight, Volume2, X, Square, StopCircle, RefreshCw, Cpu, FileAudio, FileWarning, Pencil, Download, Archive, Wand2, Link, Pause, SkipForward, SkipBack, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { api_tts, baseUrl } from '../services/api_tts';
import { TTS_SUPPORTED_LANGUAGES, cleanVoiceName } from '../utils/system_presets';
import toast from 'react-hot-toast';
import { ChevronDown } from 'lucide-react';

function SearchableVoiceSelect({ voices, value, onChange, disabled, playVoiceDemo, className, defaultText = "Chưa gắn", globalPlayerId }: { voices: any[], value: string, onChange: (val: string) => void, disabled?: boolean, playVoiceDemo: (v: any) => void, className?: string, defaultText?: string, globalPlayerId?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredVoices = voices.filter((v: any) => cleanVoiceName(v.name).toLowerCase().includes(search.toLowerCase()));
    const selectedVoice = voices.find((v: any) => v.id == value);

    const baseClass = className || "bg-transparent focus:outline-none w-28 truncate text-slate-200 font-medium";

    return (
        <div ref={wrapperRef} className={`relative text-xs ${isOpen ? 'z-[60]' : 'z-auto'}`}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center justify-between cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${baseClass}`}
            >
                <span className="truncate flex-1">{selectedVoice ? cleanVoiceName(selectedVoice.name) : defaultText}</span>
                <ChevronDown className="w-3 h-3 opacity-50 shrink-0 ml-0.5" />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-50 mt-1 w-[280px] -ml-[20px] bg-slate-800 border border-slate-600 rounded-lg shadow-2xl flex flex-col overflow-hidden max-h-64">
                        <div className="p-2 border-b border-slate-700 shrink-0">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Tìm kiếm giọng đọc..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded p-1.5 focus:border-indigo-500 outline-none text-white text-xs"
                            />
                        </div>
                        <div className="overflow-y-auto flex-1">
                            <div
                                onClick={() => { onChange(''); setIsOpen(false); }}
                                className="p-2 hover:bg-slate-700 cursor-pointer text-slate-400 border-b border-slate-700/50"
                            >
                                -- {defaultText} --
                            </div>
                            {filteredVoices.map((v: any) => {
                                const isPlaying = globalPlayerId === v.id || (v.samples?.length > 0 && globalPlayerId === v.samples[0].id);
                                return (
                                    <div key={v.id} className="flex items-center justify-between p-2 hover:bg-slate-700 border-b border-slate-700/30 group">
                                        <div
                                            className="flex-1 cursor-pointer truncate mr-2"
                                            onClick={() => { onChange(v.id); setIsOpen(false); }}
                                            title={cleanVoiceName(v.name)}
                                        >
                                            <span className={v.id === value ? 'text-indigo-400 font-bold' : 'text-slate-200'}>
                                                {cleanVoiceName(v.name)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); playVoiceDemo(v); }}
                                            className={`p-1 rounded-full text-white transition-colors ${isPlaying ? 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500'}`}
                                            title={isPlaying ? "Dừng Phát" : "Nghe Demo"}
                                        >
                                            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                                        </button>
                                    </div>
                                );
                            })}
                            {filteredVoices.length === 0 && <div className="p-3 text-slate-500 text-center text-xs">Không tìm thấy voice nào.</div>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


        </div>
    )
}

const MAX_TTS_LENGTH = parseInt(import.meta.env.VITE_MAX_TTS_LENGTH || '5000', 10);
const TTS_CHUNK_LIMIT = parseInt(import.meta.env.VITE_TTS_CHUNK_LIMIT || '200', 10);

const splitTextSmart = (text: string, maxLength: number): string[] => {
    if (!text) return [];

    // Loại bỏ các ký tự không dùng để đọc (như * và |) và chuẩn hóa \r\n thành \n
    let normalizedText = text.replace(/[*|]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let chunks: string[] = [];

    // Đã bỏ '\n' ra khỏi hardPuncs để giữ ngữ cảnh TTS
    const hardPuncs = ['。', '！', '？', '.', '!', '?', '；', ';'];
    const softPuncs = ['，', '、', ',', '：', ':'];
    const closingPairs = ['"', '”', "'", '’', ')', ']', '}', '»', '›'];

    const processChunk = (chunk: string) => {
        chunk = chunk.trim();
        if (!chunk) return;

        let chunkLength = chunk.length;
        if (chunkLength <= maxLength) {
            chunks.push(chunk);
            return;
        }

        let bestBreak = -1;
        let scanLimit = Math.min(maxLength - 1, chunkLength - 1);

        // Hàm kiểm tra các dấu đóng ngoặc/nháy liền kề sau điểm ngắt
        const getValidJump = (index: number) => {
            let jump = 0;
            while (index + jump + 1 < chunkLength && closingPairs.includes(chunk[index + jump + 1])) {
                jump++;
            }
            // Đảm bảo sau khi cộng thêm các dấu ngoặc/nháy, chiều dài tổng (index + jump + 1) không vượt maxLength
            if (index + jump + 1 <= maxLength) {
                return jump;
            }
            return -1; // Vượt quá thì không thể dùng điểm ngắt này
        };

        for (let i = scanLimit; i >= 0; i--) {
            if (hardPuncs.includes(chunk[i])) {
                const jump = getValidJump(i);
                if (jump !== -1) {
                    bestBreak = i + jump;
                    break;
                }
            }
        }

        if (bestBreak === -1) {
            for (let i = scanLimit; i >= 0; i--) {
                if (softPuncs.includes(chunk[i])) {
                    const jump = getValidJump(i);
                    if (jump !== -1) {
                        bestBreak = i + jump;
                        break;
                    }
                }
            }
        }

        if (bestBreak === -1) {
            for (let i = scanLimit; i >= 0; i--) {
                if (chunk[i] === ' ') {
                    const jump = getValidJump(i);
                    if (jump !== -1) {
                        bestBreak = i + jump;
                        break;
                    }
                }
            }
        }

        if (bestBreak === -1) bestBreak = scanLimit; // cut hard

        const firstPart = chunk.substring(0, bestBreak + 1).trim();
        const secondPart = chunk.substring(bestBreak + 1).trim();

        if (firstPart) chunks.push(firstPart);
        if (secondPart) processChunk(secondPart);
    }

    processChunk(normalizedText);
    return chunks;
}

/**
 * Phân tách kịch bản master thành các chunk nhân vật + lời thoại
 * Dựa trên regex tương đồng với Backend: Nhân vật:「Thoại」hoặc (Thầm)
 */
const parseScriptToSentences = (text: string) => {
    const pattern = /([^:\n]{1,30}?)\s*:\s*(「.*?」|\[.*?\]|\(.*?\)|（.*?）)/gs;
    const chunks: { character: string, text: string, base_emotion: string }[] = [];

    let lastEnd = 0;
    let match;

    const addNarratorChunk = (rawText: string) => {
        const t = rawText.trim();
        if (t) {
            chunks.push({ character: "Người kể chuyện", text: t, base_emotion: "NEUTRAL" });
        }
    };

    while ((match = pattern.exec(text)) !== null) {
        // Lấy đoạn dẫn (narrator) trước khi có thoại nhân vật
        addNarratorChunk(text.substring(lastEnd, match.index));

        const charName = match[1].trim();
        const bracketContent = match[2];
        let bEmo = "NEUTRAL";

        if (bracketContent.startsWith('(') || bracketContent.startsWith('（')) {
            bEmo = "WHISPER";
        }

        const innerText = bracketContent.substring(1, bracketContent.length - 1).trim();
        chunks.push({ character: charName, text: innerText, base_emotion: bEmo });
        lastEnd = pattern.lastIndex;
    }

    addNarratorChunk(text.substring(lastEnd));
    return chunks;
};

/**
 * Xử lý tác vụ theo nhóm (Chunking) để tránh spam request / timeout
 */
async function processInChunks<T>(
    items: T[],
    batchSize: number,
    task: (item: T) => Promise<any>,
    onProgress?: (current: number, total: number) => void
) {
    const total = items.length;
    const results = [];

    for (let i = 0; i < total; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);
        if (onProgress) onProgress(i + chunk.length, total);

        // Chạy song song trong nội bộ chunk để tối ưu tốc độ, nhưng giới hạn số lượng request đồng thời
        const chunkResults = await Promise.all(chunk.map(item => task(item)));
        results.push(...chunkResults);
    }

    return results;
}

export function TTSScriptsPage() {
    const context = useContext(GlobalAudioContext);
    const globalPlayer = context?.globalPlayer;
    const setGlobalPlayer = context?.setGlobalPlayer || (() => {});
    const userId = authService.getCurrentUserId();
    const [scripts, setScripts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'info' | 'success';
        hideCancel?: boolean;
    }>({ show: false, title: '', message: '', onConfirm: () => { } });

    const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' | 'success' = 'info') => {
        setConfirmDialog({ show: true, title, message, onConfirm, type });
    };

    // Modal states
    const [showAddScript, setShowAddScript] = useState(false);
    const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
    const [newScriptTitle, setNewScriptTitle] = useState('');
    const [newScriptLanguage, setNewScriptLanguage] = useState('Vietnamese');
    const [newScriptChunkLimit, setNewScriptChunkLimit] = useState(TTS_CHUNK_LIMIT);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLanguage, setFilterLanguage] = useState('All');
    const [filterOwner, setFilterOwner] = useState('');

    // Editor State
    const [selectedScript, setSelectedScript] = useState<any>(null);

    const loadScripts = async () => {
        try {
            const res = await api_tts.getScripts();
            setScripts(res.data);
        } catch (error) {
            toast.error("Lỗi khi tải danh sách Kịch bản");
        } finally {
            setIsLoading(false);
        }
    };

    const currentRole = localStorage.getItem('svc_role') || 'user';
    const [adminUsersList, setAdminUsersList] = useState<any[]>([]);

    useEffect(() => {
        if (userId && !selectedScript) loadScripts();
        if (currentRole === 'admin') {
            // api.adminGetUsers().then(users => setAdminUsersList(users)).catch(() => { });
        }
    }, [userId, selectedScript, currentRole]);

    const handleSaveScript = async () => {
        if (!newScriptTitle.trim()) return toast.error("Vui lòng nhập tên kịch bản");
        setIsActionLoading(true);
        const loadToast = toast.loading(editingScriptId ? "Đang cập nhật..." : "Đang tạo kịch bản...");
        try {
            if (editingScriptId) {
                const res = await api_tts.updateScript(editingScriptId, newScriptTitle.trim(), newScriptLanguage, newScriptChunkLimit);
                toast.success("Cập nhật thành công!", { id: loadToast });
                setScripts(scripts.map(s => s.id === editingScriptId ? res.data : s));
                setShowAddScript(false);
                setEditingScriptId(null);
                setNewScriptTitle('');
                setNewScriptLanguage('Vietnamese');
                setNewScriptChunkLimit(TTS_CHUNK_LIMIT);
            } else {
                const res = await api_tts.createScript(newScriptTitle.trim(), newScriptLanguage, newScriptChunkLimit);
                toast.success("Tạo thành công!", { id: loadToast });
                setScripts([res.data, ...scripts]);
                setSelectedScript(res.data);
                setShowAddScript(false);
                setNewScriptTitle('');
                setNewScriptLanguage('Vietnamese');
                setNewScriptChunkLimit(TTS_CHUNK_LIMIT);
            }
        } catch (e: any) {
            toast.error("Lỗi: " + (e.response?.data?.detail || e.message), { id: loadToast });
        } finally {
            setIsActionLoading(false);
        }
    }

    const handleDeleteScript = async () => {
        if (!deleteConfirmId) return;
        setIsActionLoading(true);
        const loadToast = toast.loading("Đang xóa kịch bản...");
        try {
            await api_tts.deleteScript(deleteConfirmId);
            toast.success("Đã xóa kịch bản thành công!", { id: loadToast });
            setScripts(scripts.filter(s => s.id !== deleteConfirmId));
            setDeleteConfirmId(null);
        } catch (e: any) {
            toast.error("Lỗi khi xóa: " + (e.response?.data?.detail || e.message), { id: loadToast });
        } finally {
            setIsActionLoading(false);
        }
    }

    if (selectedScript) {
        return <ScriptEditor script={selectedScript} onBack={() => setSelectedScript(null)} setConfirmDialog={setConfirmDialog} />;
    }

    const filteredScripts = scripts.filter(sc => {
        const matchSearch = sc.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchLang = filterLanguage === 'All' || sc.language === filterLanguage;
        const matchOwner = filterOwner === '' || (sc.user_id && sc.user_id.toString().toLowerCase().includes(filterOwner.toLowerCase()));
        return matchSearch && matchLang && matchOwner;
    });

    return (
        <div className="space-y-6 flex flex-col h-full overflow-hidden p-6 md:p-8">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter mb-1 uppercase">QUẢN LÝ KỊCH BẢN</h2>
                        <p className="text-sm text-slate-400">Danh sách các Script điều hướng sinh audio TTS hàng loạt.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => { toast("Đang tải dữ liệu..."); loadScripts() }} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-bold transition-all shadow-lg border border-slate-700" title="Tải lại danh sách để theo dõi tiến độ Render của kịch bản">
                        <RefreshCw className="w-4 h-4" /> Tải Lại
                    </button>
                    <button
                        onClick={() => { setEditingScriptId(null); setNewScriptTitle(''); setNewScriptLanguage('Vietnamese'); setShowAddScript(true); }}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg"
                    >
                        <Plus className="w-4 h-4" /> Tạo Kịch Bản
                    </button>
                </div>
            </div>

            <div className="flex gap-4 items-center shrink-0">
                <input
                    type="text"
                    placeholder="Tìm kiếm kịch bản..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <select
                    className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500"
                    value={filterLanguage}
                    onChange={e => setFilterLanguage(e.target.value)}
                >
                    <option value="All" className="bg-slate-800">Ngôn ngữ: Tất cả</option>
                    {TTS_SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.value} value={lang.value} className="bg-slate-800">{lang.name}</option>
                    ))}
                </select>
                {currentRole === 'admin' && (
                    <select
                        className="w-48 bg-purple-900/10 border border-purple-500/20 rounded-xl p-3 text-purple-200 focus:border-emerald-500"
                        value={filterOwner}
                        onChange={e => setFilterOwner(e.target.value)}
                    >
                        <option value="" className="bg-slate-800 text-purple-200">[Admin] Lọc UID...</option>
                        {adminUsersList.map(u => (
                            <option key={u.id} value={u.id} className="bg-slate-800 text-purple-200">{u.username}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-white/5 border border-white/5 rounded-2xl p-4">
                {isLoading ? (
                    <div className="flex justify-center p-12 text-slate-500 animate-pulse font-bold tracking-widest">Đang tải...</div>
                ) : (
                    <div className="flex flex-col gap-3 pb-20">
                        {filteredScripts.map(sc => (
                            <div key={sc.id} className="flex flex-col gap-2 glass-card p-4 hover:bg-white/10 transition-all cursor-pointer group" onClick={() => setSelectedScript(sc)}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-emerald-300">{sc.title}</h3>
                                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-bold text-slate-400">{sc.language || 'Vietnamese'}</span>
                                            {currentRole === 'admin' && (
                                                <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-300">👤 {sc.user_id}</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] md:text-xs text-slate-500 tracking-wider mt-1.5 flex flex-col gap-0.5">
                                            <span>Khởi tạo: {new Date(sc.created_at).toLocaleString('vi-VN')}</span>
                                            <span className="text-slate-400">Cập nhật: {new Date(sc.updated_at || sc.created_at).toLocaleString('vi-VN')}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {(currentRole === 'admin' || sc.user_id === localStorage.getItem('username')) && (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingScriptId(sc.id); setNewScriptTitle(sc.title); setNewScriptLanguage(sc.language || 'Vietnamese'); setShowAddScript(true); }}
                                                    className="p-2.5 text-slate-500 hover:text-blue-400 bg-white/5 hover:bg-slate-800 rounded-lg transition-all"
                                                    title="Sửa Tên & Ngôn Ngữ"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(sc.id); }}
                                                    className="p-2.5 text-slate-500 hover:text-red-400 bg-white/5 hover:bg-slate-800 rounded-lg transition-all"
                                                    title="Xóa Kịch Bản"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 w-full">
                                    <div className="w-full md:flex-1 max-w-sm bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: sc.total_sentences ? `${(sc.completed_sentences / sc.total_sentences) * 100}%` : '0%' }} />
                                    </div>
                                    <div className="text-[11px] md:text-xs text-slate-400 font-bold flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                                        <span>Tổng: <span className="text-slate-300">{sc.total_sentences || 0}</span> câu</span>
                                        <span className="opacity-50">|</span>
                                        <span>Đã xong: <span className="text-emerald-400">{sc.completed_sentences || 0}</span></span>
                                        {sc.processing_sentences > 0 && <span className="text-yellow-500 animate-pulse bg-yellow-500/10 px-1.5 py-0.5 rounded ml-1">({sc.processing_sentences} đang chờ)</span>}
                                        {sc.missing_info_sentences > 0 && <span className="text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded ml-1">({sc.missing_info_sentences} chưa sẵn sàng)</span>}
                                        {sc.failed_sentences > 0 && <span className="text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded ml-1">({sc.failed_sentences} render lỗi)</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredScripts.length === 0 && (
                            <div className="text-center p-12 text-slate-500">Chưa có Kịch Bản nào khớp bộ lọc.</div>

                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showAddScript && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card w-full max-w-md p-6 relative">
                            <h3 className="text-xl font-bold text-white mb-4">{editingScriptId ? 'Sửa Thông Tin Kịch Bản' : 'Tạo Kịch Bản Mới'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Tên Kịch Bản</label>
                                    <input value={newScriptTitle} onChange={e => setNewScriptTitle(e.target.value)} type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 transition-colors" placeholder="VD: Giới thiệu kênh YouTube..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Ngôn Ngữ Đầu Ra</label>
                                    <select value={newScriptLanguage} onChange={e => setNewScriptLanguage(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 transition-colors">
                                        {TTS_SUPPORTED_LANGUAGES.map(lang => (
                                            <option key={lang.value} value={lang.value} className="bg-slate-800">{lang.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Giới hạn ký tự mỗi câu</label>
                                    <div className="relative">
                                        <input type="number" min="1" max={MAX_TTS_LENGTH} value={newScriptChunkLimit} onChange={e => {
                                            let val = parseInt(e.target.value) || 10;
                                            if (val > MAX_TTS_LENGTH) val = MAX_TTS_LENGTH;
                                            setNewScriptChunkLimit(val);
                                        }} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 transition-colors" />
                                        {/* <div className="absolute right-3 top-3 text-slate-500 text-xs">tối đa {MAX_TTS_LENGTH}</div> */}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Giúp tự động phân tách câu dài nhắm tránh lỗi Timeout hoặc hết tín dụng. (Tối đa {MAX_TTS_LENGTH})</p>
                                </div>
                                <div className="flex gap-2 justify-end mt-4">
                                    <button onClick={() => setShowAddScript(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold">Hủy</button>
                                    <button onClick={handleSaveScript} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold">{editingScriptId ? 'Lưu Thay Đổi' : 'Tạo Kịch Bản'}</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
                {deleteConfirmId && (
                    <ConfirmDialog
                        title="Xóa Kịch Bản"
                        message="Bạn có chắc chắn muốn xóa kịch bản này? Mọi câu thoại và audio đã render sẽ bị mất vĩnh viễn."
                        onConfirm={handleDeleteScript}
                        onCancel={() => setDeleteConfirmId(null)}
                        type="danger"
                        isLoading={isActionLoading}
                    />
                )}
                {confirmDialog.show && (
                    <ConfirmDialog
                        title={confirmDialog.title}
                        message={confirmDialog.message}
                        onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({ ...prev, show: false })) }}
                        onCancel={() => setConfirmDialog(prev => ({ ...prev, show: false }))}
                        type={confirmDialog.type}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function ConfirmDialog({ title, message, onConfirm, onCancel, type = 'info', isLoading = false, hideCancel = false }: any) {
    const colors = {
        danger: 'from-red-600 to-rose-600 border-red-500/30 text-red-400',
        info: 'from-blue-600 to-indigo-600 border-blue-500/30 text-blue-400',
        success: 'from-emerald-600 to-teal-600 border-emerald-500/30 text-emerald-400'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className={`glass-card w-full max-w-sm p-6 relative border-t-4 ${colors[type as keyof typeof colors]}`}>
                <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${colors[type as keyof typeof colors].split(' ').pop()}`}>
                    {type === 'danger' ? <Trash2 className="w-5 h-5" /> : type === 'success' ? <Check className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                    {title}
                </h3>
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    {!hideCancel && <button onClick={onCancel} disabled={isLoading} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all disabled:opacity-50">Hủy</button>}
                    <button onClick={onConfirm} disabled={isLoading} className={`px-5 py-2 bg-gradient-to-r shadow-lg rounded-xl text-white font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${colors[type as keyof typeof colors].split(' ').slice(0, 2).join(' ')}`}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Xác nhận
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ---------------------------------------------------------------------------------------------------------------------
// EDITOR COMPONENT
// ---------------------------------------------------------------------------------------------------------------------

function ScriptEditor({ script, onBack, setConfirmDialog }: { script: any, onBack: () => void, setConfirmDialog: any }) {
    const currentRole = localStorage.getItem('svc_role') || 'user';
    const currentUsername = localStorage.getItem('username') || '';
    const isOwner = true;

    const userId = authService.getCurrentUserId();
    const [sentences, setSentences] = useState<any[]>([]);
    const [voices, setVoices] = useState<any[]>([]);
    const [editingVoiceId, setEditingVoiceId] = useState<string | null>(null);
    const [editingVoiceEmotion, setEditingVoiceEmotion] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number, total: number, label: string } | null>(null);

    // Unsaved changes tracking
    const [dirtyTexts, setDirtyTexts] = useState<Record<string, string>>({}); // id -> new_text

    // Confirm Dialog State
    const [confirm, setConfirm] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'info' | 'success';
    }>({ show: false, title: '', message: '', onConfirm: () => { } });

    const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' | 'success' = 'info') => {
        setConfirm({ show: true, title, message, onConfirm, type });
    };

    // Global Player from Context
    const context = useContext(GlobalAudioContext);
    const globalPlayer = context?.globalPlayer;
    const setGlobalPlayer = context?.setGlobalPlayer || (() => {});
    const [autoPlayIndex, setAutoPlayIndex] = useState<number | null>(null);
    const [playAllModalOpen, setPlayAllModalOpen] = useState(false);
    const [autoPlayGap, setAutoPlayGap] = useState(500);

    // Filter and Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [charFilter, setCharFilter] = useState('ALL');

    const filteredSentences = sentences.filter(s => {
        if (charFilter !== 'ALL' && s.character_name !== charFilter) return false;
        if (searchQuery && !s.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;

        if (statusFilter === 'MISSING_EMO') {
            if (!s.emotion || s.emotion === 'NEUTRAL' || s.emotion === 'WHISPER') return false;
            const voice = voices.find(v => v.id === s.voice_id);
            if (!voice || !voice.samples) return false;
            return !voice.samples.some((sm: any) => sm.emotion.toUpperCase() === s.emotion);
        } else if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;

        return true;
    });

    const uniqueCharacters = Array.from(new Set(sentences.map(s => s.character_name).filter(Boolean)));

    // Master Script Wizard States
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardRawText, setWizardRawText] = useState("");
    const [wizardParsed, setWizardParsed] = useState<any[]>([]);

    // Merge Audio & SRT States
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [mergeGapMin, setMergeGapMin] = useState(500);
    const [mergeGapMax, setMergeGapMax] = useState(1500);

    const handleMerge = async () => {
        const completedIds = Array.from(selectedIds).filter(id => {
            const s = sentences.find(x => x.id === id);
            return s && s.status === 'Completed' && s.audio_path !== false;
        });

        if (completedIds.length === 0) {
            toast.error("Vui lòng chọn ít nhất 1 câu đã render thành công (Completed).");
            return;
        }

        setIsProcessing(true);
        setMergeModalOpen(false);
        const loadingToastId = toast.loading("Đang xử lý ghép Audio và xuất SRT. Vui lòng đợi...");
        try {
            const res = await api_tts.mergeSentences(script.id, {
                sentence_ids: completedIds,
                gap_min: mergeGapMin,
                gap_max: mergeGapMax
            });
            toast.success("Ghép thành công!", { id: loadingToastId });

            // Auto download MP3
            const linkMp3 = document.createElement('a');
            linkMp3.href = import.meta.env.VITE_API_URL.replace('/api', '') + res.data.mp3_url;
            linkMp3.setAttribute('download', (res.data as any).mp3_filename || 'merged_audio.mp3');
            document.body.appendChild(linkMp3);
            linkMp3.click();
            linkMp3.remove();

            // Auto download SRT
            setTimeout(() => {
                const linkSrt = document.createElement('a');
                linkSrt.href = import.meta.env.VITE_API_URL.replace('/api', '') + res.data.srt_url;
                linkSrt.setAttribute('download', (res.data as any).srt_filename || 'subtitles.srt');
                document.body.appendChild(linkSrt);
                linkSrt.click();
                linkSrt.remove();
            }, 500);

        } catch (err: any) {
            toast.error("Ghép thất bại: " + (err.response?.data?.detail || err.message), { id: loadingToastId });
        } finally {
            setIsProcessing(false);
        }
    };
    const [wizardText, setWizardText] = useState("");
    const [wizardMode, setWizardMode] = useState<"Dialogue" | "Story">("Dialogue");
    const [wizardCharacters, setWizardCharacters] = useState<string[]>([]);
    const [wizardCharacterEmotions, setWizardCharacterEmotions] = useState<Record<string, string[]>>({});
    const [wizardVoiceMap, setWizardVoiceMap] = useState<Record<string, string>>({});
    const [isWizardProcessing, setIsWizardProcessing] = useState(false);
    const [wizardMissingConfirm, setWizardMissingConfirm] = useState<{ show: boolean, logs: string[] }>({ show: false, logs: [] });

    const handleWizardAnalyze = async () => {
        if (!wizardText.trim()) return toast.error("Kịch bản đang trống!");
        setIsWizardProcessing(true);
        try {
            // Tự động triệt tiêu các khoảng trắng thừa rác lọt khe giữa Đuôi ngoặc đóng và Dấu ngắt câu (Ví dụ: 「Mình dừng lại nhé」 . -> 「Mình dừng lại nhé」.)
            const cleanText = wizardText.replace(/([\]」』】》〕〉）)］])\s+([.!?。！？,、;:]+)/g, '$1$2').trim();
            setWizardText(cleanText);

            const res = await api_tts.analyzeMasterScript(cleanText, wizardMode);
            const chars: string[] = res.data?.characters || [];
            const charEmotions = res.data?.character_emotions || {};
            if (chars.length === 0) {
                toast.error("Không tìm thấy nhân vật nào. Dùng định dạng Nhân vật:「Thoại」");
            } else {
                setWizardCharacters(chars);
                setWizardCharacterEmotions(charEmotions);
                const newMap: Record<string, string> = { ...wizardVoiceMap };
                chars.forEach(c => {
                    if (!newMap[c]) newMap[c] = script?.character_voice_map?.[c] || "";
                });
                setWizardVoiceMap(newMap);
                setWizardStep(2);
            }
        } catch (err: any) {
            toast.error("Lỗi phân tích kịch bản");
        } finally {
            setIsWizardProcessing(false);
        }
    };

    const handleWizardImport = async (replaceMissingWithNeutral: boolean = false) => {
        setIsWizardProcessing(true);
        setBatchProgress({ current: 0, total: 100, label: "Đang yêu cầu backend phân tách & nhập kịch bản..." });

        try {
            const res = await api_tts.importMasterScript(script.id, {
                text: wizardText, 
                character_voice_map: wizardVoiceMap, 
                replace_missing_with_neutral: replaceMissingWithNeutral,
                mode: wizardMode
            });
            
            toast.success(`Đã thêm thành công ${res.data.inserted} câu thoại!`);
            setWizardOpen(false);
            setWizardText("");
            setWizardStep(1);
            loadSentences();
        } catch (err: any) {
            toast.error("Lỗi khi nhập kịch bản: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsWizardProcessing(false);
            setBatchProgress(null);
        }
    };

    const confirmWizardImport = () => {
        const missingLogs: string[] = [];
        wizardCharacters.forEach(c => {
            const vId = wizardVoiceMap[c];
            if (vId) {
                const voice = voices.find(v => v.id === vId);
                if (voice) {
                    const voiceAvailable = Array.from(new Set(['NEUTRAL', 'WHISPER', ...(voice.samples?.map((s: any) => s.emotion.toUpperCase()) || [])]));
                    const requested = wizardCharacterEmotions[c] || [];
                    const missing = requested.filter(emo => !voiceAvailable.includes(emo));
                    if (missing.length > 0) {
                        missingLogs.push(`- ${c}: thiếu phân loại [${missing.join(', ')}]`);
                    }
                }
            }
        });

        if (missingLogs.length > 0) {
            setWizardMissingConfirm({ show: true, logs: missingLogs });
        } else {
            handleWizardImport(false);
        }
    }

    const playAudio = (sentence: any, isAutoPlay: boolean = false) => {
        if (!sentence.id) return;
        if (!isAutoPlay) setAutoPlayIndex(null);

        // Sử dụng URL stream thay vì đường dẫn tệp trực tiếp
        const url = api_tts.getStreamUrl(sentence.id) + `&ts=${Date.now()}`;
        const absoluteIndex = sentences.findIndex((s: any) => s.id === sentence.id) + 1;
        setGlobalPlayer({ url, title: `Câu ${absoluteIndex}: ${sentence.text.substring(0, 20)}...`, id: sentence.id });
    }

    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20;

    const totalPages = Math.max(1, Math.ceil(filteredSentences.length / PAGE_SIZE));
    const paginatedSentences = filteredSentences.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Reset pagination to valid bounds if filters change
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [filteredSentences.length, totalPages, currentPage]);


    const playReferenceAudio = (sentence: any) => {
        const voice = voices.find(v => v.id === sentence.voice_id);
        if (!voice) return toast.error("Vui lòng gắn Giọng Đọc trước!");

        const isPlaying = globalPlayer?.id === `ref_demo_${sentence.id}`;
        if (isPlaying) {
            setGlobalPlayer(null);
            return;
        }

        if (voice.demo_audio_path) {
            setGlobalPlayer({ url: `${baseUrl}/tts_static/${voice.demo_audio_path}?ts=${Date.now()}`, title: `[Demo] ${cleanVoiceName(voice.name)}`, id: `ref_demo_${sentence.id}` });
            return;
        }

        if (!voice.samples || voice.samples.length === 0) return toast.error("Giọng này chưa thiết lập mẫu audio nào!");
        const sample = voice.samples.find((s: any) => s.emotion.toUpperCase() === (sentence.emotion || 'NEUTRAL').toUpperCase() && s.is_active !== false);
        if (!sample || !sample.audio_path) return toast.error("Chưa có Demo gốc, và cũng không tìm thấy Sample cho cảm xúc đang chọn!");

        const token = localStorage.getItem('access_token');
        const url = `${baseUrl}/tts/stream?sample_id=${sample.id}&token=${token}&ts=${Date.now()}`;
        setGlobalPlayer({ url, title: `[Mẫu: ${sample.emotion}] ${cleanVoiceName(voice.name)}`, id: `ref_demo_${sentence.id}` });
    }
    const playVoiceDemo = (v: any) => {
        if (!v) return;
        if (v.demo_audio_path) {
            setGlobalPlayer({ url: `${baseUrl}/api/tts_static/${v.demo_audio_path}`, title: cleanVoiceName(v.name), id: v.id });
        } else if (v.samples?.length > 0 && v.samples[0].audio_path) {
            const token = localStorage.getItem('svc_access_token') || localStorage.getItem('access_token');
            setGlobalPlayer({ url: `${baseUrl}/api/tts/stream?sample_id=${v.samples[0].id}&token=${token}&ts=${Date.now()}`, title: cleanVoiceName(v.name), id: v.id });
        } else {
            toast.error("Voice này chưa có dữ liệu âm thanh mẫu");
        }
    };

    const handleAudioEnded = () => {
        if (autoPlayIndex !== null) {
            const nextIdx = autoPlayIndex + 1;
            if (nextIdx < sentences.length) {
                const nextSentence = sentences[nextIdx];
                if (nextSentence.audio_path && nextSentence.status === 'Completed') {
                    if (autoPlayGap > 0) {
                        setTimeout(() => {
                            setAutoPlayIndex(nextIdx);
                            playAudio(nextSentence, true);
                        }, autoPlayGap);
                    } else {
                        setAutoPlayIndex(nextIdx);
                        playAudio(nextSentence, true);
                    }
                } else {
                    toast.error(`Đã phát tới câu ${nextIdx + 1} nhưng nó chưa Render xong!`, { icon: '⚠️' });
                    setAutoPlayIndex(null);
                }
            } else {
                toast.success("Đã phát xong toàn bộ kịch bản.");
                setAutoPlayIndex(null);
                setGlobalPlayer(null);
            }
        }
    }

    const handlePlayAll = () => {
        if (sentences.length === 0) return toast.error("Kịch bản trống.");
        const firstIdx = sentences.findIndex(s => s.audio_path && s.status === 'Completed');
        if (firstIdx === -1) return toast.error("Không có câu nào đã Render để phát.");
        setPlayAllModalOpen(true);
    }

    const handlePlayAllConfirm = () => {
        const firstIdx = sentences.findIndex(s => s.audio_path && s.status === 'Completed');
        if (firstIdx === -1) return toast.error("Không có câu nào đã Render để phát.");
        toast("Bắt đầu phát Tuần tự...");
        setPlayAllModalOpen(false);
        setAutoPlayIndex(firstIdx);
        playAudio(sentences[firstIdx], true);
    }

    // Mass edit states
    const [massVoice, setMassVoice] = useState('');
    const [applyVoice, setApplyVoice] = useState(false);

    const [massEmotion, setMassEmotion] = useState('NEUTRAL');
    const [applyEmotion, setApplyEmotion] = useState(false);

    const [massSpeed, setMassSpeed] = useState<number>(1.0);
    const [applySpeed, setApplySpeed] = useState(false);

    const [massPitch, setMassPitch] = useState<number>(1.0);
    const [applyPitch, setApplyPitch] = useState(false);

    const handleAddSentenceQuick = async (index: number = sentences.length, text: string = "Nhập nội dung vào đây...", voiceId?: string, emotion: string = 'NEUTRAL', speed: number = 1.0, pitch: number = 1.0) => {
        const chunks = splitTextSmart(text, script?.chunk_limit || TTS_CHUNK_LIMIT);

        setIsProcessing(true);
        const loadToast = toast.loading(`Đang thêm ${chunks.length > 1 ? chunks.length + ' câu' : 'câu'} mới...`);
        try {
            let currentIndex = index;
            const newSentencesToAdd = [];
            for (let i = 0; i < chunks.length; i++) {
                const res = await api_tts.addSentence(
                    script.id,
                    chunks[i],
                    voiceId,
                    emotion,
                    undefined, // mode
                    undefined, // control_instruction
                    speed,
                    pitch,
                    currentIndex
                );
                newSentencesToAdd.push(res.data);
                currentIndex++;
            }

            toast.success(chunks.length > 1 ? `Đã tự tách thành ${chunks.length} câu!` : "Đã thêm câu!", { id: loadToast });
            loadSentences();
        } catch (e: any) {
            toast.error("Lỗi: " + e.message, { id: loadToast });
        } finally {
            setIsProcessing(false);
        }
    }

    const getSentenceMissingReason = (sentence: any) => {
        if (!sentence.voice_id && sentence.character !== 'Người kể chuyện' && sentence.character !== '') return "Chưa gắn Giọng Đọc";
        const voice = voices.find((v: any) => v.id === sentence.voice_id);
        if (!voice && sentence.character !== 'Người kể chuyện' && sentence.character !== '') return "Giọng đọc không tồn tại";
        if (!voice) return null;
        
        const isVoiceVox = voice.voice_type === 'pure_tts' || (voice.name && voice.name.includes('[VoiceVox]'));
        
        if (sentence.emotion && sentence.emotion !== 'NEUTRAL' && sentence.emotion !== 'WHISPER') {
            const sample = voice.samples?.find((sm: any) => sm.emotion.toUpperCase() === sentence.emotion.toUpperCase());
            
            if (!sample) return "Thiếu Audio mẫu cho cảm xúc này";
            
            if (sample.text_transcript && sample.text_transcript.includes('[Lỗi:')) {
                return `Lỗi mẫu giọng: ${sample.text_transcript.replace('[Lỗi: ', '').replace(']', '')}`;
            }
            
            if (sample.is_active === false) {
                if (sample.text_transcript && sample.text_transcript.includes('Đang nhận diện')) return "Mẫu giọng đang được AI nhận diện văn bản...";
                return "Mẫu giọng chưa sẵn sàng (Inactive)";
            }

            if (isVoiceVox) {
                const validGenericEmotions = ['HAPPY', 'SAD', 'ANGRY', 'HESITANT', 'CONFUSED', 'SURPRISED'];
                if (validGenericEmotions.includes(sentence.emotion.toUpperCase())) return null;
                if (!sample) return "VoiceVox style này không tồn tại";
            } else {
                if (!sample.audio_path) return "Mẫu giọng thiếu file âm thanh";
                if (!sample.text_transcript || sample.text_transcript.trim() === '') return "Mẫu giọng thiếu văn bản nhận diện (Transcript)";
            }
        }
        return null;
    };

    const isSentenceMissingInfo = (sentence: any) => !!getSentenceMissingReason(sentence);

    const loadSentences = async () => {
        try {
            const res = await api_tts.getSentences(script.id);
            setSentences(res.data);
        } catch (e) { }
    };

    const loadVoices = async () => {
        try {
            const res = await api_tts.getVoices();
            // Lọc bỏ các Voice bị Ẩn (is_active = false)
            setVoices(res.data.filter((v: any) => v.is_active !== false));
        } catch (e) { }
    }

    useEffect(() => {
        loadSentences();
        loadVoices();

        // Cấu trúc cũ: Polling 5s đã bị gỡ bỏ theo ý Sư phụ.
        return () => { };
    }, [script.id]);

    useEffect(() => {
        if (autoPlayIndex !== null && sentences[autoPlayIndex]) {
            const playingSentence = sentences[autoPlayIndex];
            const filteredIndex = filteredSentences.findIndex(s => s.id === playingSentence.id);
            
            if (filteredIndex !== -1) {
                const targetPage = Math.floor(filteredIndex / PAGE_SIZE) + 1;
                
                const scrollToElement = () => {
                    const el = document.getElementById(`sentence-${playingSentence.id}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                };

                if (targetPage !== currentPage) {
                    setCurrentPage(targetPage);
                    setTimeout(scrollToElement, 150);
                } else {
                    scrollToElement();
                }
            }
        }
    }, [autoPlayIndex]);



    const handleDeleteSentence = (id: string) => {
        openConfirm(
            "Xóa câu thoại",
            "Bạn có chắc muốn xóa câu thoại này? Audio đã render cũng sẽ bị xóa.",
            async () => {
                const loadToast = toast.loading("Đang xóa...");
                try {
                    await api_tts.deleteSentence(id);
                    toast.success("Đã xóa", { id: loadToast });
                    setSentences(prev => prev.filter(s => s.id !== id));
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                } catch (e: any) {
                    toast.error("Lỗi: " + e.message, { id: loadToast });
                }
            },
            "danger"
        );
    }

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return toast.error("Vui lòng tick chọn ít nhất 1 câu để xóa");

        openConfirm(
            "Xóa hàng loạt",
            `Xác nhận xóa vĩnh viễn ${selectedIds.size} câu đã chọn cùng với các file Audio tương ứng? Thao tác này không thể hoàn tác.`,
            async () => {
                const idArr = Array.from(selectedIds);
                setBatchProgress({ current: 0, total: idArr.length, label: "Đang xóa dữ liệu hàng loạt..." });
                try {
                    await processInChunks(idArr, 10, (id) => api_tts.deleteSentence(id), (curr, tot) => {
                        setBatchProgress({ current: curr, total: tot, label: `Đang xóa: ${curr}/${tot} câu...` });
                    });
                    toast.success(`Đã xóa thành công ${idArr.length} câu!`);
                    setSentences(prev => prev.filter(s => !selectedIds.has(s.id)));
                    setSelectedIds(new Set());
                } catch (e: any) {
                    toast.error("Lỗi xóa hàng loạt: " + e.message);
                } finally {
                    setBatchProgress(null);
                }
            },
            "danger"
        );
    }

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    }
    const selectAll = () => {
        const visibleIds = filteredSentences.map(s => s.id);
        const allVisibleSelected = visibleIds.length > 0 && item_count_checked_in_view(visibleIds);
        const next = new Set(selectedIds);
        if (allVisibleSelected) {
            visibleIds.forEach(id => next.delete(id)); // Unselect visible
        } else {
            visibleIds.forEach(id => next.add(id));    // Select all visible
        }
        setSelectedIds(next);
    }
    const item_count_checked_in_view = (visibleIds: string[]) => {
        return visibleIds.every(id => selectedIds.has(id));
    }

    const handleMassApply = () => {
        if (selectedIds.size === 0) return toast.error("Vui lòng tick chọn ít nhất 1 câu");

        const updates: any = {};
        if (applyVoice) updates.voice_id = massVoice || undefined;
        if (applyEmotion) updates.emotion = massEmotion;
        if (applySpeed) updates.speed = massSpeed;
        if (applyPitch) updates.pitch = massPitch;

        if (Object.keys(updates).length === 0) return toast.error("Cần tick chọn ít nhất 1 tham số (Voice/Cảm xúc/Speed/Pitch) để áp dụng!");

        openConfirm(
            "Áp dụng hàng loạt",
            `Xác nhận gán cài đặt mới cho ${selectedIds.size} câu đã chọn?`,
            async () => {
                const idArr = Array.from(selectedIds);
                setBatchProgress({ current: 0, total: idArr.length, label: "Đang cập nhật thuộc tính hàng loạt..." });
                try {
                    const results = await processInChunks(idArr, 10, (id) => api_tts.updateSentence(id, updates), (curr, tot) => {
                        setBatchProgress({ current: curr, total: tot, label: `Đang cập nhật: ${curr}/${tot} câu...` });
                    });

                    toast.success(`Đã cập nhật xong ${results.length} câu!`);

                    // Cập nhật state cục bộ ngay lập tức
                    const updatedMap = new Map(results.map((r: any) => [r.data.id, r.data]));
                    setSentences(prev => prev.map(s => updatedMap.get(s.id) || s));
                } catch (e: any) {
                    toast.error("Lỗi cập nhật: " + e.message);
                } finally {
                    setBatchProgress(null);
                }
            }
        );
    }

    const handleDownloadZip = () => {
        const completed = sentences.filter(s => s.status === 'Completed' && s.audio_path);
        if (completed.length === 0) return toast.error("Kịch bản chưa có file âm thanh nào hoàn thành để tải!");

        openConfirm(
            "Tải xuống file nén",
            `Hệ thống sẽ nén ${completed.length} tệp âm thanh vào một tệp ZIP. Bạn có muốn tiếp tục?`,
            () => {
                const token = localStorage.getItem('access_token') || localStorage.getItem('svc_access_token') || '';
                const url = `${baseUrl}/tts/scripts/${script.id}/export-zip?token=${token}`;

                const a = document.createElement('a');
                a.href = url;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                toast.success("Bắt đầu tải file nén cấu trúc Zip...");
            },
            "info"
        );
    }

    const handleDownloadSingle = (sentence: any) => {
        if (!sentence.audio_path) return;
        const token = localStorage.getItem('access_token') || localStorage.getItem('svc_access_token') || '';
        const url = `${baseUrl}/tts/stream?sentence_id=${sentence.id}&download=1&token=${token}`;

        const a = document.createElement('a');
        a.href = url;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    const handleCancelSentence = async (id: string) => {
        openConfirm(
            "Hủy Render",
            "Bạn muốn dừng tiến trình render câu này?",
            async () => {
                const loadToast = toast.loading("Đang gửi lệnh hủy...");
                try {
                    const res = await api_tts.cancelSentence(id);
                    toast.success("Đã hủy thành công", { id: loadToast });
                    setSentences(prev => prev.map(s => s.id === id ? res.data : s));
                } catch (e: any) {
                    toast.error("Lỗi: " + e.message, { id: loadToast });
                }
            },
            "info"
        );
    }

    const handleCancelAll = async () => {
        const pendings = sentences.filter(s => s.status === 'Processing' || s.status === 'Queued');
        if (pendings.length === 0) return toast("Không có câu nào đang chạy để hủy", { icon: 'ℹ️' });

        openConfirm(
            "Dừng tất cả Render",
            `Bạn có chắc muốn dừng tất cả ${pendings.length} câu đang xử lý?`,
            async () => {
                const loadToast = toast.loading("Đang dừng hàng loạt...");
                try {
                    const results = await Promise.all(pendings.map(s => api_tts.cancelSentence(s.id)));
                    toast.success("Đã dừng toàn bộ kịch bản!", { id: loadToast });

                    const updatedMap = new Map(results.map((r: any) => [r.data.id, r.data]));
                    setSentences(prev => prev.map(s => updatedMap.get(s.id) || s));
                } catch (e: any) {
                    toast.error("Lỗi khi dừng: " + e.message, { id: loadToast });
                }
            },
            "danger"
        );
    }

    const handleSaveSentenceText = async (id: string, text: string) => {
        if (!text && text !== "") return;

        const chunks = splitTextSmart(text, script?.chunk_limit || TTS_CHUNK_LIMIT);
        const loadToast = toast.loading("Đang lưu văn bản...");
        try {
            if (chunks.length <= 1) {
                const res = await api_tts.updateSentence(id, { text: chunks[0] || "" });
                toast.success("Đã lưu!", { id: loadToast });
                setSentences(prev => prev.map(s => s.id === id ? res.data : s));
            } else {
                // Tách thành nhiều câu
                await api_tts.updateSentence(id, { text: chunks[0] });
                const currentSentence = sentences.find(s => s.id === id);
                let currentIndex = (currentSentence?.order_index || 0) + 1;

                for (let i = 1; i < chunks.length; i++) {
                    const res = await api_tts.addSentence(
                        script.id,
                        chunks[i],
                        currentSentence?.voice_id,
                        currentSentence?.emotion || 'NEUTRAL',
                        currentSentence?.mode || undefined,
                        currentSentence?.control_instruction || undefined,
                        currentSentence?.speed || 1.0,
                        currentSentence?.pitch || 1.0,
                        currentIndex
                    );
                    currentIndex++;
                }
                toast.success(`Đoạn văn dài đã được tự động tách thành ${chunks.length} câu!`, { id: loadToast });
                loadSentences();
            }

            setDirtyTexts(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        } catch (e: any) {
            toast.error("Lỗi: " + e.message, { id: loadToast });
        }
    }

    const handleDiscardText = (id: string) => {
        setDirtyTexts(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }

    const handleRenderSentence = async (id: string) => {
        const sentence = sentences.find(s => s.id === id);
        if (sentence) {
            const voice = voices.find(v => v.id == sentence.voice_id);
            const isVoiceVox = voice && (voice.voice_type === 'pure_tts' || (voice.name && voice.name.includes('[VoiceVox]')));
            const isMissing = !!(sentence.emotion && sentence.emotion !== 'NEUTRAL' && sentence.emotion !== 'WHISPER' && voice && !isVoiceVox && (!voice.samples || !voice.samples.some((sm: any) => sm.emotion.toUpperCase() === sentence.emotion.toUpperCase())));
            if (isMissing) {
                toast.error("Câu thoại này gán cảm xúc nhưng Giọng đọc chưa có Audio mẫu cho cảm xúc đó (Báo đỏ ❗). Xin hãy thiết lập bù hoặc chuyển về Neutral!", {duration: 5000});
                // Vẫn cho phép render nhưng sẽ fallback về Neutral ở backend
            }
        }
        
        setIsProcessing(true);
        const loadToast = toast.loading("Đang đưa vào hàng đợi...");
        try {
            const res = await api_tts.renderSentence(id);
            toast.success("Đã tiếp nhận yêu cầu Render!", { id: loadToast });
            // Cập nhật trạng thái tức thì từ kết quả API (sẽ là Queued)
            setSentences(prev => prev.map(s => s.id === id ? res.data : s));
        } catch (e: any) {
            toast.error("Lỗi: " + e.message, { id: loadToast });
        } finally {
            setIsProcessing(false);
        }
    }

    const handleRenderSelected = async () => {
        if (selectedIds.size === 0) return toast.error("Tick chọn ít nhất 1 câu để Render");

        const hasMissing = Array.from(selectedIds).some(id => {
            const sentence = sentences.find(s => s.id === id);
            if (!sentence) return false;
            return isSentenceMissingInfo(sentence);
        });
        
        if (hasMissing) {
            toast.error("Có một số câu thoại đã gán cảm xúc nhưng Giọng đọc chưa có Audio mẫu cho cảm xúc đó (Báo đỏ ❗). Xin hãy thiết lập bù mẫu giọng, nếu không AI sẽ tự động trả về Neutral!", {duration: 7000});
        }

        openConfirm(
            "Thực thi Render hàng loạt",
            `Xác nhận đẩy ${selectedIds.size} câu đã chọn vào hàng đợi render?`,
            async () => {
                const idArr = Array.from(selectedIds);
                setBatchProgress({ current: 0, total: idArr.length, label: "Đang xếp hàng Render..." });
                try {
                    const results = await processInChunks(idArr, 10, (id) => api_tts.renderSentence(id), (curr, tot) => {
                        setBatchProgress({ current: curr, total: tot, label: `Đang đẩy vào hàng chờ: ${curr}/${tot} câu...` });
                    });
                    toast.success("Tất cả đã được đưa vào hàng đợi!");

                    // Cập nhật state hàng loạt
                    const updatedMap = new Map(results.map((r: any) => [r.data.id, r.data]));
                    setSentences(prev => prev.map(s => updatedMap.get(s.id) || s));
                } catch (e: any) {
                    toast.error("Lỗi render hàng loạt: " + e.message);
                } finally {
                    setBatchProgress(null);
                }
            },
            "success"
        );
    }

    const handleAutoInferEmotions = async () => {
        if (selectedIds.size === 0) return toast.error("Vui lòng tick chọn ít nhất 1 câu");

        const idArr = Array.from(selectedIds);
        setBatchProgress({ current: 0, total: idArr.length, label: "Đang phân tích kịch bản & cảm xúc..." });

        try {
            let missingSampleCount = 0;
            const tasks = idArr.map(id => {
                const s = sentences.find(x => x.id === id);
                if (!s || !s.voice_id) return null;

                const voice = voices.find(v => v.id === s.voice_id);
                if (!voice || !voice.samples) return null;

                const allowedEmos = [...voice.samples.map((sm: any) => sm.emotion.toUpperCase()), 'NEUTRAL'];
                let newEmo = s.emotion || "NEUTRAL";
                let newText = s.text;
                let isTextChanged = false;

                let buildMatch = newText.match(/\[([a-zA-Z0-9_ -]+)\]|\{([a-zA-Z0-9_ -]+)\}/);
                if (buildMatch) {
                    newEmo = (buildMatch[1] || buildMatch[2]).trim();
                    newText = newText.replace(buildMatch[0], '').trim();
                    isTextChanged = true;
                }

                if (newEmo === 'NEUTRAL') {
                    const textLower = newText.toLowerCase();
                    let inferredEmo = "NEUTRAL";
                    if (newText.includes("...") || newText.includes("…") || newText.includes("あの") || newText.includes("えっと") || newText.includes("うーん")) {
                        inferredEmo = ["HESITANT", "NGAPNGUNG", "NERVOUS", "SHY", "SAD"].find(e => allowedEmos.includes(e)) || "HESITANT";
                    } else if (newText.includes("!") || newText.includes("！")) {
                        inferredEmo = ["ANGRY", "SHOUT", "TUCGIAN", "QUAT", "EXCITED", "HAPPY"].find(e => allowedEmos.includes(e)) || "ANGRY";
                    } else if (newText.includes("?") || newText.includes("？")) {
                        inferredEmo = ["CONFUSED", "QUESTION", "NGACNHIEN", "TO-MO"].find(e => allowedEmos.includes(e)) || "CONFUSED";
                    } else if (newText.includes("ぐす") || newText.includes("うう") || textLower.includes("khóc") || textLower.includes("hức")) {
                        inferredEmo = ["SAD", "CRYING", "BUON", "KHOC"].find(e => allowedEmos.includes(e)) || "SAD";
                    }
                    if (inferredEmo !== 'NEUTRAL') newEmo = inferredEmo;
                }

                if (newEmo !== s.emotion || isTextChanged) {
                    if (newEmo !== s.emotion && newEmo !== 'NEUTRAL' && newEmo !== 'WHISPER' && !allowedEmos.includes(newEmo)) {
                        missingSampleCount++;
                    }
                    return { id, payload: { emotion: newEmo, text: newText } };
                }
                return null;
            }).filter(Boolean) as { id: string, payload: any }[];

            if (tasks.length > 0) {
                const resolved = await processInChunks(tasks, 10, (t) => api_tts.updateSentence(t.id, t.payload).then(r => r.data), (curr, tot) => {
                    setBatchProgress({ current: curr, total: tot, label: `Đang cập nhật cảm xúc: ${curr}/${tot} câu...` });
                });

                const updatedMap = new Map(resolved.map((r: any) => [r.id, r]));
                setSentences(prev => prev.map(s => updatedMap.has(s.id) ? { ...s, ...updatedMap.get(s.id) } : s));

                if (missingSampleCount > 0) {
                    toast.success(
                        (t) => (
                            <div className="flex flex-col gap-1">
                                <strong>Đã tự động gán cảm xúc cho {resolved.length} câu!</strong>
                                <span className="text-yellow-500 text-xs">⚠️ Phát hiện {missingSampleCount} câu có cảm xúc bị thiếu Audio Sample.</span>
                            </div>
                        ),
                        { duration: 5000 }
                    );
                } else {
                    toast.success(`Đã tự động gán cảm xúc cho ${resolved.length} câu!`);
                }
            } else {
                toast.success("Các câu đã chọn đều không có dấu hiệu đặc biệt hoặc đã ổn.");
            }
        } catch (e: any) {
            toast.error("Lỗi: " + e.message);
        } finally {
            setBatchProgress(null);
        }
    }

    const statsTotal = sentences.length;
    const statsCompleted = sentences.filter(s => s.status === 'Completed' && s.audio_path).length;
    const statsFailed = sentences.filter(s => s.status === 'Failed').length;
    const statsError = sentences.filter(s => isSentenceMissingInfo(s)).length;

    return (
        <div className="flex flex-col h-full p-4 md:p-6 overflow-hidden space-y-4">
            {/* Header Editor */}
            <div className="flex flex-wrap items-center justify-between bg-white/[0.03] p-4 rounded-xl border border-white/5 shrink-0 gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all shadow-md"><ChevronLeft className="w-5 h-5" /></button>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Đang chỉnh sửa kịch bản</span>
                        <h2 className="text-xl font-bold text-white truncate max-w-[200px] md:max-w-md">{script.title}</h2>
                        <div className="flex gap-2 text-[11px] font-bold mt-1 flex-wrap">
                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 shadow-sm">Tổng: {statsTotal} câu</span>
                            <span className={`px-2 py-0.5 rounded border shadow-sm ${statsCompleted > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>Đã Xong: {statsCompleted}</span>
                            {statsError > 0 && <span className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20 shadow-sm">Thiếu thông tin: {statsError}</span>}
                            {statsFailed > 0 && <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded border border-rose-500/20 shadow-sm">Render Lỗi: {statsFailed}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs text-rose-300 italic max-w-[150px] md:max-w-none text-right">Hệ thống không tự động cập nhật. Hãy bấm Làm mới. &rarr;</span>
                    <button onClick={() => { toast("Đang làm mới..."); loadSentences(); loadVoices(); }} className="px-3 py-2 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg text-sm text-slate-300 font-bold flex gap-2 items-center" title="Làm mới trạng thái">
                        <RefreshCw className="w-4 h-4" /> Cập nhật trạng thái
                    </button>
                    <button onClick={handlePlayAll} disabled={isProcessing} className="px-3 py-2 bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 rounded-lg text-sm text-white font-bold flex gap-2 items-center disabled:opacity-50" title="Phát lần lượt cả Series">
                        <Volume2 className="w-4 h-4" /> Phát Tuần Tự
                    </button>
                    {isOwner && (
                        <>
                            <button onClick={() => setWizardOpen(true)} disabled={isProcessing} className="px-3 py-2 bg-purple-600 border border-purple-500 hover:bg-purple-500 rounded-lg text-sm text-white font-bold flex gap-2 items-center text-nowrap shadow-[0_0_10px_rgba(147,51,234,0.4)] disabled:opacity-50" title="Nhập & Tách kịch bản tổng tự động">
                                <FileText className="w-4 h-4" /> 🧙‍♂️ Wizard Nhập Liệu
                            </button>
                            <button onClick={() => handleAddSentenceQuick(sentences.length > 0 ? Math.max(...sentences.map(s => s.order_index)) + 1 : 0)} disabled={isProcessing} className="px-3 py-2 bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 rounded-lg text-sm text-white font-bold flex gap-2 items-center text-nowrap disabled:opacity-50" title="Thêm một câu mới vào cuối kịch bản">
                                <Plus className="w-4 h-4" /> Thêm câu mới
                            </button>
                        </>
                    )}
                    <button onClick={handleDownloadZip} disabled={isProcessing} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:opacity-80 rounded-lg text-sm text-white font-bold flex gap-2 items-center shadow-lg transition-all disabled:opacity-50" title="Nén toàn bộ các file Audio đã Render thành công trong kịch bản này thành 1 file ZIP và tải xuống">
                        <Archive className="w-4 h-4" /> Download All
                    </button>
                    {isOwner && (
                        <>
                            <button onClick={handleRenderSelected} disabled={selectedIds.size === 0 || isProcessing} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-80 rounded-lg text-sm text-white font-bold flex gap-2 items-center shadow-lg disabled:opacity-50" title="Đẩy toàn bộ các câu đang đánh dấu (Tick) vào hàng chờ Render">
                                <Cpu className="w-4 h-4" /> Render hàng loạt
                            </button>
                            {(sentences.some(s => s.status === 'Processing' || s.status === 'Queued')) && (
                                <button onClick={handleCancelAll} disabled={isProcessing} className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-sm font-bold flex gap-2 items-center shadow-lg transition-all disabled:opacity-50" title="Hủy bỏ ngay lập tức toàn bộ các tiến trình đang chờ hoặc đang chạy">
                                    <StopCircle className="w-4 h-4" /> Dừng Render hàng loạt
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Khung tìm kiếm và lọc phân mảng Filter/Search */}
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500">🔍</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Tìm kiếm nội dung text..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-slate-700/80 rounded-xl text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                    />
                </div>
                <div className="sm:w-56 shrink-0 relative">
                    <select
                        value={charFilter}
                        onChange={e => setCharFilter(e.target.value)}
                        className="w-full pl-4 pr-8 py-2.5 bg-[#0B0F19] border border-slate-700/80 rounded-xl text-sm text-slate-300 font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none appearance-none"
                    >
                        <option value="ALL" className="bg-slate-900">🎭 Lọc: Tất cả Nhân vật</option>
                        {uniqueCharacters.map(char => (
                            <option key={char} value={char} className="bg-slate-900">{char}</option>
                        ))}
                    </select>
                </div>
                <div className="sm:w-56 shrink-0 relative">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="w-full pl-4 pr-8 py-2.5 bg-[#0B0F19] border border-slate-700/80 rounded-xl text-sm text-slate-300 font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none appearance-none"
                    >
                        <option value="ALL" className="bg-slate-900">🌟 Tất Cả Trạng Thái</option>
                        <option value="Idle" className="bg-slate-900">⏳ Chưa Render (Idle)</option>
                        <option value="MISSING_EMO" className="bg-slate-900 text-yellow-500">⚠️ Thiếu Audio Sample Cảm Xúc</option>
                        <option value="Queued" className="bg-slate-900">🚶 Đang Chờ (Queued)</option>
                        <option value="Processing" className="bg-slate-900">🔥 Đang Render (Processing)</option>
                        <option value="Completed" className="bg-slate-900">✅ Hoàn Thành (Completed)</option>
                        <option value="Failed" className="bg-slate-900">❌ Báo Lỗi (Failed)</option>
                    </select>
                </div>
            </div>

            {/* Mass Edit Tools (Cố định phía trên phần cuộn) */}
            {isOwner && (
                <div className="flex gap-3 items-stretch rounded-xl border p-3 border-slate-700 bg-slate-800/40 shadow-lg mt-3 shrink-0 relative z-[50]">
                    {/* Checkbox ALL - Exact size & padding match with row checkbox */}
                    <div className="w-10 flex flex-col items-center justify-center pt-1 pl-1" title="Đảo trạng thái Chọn tất cả / Bỏ chọn tất cả (chỉ áp dụng cho các câu đang hiển thị)">
                        <input type="checkbox" checked={filteredSentences.length > 0 && filteredSentences.every(s => selectedIds.has(s.id))} onChange={selectAll} className="w-[18px] h-[18px] accent-emerald-500 rounded border-slate-600 cursor-pointer" title="Đảo trạng thái Chọn tất cả / Bỏ chọn tất cả" />
                    </div>

                    <div className="flex-1 flex flex-wrap items-center gap-3">
                        <div className="flex flex-col border-r border-slate-700/50 pr-4 shrink-0">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Gán Hàng Loạt</span>
                            <span className="text-[10px] text-slate-500 font-medium">Đang thao tác: <strong className="text-emerald-400">{selectedIds.size}</strong> câu</span>
                        </div>

                        {/* Mass Voice */}
                        <div className="flex items-center gap-1.5 bg-[#0B0F19]/50 text-xs text-slate-300 p-2 rounded-lg border border-slate-700/50 hover:border-slate-500 transition-colors">
                            <input type="checkbox" checked={applyVoice} onChange={e => setApplyVoice(e.target.checked)} className="w-[14px] h-[14px] accent-indigo-500 cursor-pointer" title="Mở khóa gán Voice" />
                            <SearchableVoiceSelect
                                voices={voices.filter(v => v.language === script?.language)}
                                value={massVoice}
                                onChange={(val) => setMassVoice(val)}
                                disabled={!applyVoice}
                                playVoiceDemo={playVoiceDemo}
                                className="bg-transparent focus:outline-none w-28 text-slate-200 font-medium"
                                defaultText="Chưa chọn"
                                globalPlayerId={globalPlayer?.id}
                            />
                        </div>

                        {/* Mass Emotion */}
                        <div className="flex items-center gap-1.5 bg-[#0B0F19]/50 text-xs text-slate-300 p-2 rounded-lg border border-slate-700/50 hover:border-slate-500 transition-colors">
                            <input type="checkbox" checked={applyEmotion} onChange={e => setApplyEmotion(e.target.checked)} className="w-[14px] h-[14px] accent-indigo-500 cursor-pointer" title="Mở khóa gán Cảm Xúc" />
                            <select
                                value={massEmotion}
                                onChange={e => setMassEmotion(e.target.value)}
                                disabled={!applyEmotion}
                                className="bg-transparent text-indigo-300 focus:outline-none w-28 font-bold text-[10px] disabled:opacity-40 appearance-none cursor-pointer"
                                title="Cảm Xúc"
                            >
                                {Array.from(new Set(['NEUTRAL', 'WHISPER', massEmotion, ...(voices.find(v => v.id === massVoice)?.samples?.map((s: any) => s.emotion.toUpperCase()) || [])])).filter(Boolean).map(emo => (
                                    <option key={emo} value={emo} className="bg-slate-900">{emo}</option>
                                ))}
                            </select>
                        </div>

                        {/* Mass Speed */}
                        <div className="flex items-center gap-1.5 bg-[#0B0F19]/50 text-xs text-slate-300 p-2 rounded-lg border border-slate-700/50 hover:border-slate-500 transition-colors">
                            <input type="checkbox" checked={applySpeed} onChange={e => setApplySpeed(e.target.checked)} className="w-[14px] h-[14px] accent-indigo-500 cursor-pointer" title="Mở khóa gán Speed" />
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Spd</span>
                            <input type="number" step="0.01" min="0.5" max="2.0" value={massSpeed} onChange={e => setMassSpeed(parseFloat(e.target.value) || 1)} disabled={!applySpeed} className="w-14 pl-1 bg-transparent text-center focus:outline-none disabled:opacity-40 font-mono" />
                        </div>

                        {/* Mass Pitch */}
                        <div className="flex items-center gap-1.5 bg-[#0B0F19]/50 text-xs text-slate-300 p-2 rounded-lg border border-slate-700/50 hover:border-slate-500 transition-colors">
                            <input type="checkbox" checked={applyPitch} onChange={e => setApplyPitch(e.target.checked)} className="w-[14px] h-[14px] accent-indigo-500 cursor-pointer" title="Mở khóa gán Pitch" />
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Pch</span>
                            <input type="number" step="0.01" min="0.5" max="2.0" value={massPitch} onChange={e => setMassPitch(parseFloat(e.target.value) || 1)} disabled={!applyPitch} className="w-14 pl-1 bg-transparent text-center focus:outline-none disabled:opacity-40 font-mono" />
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <button onClick={handleAutoInferEmotions} disabled={selectedIds.size === 0 || isProcessing} className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500 hover:text-white disabled:opacity-30 disabled:grayscale px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap" title="Tự động phân tích nội dung để ép mác cảm xúc (nếu Voice có Sample tương ứng)">
                                <Wand2 className="w-3.5 h-3.5" /> Nhận diện cảm xúc
                            </button>
                            <button onClick={() => setMergeModalOpen(true)} disabled={selectedIds.size === 0 || isProcessing} className="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 hover:bg-fuchsia-500 hover:text-white disabled:opacity-30 disabled:grayscale px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap" title="Ghép các câu đã chọn thành 1 file MP3 + SRT">
                                <Link className="w-3.5 h-3.5" /> Ghép Audio & SRT
                            </button>
                            <button onClick={handleMassApply} className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(99,102,241,0.4)] whitespace-nowrap">
                                Gán Cấu hình hàng loạt
                            </button>
                            <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0 || isProcessing} className="bg-red-600/30 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white disabled:opacity-30 disabled:grayscale px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap" title="Xóa tất cả các câu đã tick chọn">
                                <Trash2 className="w-3.5 h-3.5" /> Xóa Đã Chọn
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sentences List Area (Khu vực cuộn độc lập) */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-white/[0.01] border border-white/5 rounded-xl mt-2 p-2 md:p-3 pb-24 relative">
                <div className="flex flex-col gap-3">
                    {filteredSentences.length === 0 && (
                        <div className="text-center py-10 text-slate-500 italic text-sm">Không tìm thấy câu nào phù hợp với bộ lọc hiện tại.</div>
                    )}
                    {paginatedSentences.map((sentence, idx) => {
                        const isSelected = selectedIds.has(sentence.id);
                        const isProcessing = sentence.status === 'Processing' || sentence.status === 'Queued';
                        const voice = voices.find(v => v.id === sentence.voice_id);
                        const isVoiceVox = voice && (voice.voice_type === 'pure_tts' || (voice.name && voice.name.includes('[VoiceVox]')));
                        const isMissingSample = isSentenceMissingInfo(sentence);
                        return (
                            <div key={sentence.id} id={`sentence-${sentence.id}`} className="relative flex flex-col w-full group/row">
                                <div className={`flex gap-3 items-stretch rounded-xl border p-3 md:p-4 transition-colors ${isSelected ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-[#151B2B] border-slate-700'}`}>

                                    {/* 1. CHECKBOX MẶC ĐỊNH BÊN TRÁI CÙNG */}
<div className="w-8 flex flex-col items-center gap-1.5 pt-2 shrink-0" title="Chọn dòng này">
                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(sentence.id)} className="w-[18px] h-[18px] accent-emerald-500 rounded border-slate-600 cursor-pointer" />
                                            <span className="text-[11px] text-slate-500 font-bold">#{sentences.findIndex((s: any) => s.id === sentence.id) + 1}</span>
                                        </div>

                                        
{/* BÊN PHẢI: KHU VỰC HIỂN THỊ THÔNG TIN/TRẠNG THÁI */}
                                    <div className="flex flex-col justify-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700 shrink-0 w-[380px]">

                                        {/* Hàng 1: Giọng đọc & Cảm xúc */}
                                        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5 shrink-0">
                                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                                <Mic className="w-4 h-4 text-emerald-400 shrink-0" />
                                                {isOwner && sentence.voice_id && (
                                                    <button onClick={() => {
                                                          setEditingVoiceId(sentence.voice_id);
                                                          setEditingVoiceEmotion(isMissingSample ? sentence.emotion : null);
                                                      }} className="p-1 rounded bg-slate-700/50 hover:bg-indigo-500 text-slate-400 hover:text-white transition-colors group flex items-center justify-center shrink-0 shadow-sm border border-transparent hover:border-indigo-400" title="Chỉnh sửa chi tiết Giọng ảo, Upload Audio Sample">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <SearchableVoiceSelect
                                                    voices={voices.filter(v => v.language === script?.language)}
                                                    value={sentence.voice_id || ""}
                                                    onChange={async (val) => {
                                                        try {
                                                            const res = await api_tts.updateSentence(sentence.id, { voice_id: val });
                                                            setSentences(prev => prev.map(s => s.id === sentence.id ? res.data : s));
                                                        } catch (err: any) {
                                                            toast.error("Đổi giọng thất bại: " + err.message);
                                                        }
                                                    }}
                                                    playVoiceDemo={playVoiceDemo}
                                                    className={`bg-transparent focus:outline-none w-44 truncate text-slate-200 font-medium ${!isOwner ? 'pointer-events-none opacity-80' : ''}`}
                                                    globalPlayerId={globalPlayer?.id}
                                                    disabled={!isOwner}
                                                />
                                            </div>
                                            <div className="flex items-center text-sm text-slate-300 relative group/emotion">
                                                <select
                                                    value={sentence.emotion || "NEUTRAL"}
                                                    onChange={async (e) => {
                                                        const val = e.target.value;
                                                        setSentences(sentences.map(s => s.id === sentence.id ? { ...s, emotion: val } : s));
                                                        try {
                                                            const res = await api_tts.updateSentence(sentence.id, { emotion: val });
                                                            setSentences(prev => prev.map(s => s.id === sentence.id ? res.data : s));
                                                        } catch (err: any) {
                                                            toast.error("Đổi cảm xúc thất bại: " + err.message);
                                                        }
                                                    }}
                                                    className={`bg-transparent text-indigo-400 font-bold uppercase text-[11px] focus:outline-none text-right min-w-[6rem] px-1 border-b border-transparent focus:border-indigo-500 transition-colors appearance-none shadow-sm ${!isOwner ? 'pointer-events-none opacity-80' : 'cursor-pointer'}`}
                                                    title="Chỉnh sửa Cảm Xúc"
                                                    disabled={!isOwner}
                                                >
                                                    {Array.from(new Set(['NEUTRAL', 'WHISPER', sentence.emotion, ...(voices.find(v => v.id === sentence.voice_id)?.samples?.map((s: any) => s.emotion.toUpperCase()) || [])])).filter(Boolean).map(emo => (
                                                        <option key={emo} value={emo} className="bg-slate-900">{emo}</option>
                                                    ))}
                                                </select>
                                                {isSentenceMissingInfo(sentence) && (
                                                    <span title={`CẢNH BÁO: ${getSentenceMissingReason(sentence)}. AI sẽ tự động trả về Neutral nếu bạn không khắc phục.`}>
                                                        <AlertCircle className={`w-4 h-4 shrink-0 ${getSentenceMissingReason(sentence)?.includes('Lỗi:') ? 'text-rose-500 animate-pulse' : 'text-yellow-500'}`} />
                                                    </span>
                                                )}
                                                <button onClick={() => playReferenceAudio(sentence)} className={`ml-1 p-1 rounded-full transition-all shrink-0 ${globalPlayer?.id === 'ref_demo_' + sentence.id ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-indigo-400 bg-white/5 hover:bg-slate-700'}`} title={globalPlayer?.id === 'ref_demo_' + sentence.id ? "Dừng phát" : "Nghe Giọng Mẫu (Demo / Cảm xúc)"}>
                                                    {globalPlayer?.id === 'ref_demo_' + sentence.id ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Hàng 2: Tốc độ, Độ cao & Trạng Thái/Player */}
                                        <div className="flex items-center justify-between shrink-0">
                                            <div className="flex gap-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-slate-500">SPD</span>
                                                    <input
                                                        type="number" step="0.01" min="0.5" max="2.0"
                                                        value={sentence.speed ?? 1.0}
                                                        onChange={(e) => setSentences(sentences.map(s => s.id === sentence.id ? { ...s, speed: parseFloat(e.target.value) || 1.0 } : s))}
                                                        onBlur={async (e) => {
                                                            const val = parseFloat(e.target.value) || 1.0;
                                                            try {
                                                                const res = await api_tts.updateSentence(sentence.id, { speed: val });
                                                                setSentences(prev => prev.map(s => s.id === sentence.id ? res.data : s));
                                                            } catch (err: any) {
                                                                toast.error("Cập nhật tốc độ thất bại");
                                                            }
                                                        }}
                                                        disabled={!isOwner}
                                                        className={`w-12 bg-[#0B0F19] border border-slate-600 rounded text-xs text-center text-white py-1 focus:border-indigo-400 outline-none ${!isOwner ? 'opacity-70 pointer-events-none' : ''}`}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-slate-500">PCH</span>
                                                    <input
                                                        type="number" step="0.01" min="0.5" max="2.0"
                                                        value={sentence.pitch ?? 1.0}
                                                        onChange={(e) => setSentences(sentences.map(s => s.id === sentence.id ? { ...s, pitch: parseFloat(e.target.value) || 1.0 } : s))}
                                                        onBlur={async (e) => {
                                                            const val = parseFloat(e.target.value) || 1.0;
                                                            try {
                                                                const res = await api_tts.updateSentence(sentence.id, { pitch: val });
                                                                setSentences(prev => prev.map(s => s.id === sentence.id ? res.data : s));
                                                            } catch (err: any) {
                                                                toast.error("Cập nhật độ cao thất bại");
                                                            }
                                                        }}
                                                        disabled={!isOwner}
                                                        className={`w-12 bg-[#0B0F19] border border-slate-600 rounded text-xs text-center text-white py-1 focus:border-indigo-400 outline-none ${!isOwner ? 'opacity-70 pointer-events-none' : ''}`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Trạng thái Icon & Player Buttons */}
                                            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
                                                {isProcessing ? (
                                                    <span title="Đang render..."><FileAudio className="w-5 h-5 text-yellow-400 animate-pulse" /></span>
                                                ) : sentence.status === 'Completed' || sentence.audio_path ? (
                                                    <span title="Hoàn thành"><FileAudio className="w-5 h-5 text-emerald-400" /></span>
                                                ) : sentence.status === 'Failed' ? (
                                                    <span title={sentence.error_message || "Lỗi!"}><FileWarning className="w-5 h-5 text-red-400" /></span>
                                                ) : (
                                                    <span title="Chưa render"><FileAudio className="w-5 h-5 text-slate-500" /></span>
                                                )}

                                                {sentence.status === 'Completed' && sentence.audio_path && (
                                                    <div className="flex gap-1.5">
                                                        <button onClick={() => {
                                                            if (globalPlayer?.id === sentence.id) setGlobalPlayer(null);
                                                            else playAudio(sentence);
                                                        }} className={`p-2 rounded-full ${globalPlayer?.id === sentence.id ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-slate-700 text-cyan-300 hover:bg-slate-600 scale-105 transition-transform'}`} title={globalPlayer?.id === sentence.id ? "Dừng phát" : "Phát audio"}>
                                                            {globalPlayer?.id === sentence.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                                                        </button>
                                                        <button onClick={() => handleDownloadSingle(sentence)} className="p-2 rounded-full bg-slate-700 text-emerald-400 hover:bg-slate-600 scale-105 transition-transform" title="Tải về">
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    
{/* 3. TEXTAREA VÀ THỜI GIAN BÊN TAY PHẢI */}
<div className="flex-1 flex flex-col gap-2 min-w-0">
                                            <div className="flex-1 relative">
                                                {sentence.character_name && (
                                                    <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded shadow-md z-10 border border-indigo-400/50 uppercase tracking-wider">
                                                        {sentence.character_name}
                                                    </div>
                                                )}
                                                <textarea
                                                    value={dirtyTexts[sentence.id] !== undefined ? dirtyTexts[sentence.id] : (sentence.text || "")}
                                                    onChange={(e) => {
                                                        if (!isOwner) return;
                                                        const newVal = e.target.value;
                                                        if (newVal === sentence.text) {
                                                            handleDiscardText(sentence.id);
                                                        } else {
                                                            setDirtyTexts(prev => ({ ...prev, [sentence.id]: newVal }));
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        if (!isOwner) return;
                                                        const currentDirty = dirtyTexts[sentence.id];
                                                        if (currentDirty !== undefined && currentDirty !== sentence.text) {
                                                            openConfirm(
                                                                "Thay đổi chưa lưu",
                                                                "Bạn có muốn lưu lại nội dung vừa chỉnh sửa không?",
                                                                () => handleSaveSentenceText(sentence.id, currentDirty),
                                                                "info"
                                                            );
                                                        }
                                                    }}
                                                    readOnly={!isOwner}
                                                    className={`w-full bg-slate-900 border border-slate-600 rounded-lg p-3 pb-7 text-sm font-medium leading-relaxed text-slate-100 focus:border-indigo-500 focus:shadow-[0_0_10px_rgba(99,102,241,0.3)] resize-y overflow-y-auto min-h-[88px] transition-all ${!isOwner ? 'pointer-events-none' : ''}`}
                                                />

                                                <AnimatePresence>
                                                    {dirtyTexts[sentence.id] !== undefined && (
                                                        <motion.button
                                                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                                            onClick={() => handleSaveSentenceText(sentence.id, dirtyTexts[sentence.id])}
                                                            className="absolute top-2 right-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow-xl border border-emerald-400/30 flex items-center gap-1 z-10"
                                                        >
                                                            <Save className="w-3 h-3" /> Lưu thay đổi
                                                        </motion.button>
                                                    )}
                                                </AnimatePresence>

                                                <div className={`absolute bottom-2 right-3 text-[10px] font-mono font-bold tracking-wider ${sentence.text?.length >= MAX_TTS_LENGTH ? 'text-rose-400 drop-shadow-[0_0_3px_rgba(244,63,94,0.6)]' : 'text-slate-500'}`} title="Số lượng ký tự / Tối đa">
                                                    {(dirtyTexts[sentence.id] !== undefined ? dirtyTexts[sentence.id].length : (sentence.text?.length || 0))} / {MAX_TTS_LENGTH}
                                                </div>
                                            </div>

                                            {/* Thời gian hiển thị FULL Dưới Textarea */}
                                            <div className="w-full flex items-center justify-between text-[11px] text-slate-500 font-mono tracking-tight px-1 mt-auto">
                                                <span>Tạo: {sentence.created_at ? new Date(sentence.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '--'}</span>
                                                <div className="flex gap-3 items-center">
                                                    {sentence.audio_duration ? <span className="text-fuchsia-400 font-bold">Thời lượng: {sentence.audio_duration.toFixed(2)}s</span> : null}
                                                    {sentence.render_end_time && <span className="text-emerald-400/80 font-bold">Xong: {new Date(sentence.render_end_time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>}
                                                </div>
                                            </div>
                                        </div>
{/* BÊN PHẢI NGOÀI CÙNG: ACTIONS LỚN HƠN */}
                                    {isOwner && (
                                    <div className="flex flex-col shrink-0 gap-2 w-12">
                                        {(isProcessing || sentence.status === 'Queued') ? (
                                            <button onClick={() => handleCancelSentence(sentence.id)} className="flex-1 flex items-center justify-center bg-red-600/30 text-red-500 border border-red-500/50 hover:bg-red-500/50 hover:text-white rounded-xl transition-all shadow-md" title="Dừng Render">
                                                <Square className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <button onClick={() => handleRenderSentence(sentence.id)} disabled={isProcessing || !sentence.voice_id} className="flex-1 flex items-center justify-center bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/50 hover:text-white rounded-xl disabled:opacity-20 disabled:grayscale transition-all shadow-md" title="Render Dòng Này">
                                                <Cpu className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button onClick={() => handleAddSentenceQuick(sentence.order_index + 1, sentence.text, sentence.voice_id, sentence.emotion, sentence.speed, sentence.pitch)} className="flex-1 flex items-center justify-center bg-slate-700/80 text-cyan-400 border border-slate-600 hover:text-white hover:bg-cyan-600 rounded-xl transition-all shadow-md" title="Nhân bản (Duplicate)">
                                            <Copy className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDeleteSentence(sentence.id)} className="flex-1 flex items-center justify-center bg-slate-700/80 text-rose-400 border border-slate-600 hover:text-white hover:bg-rose-600 rounded-xl transition-all shadow-md" title="Xóa bỏ dứt điểm">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                    )}
                                </div>

                                {/* In-between Add Trigger */}
                                {isOwner && (
                                    <div className="absolute -bottom-[0.375rem] left-0 right-0 h-3 flex justify-center items-center opacity-0 hover:opacity-100 z-50">
                                    <div className="absolute w-[95%] h-[1px] bg-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,1)]" />
                                    <button onClick={() => handleAddSentenceQuick(sentence.order_index + 1)} className="bg-emerald-500 text-white p-1 rounded-full relative z-20 shadow-xl hover:bg-emerald-400 hover:scale-110 transition-transform" title="Chèn câu tiếp theo">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                    </div>
                                    )}
                                </div>
                        )
                    })}
                    {filteredSentences.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-20 text-slate-500">
                            <FileText className="w-12 h-12 mb-4 opacity-50" />
                            <p>Không có câu nào để hiển thị.</p>
                            {isOwner && (
                                <button onClick={() => handleAddSentenceQuick(1)} className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-bold text-sm">Thêm dòng mới</button>
                            )}
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 py-8">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-4 py-2 bg-[#1A2234] border border-slate-700 hover:bg-slate-700 text-cyan-300 font-bold rounded-lg disabled:opacity-30 disabled:grayscale transition-all shadow-lg">&larr; Trang trước</button>
                        <span className="text-sm text-slate-400 font-medium bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">Trang <strong className="text-white">{currentPage}</strong> / <strong className="text-white">{totalPages}</strong></span>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-4 py-2 bg-[#1A2234] border border-slate-700 hover:bg-slate-700 text-cyan-300 font-bold rounded-lg disabled:opacity-30 disabled:grayscale transition-all shadow-lg">Trang sau &rarr;</button>
                    </div>
                )}
            </div>

            {globalPlayer && (
                <motion.div
                    initial={{ y: 100 }} animate={{ y: 0 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl flex items-center gap-4 w-[90%] max-w-2xl z-[100]"
                >
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <Volume2 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{globalPlayer.title}</p>
                        <audio
                            key={globalPlayer.url}
                            src={globalPlayer.url}
                            controls
                            autoPlay
                            onEnded={handleAudioEnded}
                            className="w-full h-8 mt-1 outline-none"
                        />
                    </div>
                    <button onClick={() => setGlobalPlayer(null)} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-lg shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </motion.div>
            )}

            {/* Wizard Modal */}
            <AnimatePresence>
                {wizardOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-slate-700/80 bg-slate-800/50">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-purple-400" /> Wizard Kịch Bản Tổng</h3>
                                <button onClick={() => setWizardOpen(false)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="p-4 md:p-6 overflow-y-auto flex-1">
                                {wizardStep === 1 ? (
                                    <div className="flex flex-col gap-3 h-full">
                                        <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded-xl mb-1 border border-slate-700/50">
                                            <div className="flex gap-2 text-sm font-medium">
                                                <button onClick={() => setWizardMode("Dialogue")} className={`px-3 py-1.5 rounded-lg transition-colors ${wizardMode === "Dialogue" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>Hội thoại (Theo dòng)</button>
                                                <button onClick={() => setWizardMode("Story")} className={`px-3 py-1.5 rounded-lg transition-colors ${wizardMode === "Story" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}>Kể truyện (Dồn đoạn)</button>
                                            </div>
                                            <div className="text-xs text-slate-500 max-w-[200px] text-right">
                                                {wizardMode === "Dialogue" ? "Cắt nhỏ từng dòng. Yêu cầu ngoặc 「」." : `Gom câu tới giới hạn ${script?.chunk_limit || TTS_CHUNK_LIMIT}.`}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-400">Dán toàn bộ kịch bản vào đây. Cú pháp bắt buộc: Tên nhân vật chốt bằng <code>:</code>. Cảm xúc gói trong <code>{`{...}`}</code>. Lời thoại (tùy chọn) có thể bọc trong <code>{`[...]`}</code> hoặc <code>{`「...」`}</code>.</p>
                                        <textarea
                                            value={wizardText} onChange={e => setWizardText(e.target.value)}
                                            placeholder="Ông Huyện:{cáu kỉnh}「Cái gì? Nó bảo sao!」\nNgười hầu: {sợ hãi} Dạ bẩm..."
                                            className="flex-1 min-h-[300px] w-full bg-[#0B0F19] border border-slate-700 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 resize-none font-mono"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-6 min-h-[400px]">
                                        <p className="text-sm text-slate-400">Đã phát hiện <strong>{wizardCharacters.length}</strong> nhân vật. Vui lòng gán Giọng đọc (Voice) cho họ.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">
                                            {wizardCharacters.map(c => (
                                                <div key={c} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4 relative">
                                                    <span className="font-bold text-slate-200 truncate flex-1" title={c}>{c}</span>
                                                    <SearchableVoiceSelect
                                                        voices={voices.filter(v => v.language === script?.language)}
                                                        value={wizardVoiceMap[c] || ""}
                                                        onChange={(val) => setWizardVoiceMap({ ...wizardVoiceMap, [c]: val })}
                                                        playVoiceDemo={playVoiceDemo}
                                                        className="w-48 bg-[#0B0F19] border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none"
                                                        globalPlayerId={globalPlayer?.id}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-700/80 bg-slate-800/30 flex justify-end gap-3 flex-shrink-0">
                                {wizardStep === 1 ? (
                                    <button onClick={handleWizardAnalyze} disabled={isWizardProcessing} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex gap-2 items-center">
                                        {isWizardProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Giai đoạn 1: Phân Tích Nhân Vật"} <ArrowRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => setWizardStep(1)} className="px-5 py-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors font-bold">Quay lại</button>
                                        <button onClick={confirmWizardImport} disabled={isWizardProcessing} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex gap-2 items-center">
                                            {isWizardProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Giai đoạn 2: Tự Động Tách Câu & Lưu"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {confirm.show && (
                    <ConfirmDialog
                        title={confirm.title}
                        message={confirm.message}
                        onConfirm={() => { confirm.onConfirm(); setConfirm(prev => ({ ...prev, show: false })) }}
                        onCancel={() => setConfirm(prev => ({ ...prev, show: false }))}
                        type={confirm.type}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {wizardMissingConfirm.show && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
                            <h3 className="text-xl font-bold text-yellow-500 flex items-center gap-2 mb-4"><FileWarning className="w-6 h-6" /> Tùy Chọn Cảm Xúc</h3>
                            <p className="text-sm text-slate-300 mb-3 leading-relaxed">Hệ thống phát hiện một số cảm xúc bạn định sử dụng chưa có Audio mẫu trong Giọng đọc tương ứng:</p>
                            <pre className="bg-black/50 border border-black/50 p-3 rounded-lg text-rose-400 text-xs mb-5 whitespace-pre-wrap">{wizardMissingConfirm.logs.join('\n')}</pre>
                            <p className="text-sm text-slate-300 mb-6 leading-relaxed">Bạn có muốn hệ thống tự làm phẳng những chỗ này về cảm xúc tiêu chuẩn (Normal/neutral) không?</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => { setWizardMissingConfirm({ show: false, logs: [] }); handleWizardImport(true); }} className="px-4 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm">Có! Hãy tự thế bằng Normal</button>
                                <button onClick={() => { setWizardMissingConfirm({ show: false, logs: [] }); handleWizardImport(false); }} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl transition-all border border-slate-700 text-sm shadow-md">Không, Giữ nguyên (Tôi sẽ tạo Sample sau)</button>
                                <button onClick={() => setWizardMissingConfirm({ show: false, logs: [] })} className="px-4 py-2 mt-2 bg-transparent hover:bg-white/5 text-slate-500 hover:text-slate-300 font-bold text-xs rounded-xl transition-colors uppercase tracking-widest">Hủy & Trở Lại</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {playAllModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 relative shadow-2xl">
                            <h3 className="text-xl font-bold text-indigo-400 flex items-center gap-2 mb-4"><Volume2 className="w-5 h-5" /> Phát Tuần Tự</h3>
                            <p className="text-sm text-slate-300 mb-6 leading-relaxed">Hệ thống sẽ tự động phát lần lượt các đoạn âm thanh đã Render thành công.</p>

                            <div className="flex flex-col gap-4 mb-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Khoảng Nghỉ (ms)</label>
                                    <input type="number" step="100" min="0" value={autoPlayGap} onChange={e => setAutoPlayGap(Number(e.target.value) || 0)} className="w-full bg-[#0B0F19] border border-slate-700/80 rounded-xl p-3 text-white focus:border-indigo-500 font-mono" />
                                </div>
                                <p className="text-[11px] text-slate-500 italic leading-relaxed">Khoảng thời gian chờ (mili-giây) tính từ khi đọc xong câu trước đến lúc bắt đầu câu sau. Nhập 0 để máy đọc liên tục.</p>
                            </div>

                            <div className="flex gap-3 justify-end mt-4">
                                <button onClick={() => setPlayAllModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all">Hủy</button>
                                <button onClick={handlePlayAllConfirm} className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all">Bắt đầu phát</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {mergeModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 relative shadow-2xl">
                            <h3 className="text-xl font-bold text-fuchsia-400 flex items-center gap-2 mb-4"><Link className="w-5 h-5" /> Ghép Audio & SRT</h3>
                            <p className="text-sm text-slate-300 mb-6 leading-relaxed">Hệ thống sẽ ghép tất cả các câu đã hoàn thành mà bạn vừa chọn thành 1 file MP3 và tạo file SRT tương ứng.</p>

                            <div className="flex flex-col gap-4 mb-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Khoảng câm TỐI THIỂU (ms)</label>
                                    <input type="number" step="100" min="0" value={mergeGapMin} onChange={e => setMergeGapMin(Number(e.target.value) || 0)} className="w-full bg-[#0B0F19] border border-slate-700/80 rounded-xl p-3 text-white focus:border-fuchsia-500 font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Khoảng câm TỐI ĐA (ms)</label>
                                    <input type="number" step="100" min="0" value={mergeGapMax} onChange={e => setMergeGapMax(Number(e.target.value) || 0)} className="w-full bg-[#0B0F19] border border-slate-700/80 rounded-xl p-3 text-white focus:border-fuchsia-500 font-mono" />
                                </div>
                                <p className="text-[11px] text-slate-500 italic leading-relaxed">Hệ thống sẽ lấy ngẫu nhiên 1 khoảng câm trong ngưỡng này để chèn vào giữa các audio, giúp nhịp điệu tự nhiên hơn.</p>
                            </div>

                            <div className="flex gap-3 justify-end mt-4">
                                <button onClick={() => setMergeModalOpen(false)} disabled={isProcessing} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all disabled:opacity-50">Hủy</button>
                                <button onClick={handleMerge} disabled={isProcessing} className="px-5 py-2 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(217,70,239,0.3)] transition-all flex items-center gap-2">
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Bắt đầu Ghép
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {batchProgress && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(99,102,241,0.2)]"
                        >
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                                <svg className="w-full h-full -rotate-90">
                                    <circle
                                        cx="48" cy="48" r="44"
                                        fill="transparent"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        strokeDasharray={276}
                                        strokeDashoffset={276 - (276 * batchProgress.current) / batchProgress.total}
                                        className="text-indigo-500 transition-all duration-500"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-bold text-white">{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                                </div>
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2">Đang xử lý hàng loạt</h4>
                            <p className="text-sm text-slate-400 mb-1">{batchProgress.label}</p>
                            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-4">Vui lòng không đóng trình duyệt</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {editingVoiceId && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-3xl max-h-[90vh] bg-[#0F1423] rounded-2xl shadow-2xl border border-slate-700 relative flex flex-col overflow-hidden">
                                <div className="flex justify-between items-center px-5 py-3 border-b border-white/10 shrink-0 bg-[#0B0F19] shadow-sm z-30">
                                    <h3 className="text-slate-300 font-bold text-[13px] tracking-wide uppercase">Hồ sơ Giọng đọc (Voice Profile)</h3>
                                    <button onClick={() => { setEditingVoiceId(null); setGlobalPlayer(null); }} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0F1423]">
                                  {voices.find(v => v.id === editingVoiceId) ? (
                                    <VoiceCard voice={voices.find(v => v.id === editingVoiceId)!} expectedEmotion={editingVoiceEmotion} reload={loadVoices} onOpenDetail={() => {}} setConfirmDialog={(obj: any) => {
                                        if (!obj) {
                                            setConfirmDialog((prev: any) => ({ ...prev, show: false }));
                                        } else {
                                            setConfirmDialog({
                                                show: true,
                                                title: obj.title,
                                                message: obj.msg,
                                                onConfirm: () => {
                                                    if (obj.action) obj.action();
                                                    else setConfirmDialog((prev: any) => ({ ...prev, show: false }));
                                                },
                                                onCancel: () => {
                                                    if (obj.onCancel) obj.onCancel();
                                                    setConfirmDialog((prev: any) => ({ ...prev, show: false }));
                                                },
                                                hideCancel: obj.hideCancel || false,
                                                type: obj.type || 'info'
                                            });
                                        }
                                    }} />
                                ) : (
                                    <div className="p-8 text-center text-slate-500">
                                        Không tìm thấy giọng này. Vui lòng tắt và mở lại.
                                    </div>
                                )}
                                </div>
                            </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    )
}
