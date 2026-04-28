import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ImageIcon, Pencil, X, Mic } from 'lucide-react';
import { GlobalAudioContext } from '../contexts/GlobalAudioContext';
import { resolveImageUrl } from '../utils/urlUtils';
import { cleanVoiceName } from '../utils/system_presets';
import { authService } from '../services/authService';
import { api_tts } from '../services/api_tts';
import toast from 'react-hot-toast';

interface VoiceCardProps {
    voice: any;
    reload: () => void;
    setConfirmDialog: any;
    onOpenDetail: (voice: any) => void;
    expectedEmotion?: string | null;
}

export function VoiceCard({ voice, reload, onOpenDetail, expectedEmotion }: VoiceCardProps) {
    if (!voice) return null;
    const context = useContext(GlobalAudioContext);
    const globalPlayer = context?.globalPlayer;
    const setGlobalPlayer = context?.setGlobalPlayer || (() => {});
    
    const userId = authService.getCurrentUserId();
    const username = localStorage.getItem('username');
    const currentRole = localStorage.getItem('svc_role') || 'user';
    const isOwner = currentRole === 'admin' || voice.ownerID === userId || voice.user_id === userId || voice.user_id === username;

    const getDisplayUrl = () => {
        if (voice.imageUrl || voice.exteriorUrl) {
            return resolveImageUrl(voice.imageUrl || voice.exteriorUrl);
        }
        if (voice.avatar_path) {
            // Check if it's already an absolute URL (just in case)
            if (voice.avatar_path.startsWith('http')) return voice.avatar_path;
            return `${import.meta.env.VITE_SVC_API_URL}/api/tts_static/${voice.avatar_path}`;
        }
        return '';
    };
    const displayUrl = getDisplayUrl();
    const isExterior = !!voice.exteriorUrl && !voice.imageUrl;
    const displayName = cleanVoiceName(voice.name || 'Không tên');

    const handlePlayDemo = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        let url = '';
        if (voice.demo_audio_path) {
            url = `${voice.demo_audio_path}?ts=${Date.now()}`;
        } else if (voice.samples?.length > 0 && voice.samples[0].audio_path) {
            const firstSample = voice.samples[0];
            const isBoolTrue = firstSample.audio_path === true || firstSample.audioPath === true;
            
            if (isBoolTrue) {
                const token = localStorage.getItem('svc_access_token') || localStorage.getItem('access_token');
                url = `${import.meta.env.VITE_SVC_API_URL}/api/tts/stream?sample_id=${firstSample.id}&token=${token}&ts=${Date.now()}`;
            } else {
                url = `${firstSample.audio_path || firstSample.audioPath}?ts=${Date.now()}`;
            }
        } else {
            return;
        }

        if (globalPlayer?.url === url) {
            setGlobalPlayer(null);
        } else {
            setGlobalPlayer({ url, title: `Demo: ${displayName}`, id: voice.id });
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân vật "${displayName}" không?`)) return;
        
        try {
            await api_tts.deleteVoice(voice.id);
            toast.success("Đã xóa nhân vật");
            reload();
        } catch (error) {
            toast.error("Lỗi khi xóa nhân vật");
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-[#1E2538] rounded-3xl overflow-hidden border border-white/5 hover:border-indigo-500/30 transition-all duration-300 shadow-xl hover:shadow-indigo-500/10"
        >
            {/* Image Preview Container */}
            <div className="relative aspect-video w-full overflow-hidden bg-[#0F1423] flex items-center justify-center">
                {displayUrl ? (
                        <img 
                            src={displayUrl} 
                            alt={displayName} 
                            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
                            style={{ imageRendering: '-webkit-optimize-contrast' }}
                        />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-500/5">
                        <ImageIcon className="w-12 h-12 text-indigo-500/20" />
                    </div>
                )}


                {/* Label Overlay */}
                <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                        {isExterior ? 'Ngoại cảnh' : 'Nhân vật'}
                    </span>
                </div>

                {/* Delete Button (Owner Only) - Top Right */}
                {isOwner && (
                    <button 
                        onClick={handleDelete}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl z-20 hover:scale-110"
                        title="Xóa nhân vật"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Content Footer */}
            <div className="p-5 flex items-center justify-between bg-gradient-to-b from-transparent to-black/40">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h3 className="font-bold text-white truncate text-lg tracking-tight">
                            {displayName}
                        </h3>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                        Nguồn: <span className="text-slate-300">{voice.source === 'upload' ? 'Tải lên' : 'Hệ thống'}</span>
                    </p>
                </div>

                <button 
                    onClick={() => onOpenDetail(voice)}
                    className="bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 hover:border-purple-400 text-purple-300 hover:text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all shadow-lg active:scale-95 flex items-center gap-2"
                >
                    {isExterior ? (
                        <><Pencil className="w-3.5 h-3.5" /> SỬA</>
                    ) : (
                        <><Mic className="w-3.5 h-3.5" /> THÊM VOICE</>
                    )}
                </button>
            </div>
        </motion.div>
    );
}

