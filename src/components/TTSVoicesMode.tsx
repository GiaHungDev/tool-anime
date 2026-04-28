import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, RefreshCw, Search, Grid, Image as ImageIcon, Sparkles, User, X } from 'lucide-react';
import { authService } from '../services/authService';
import { api_tts } from '../services/api_tts';
import { cleanVoiceName } from '../utils/system_presets';
import toast from 'react-hot-toast';

import { GlobalAudioContext } from '../contexts/GlobalAudioContext';
import { VoiceCard } from './VoiceCard';
import { CharacterDetailModal } from './CharacterDetailModal';

export function TTSVoicesPage() {
    const userId = authService.getCurrentUserId();
    const [voices, setVoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState<'character' | 'exterior'>('character');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [selectedCharacter, setSelectedCharacter] = useState<any | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [showAddVoice, setShowAddVoice] = useState(false);

    // Global Player from Context
    const context = useContext(GlobalAudioContext);
    const globalPlayer = context?.globalPlayer;
    const setGlobalPlayer = context?.setGlobalPlayer || (() => { });

    const loadVoices = async () => {
        setIsLoading(true);
        try {
            const res = await api_tts.getVoices();
            const voicesData = res.data || [];
            setVoices(voicesData);

            // Auto-refresh selected character if modal is open
            if (isDetailOpen && selectedCharacter) {
                const updated = voicesData.find((v: any) => v.id === selectedCharacter.id);
                if (updated) setSelectedCharacter(updated);
            }
        } catch (error: any) {
            console.error("Lỗi getVoices TTSVoicesMode:", error);
            toast.error("Lỗi tải danh sách: " + (error.message || JSON.stringify(error)));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (userId) loadVoices();
    }, [userId]);

    const filteredItems = voices.filter(v => {
        if (!v) return false;
        // Filter by tab
        const isExt = !!v.exteriorUrl && !v.imageUrl;
        if (activeTab === 'character' && isExt) return false;
        if (activeTab === 'exterior' && !isExt) return false;

        // Filter by search
        const cName = cleanVoiceName(v.name || '').toLowerCase();
        return cName.includes(searchTerm.toLowerCase());
    });

    const openDetail = (voice: any) => {
        setSelectedCharacter(voice);
        setIsDetailOpen(true);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden p-6 md:p-8 relative space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                        <User className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter mb-1 uppercase">K h o N h â n V ật</h2>
                        <p className="text-white text-xs font-vietnam font-medium uppercase tracking-widest opacity-80">
                            Quản lý nhân vật, ngoại cảnh & giọng nói mẫu
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-[#1E2538] p-1 rounded-2xl flex border border-white/5 shadow-inner">
                        <button
                            onClick={() => setActiveTab('character')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'character' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <User className="w-3.5 h-3.5" /> Nhân Vật
                        </button>
                        <button
                            onClick={() => setActiveTab('exterior')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'exterior' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <ImageIcon className="w-3.5 h-3.5" /> Ngoại Cảnh
                        </button>
                    </div>
                    <button onClick={loadVoices} className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl border border-white/5 transition-all">
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {/* <button 
                        onClick={() => setShowAddVoice(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-black shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> TẠO MỚI
                    </button> */}
                </div>
            </div>

            {/* Toolbar Area */}
            <div className="flex items-center gap-4 shrink-0">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-all duration-300" size={20} />
                    <input
                        type="text"
                        placeholder={`Tìm kiếm ${activeTab === 'character' ? 'nhân vật' : 'ngoại cảnh'}...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-[#1E2538] border border-white/5 focus:border-indigo-500/50 rounded-2xl pl-12 pr-4 py-4 text-white outline-none transition-all shadow-inner placeholder:text-slate-600"
                    />
                </div>
                <div className="flex bg-[#1E2538] p-1 rounded-2xl border border-white/5 shrink-0">
                    <button className="p-3 bg-white/5 text-indigo-400 rounded-xl shadow-lg border border-white/5"><Grid size={20} /></button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="aspect-[4/3] rounded-3xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 bg-white/20 rounded-[40px] border border-white/5 border-dashed">
                        <div className="p-6 bg-white/5 rounded-full"><Sparkles size={48} className="opacity-10" /></div>
                        <p className="font-bold tracking-widest uppercase text-xs opacity-50">Không tìm thấy {activeTab === 'character' ? 'nhân vật' : 'ngoại cảnh'} nào</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-24">
                        {filteredItems.map(item => (
                            <VoiceCard
                                key={item.id}
                                voice={item}
                                reload={loadVoices}
                                setConfirmDialog={() => { }}
                                onOpenDetail={openDetail}
                            />
                        ))}
                    </div>
                )}
            </div>


            {/* Detail Modal */}
            <CharacterDetailModal
                isOpen={isDetailOpen}
                onClose={() => {
                    setIsDetailOpen(false);
                    setGlobalPlayer(null);
                }}
                character={selectedCharacter}
                reload={loadVoices}
            />

            {/* Add Character Modal Placeholder (Can be integrated better later) */}
            {showAddVoice && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1E2538] p-8 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Tạo Mới</h3>
                            <button onClick={() => setShowAddVoice(false)}><X className="text-slate-500" /></button>
                        </div>
                        <p className="text-slate-400 text-sm mb-6">Chức năng tạo mới nhanh đang được hoàn thiện. Tạm thời bạn có thể dùng nút Sửa trên nhân vật sẵn có hoặc liên hệ admin.</p>
                        <button onClick={() => setShowAddVoice(false)} className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl">ĐÃ HIỂU</button>
                    </div>
                </div>
            )}
        </div>
    );
}


