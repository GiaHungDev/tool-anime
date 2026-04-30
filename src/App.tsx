import { useState, useEffect, useRef } from 'react';
import { User, LogOut, FileText, Blocks, Users, Image as ImageIcon, Film, ChevronLeft, ChevronRight, Key, Mic, FileAudio, Play, Pause, X, Volume2, FolderOpen } from 'lucide-react'
import NanoBananaProMode from './components/NanoBananaProMode'
import IngredientToVideoMode from './components/IngredientToVideoMode'
import TextToVideoMode from './components/TextToVideoMode'
import LoginModal from './components/LoginModal'
import { authService } from './services/authService'
import AutoMergeVideoMode from './components/AutoMergeVideoMode'
import { TTSVoicesPage } from './components/TTSVoicesMode'
import { TTSScriptsPage } from './components/TTSScriptsMode'
import { GlobalAudioContext } from './contexts/GlobalAudioContext';
import { Toaster } from 'react-hot-toast';
import { useProject } from './contexts/ProjectContext';
import ProjectDashboard from './components/ProjectDashboard';
import ProjectWorkspace from './components/ProjectWorkspace';

function App() {
  const { currentProject, setCurrentProject } = useProject();
  const [activeMode, setActiveMode] = useState('nanobanana');
  const [auth, setAuth] = useState(authService.getLoginStatus());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [globalApiKey, setGlobalApiKey] = useState(() => localStorage.getItem('tool_gemini_api_key') || '');
  const [globalPlayer, setGlobalPlayer] = useState<{ url: string, title: string, id: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (globalPlayer && audioRef.current) {
      audioRef.current.src = globalPlayer.url;
      audioRef.current.play().catch(e => console.error("Playback failed:", e));
      setIsPlaying(true);
    } else if (!globalPlayer && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [globalPlayer]);

  // Cập nhật localStorage mỗi khi nhập Key
  useState(() => {
    // Để có thể giữ giá trị localStorage được cập nhật đồng bộ,
    // ta nên bọc nó trong useEffect, nhưng có thể dùng hàm setState trực tiếp.
  });
  
  const handleApiKeyChange = (val: string) => {
    setGlobalApiKey(val);
    localStorage.setItem('tool_gemini_api_key', val);
  };

  const handleLoginSuccess = (username: string) => {
    setAuth({
      isLoggedIn: true,
      token: localStorage.getItem('access_token') || '',
      username
    });
  };

  const handleLogout = async () => {
    await authService.logout();
    setAuth({ isLoggedIn: false, token: null, username: null });
  };

  return (
    <>
    <GlobalAudioContext.Provider value={{ globalPlayer, setGlobalPlayer }}>
      <Toaster position="top-right" />
      {!auth.isLoggedIn && <LoginModal onLoginSuccess={handleLoginSuccess} />}
      <div className="flex flex-col h-screen overflow-hidden space-bg text-gray-100 font-sans">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-black/20 backdrop-blur-md border-b border-white/10 shrink-0 z-20">
          <div className="flex items-center">
            <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-orange-300 via-fuchsia-400 to-purple-400 uppercase cursor-pointer" onClick={() => setCurrentProject(null)}>
              FLOW AI
            </h1>
          </div>
          {currentProject && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
              <span className="text-gray-400 text-sm">Dự án:</span>
              <span className="text-fuchsia-300 font-bold">{currentProject.name}</span>
              <div className="w-px h-4 bg-white/20 mx-1"></div>
              <button onClick={() => setCurrentProject(null)} className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/5">
                <FolderOpen size={14} /> Chọn dự án khác
              </button>
            </div>
          )}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-fuchsia-500/50 transition-colors hidden sm:flex">
              <Key size={16} className="text-gray-400" />
              <input 
                type="password" 
                value={globalApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Gemini API Key"
                className="bg-transparent text-sm text-gray-200 focus:outline-none w-28 focus:w-48 transition-all"
              />
            </div>
            <div className="flex items-center space-x-3 cursor-pointer hover:bg-white/10 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-white/10">
              <div className="bg-purple-900/50 p-2 rounded-full text-purple-300">
                <User size={20} />
              </div>
              <span className="font-medium text-sm text-gray-200">{auth.username || 'User'}</span>
            </div>
            <button onClick={handleLogout} className="flex items-center space-x-2 text-gray-400 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20">
              <LogOut size={18} />
              <span className="font-medium text-sm">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Body Area */}
        {!currentProject ? (
          <ProjectDashboard />
        ) : (
          <div className="flex-1 overflow-hidden relative z-10 flex flex-col w-full">
            <ProjectWorkspace />
          </div>
        )}
      </div>
      
      {/* Global Audio Player UI */}
      {globalPlayer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-[#161B2E]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-indigo-500/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPlaying ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300'}`}>
                  <Volume2 size={18} />
               </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Đang phát audio</p>
              <h4 className="text-sm font-bold text-white truncate">{globalPlayer.title}</h4>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (audioRef.current) {
                    if (isPlaying) audioRef.current.pause();
                    else audioRef.current.play();
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="w-10 h-10 rounded-full bg-white text-[#161B2E] flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
              
              <button 
                onClick={() => setGlobalPlayer(null)}
                className="w-10 h-10 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <audio 
              ref={audioRef} 
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        </div>
      )}
    </GlobalAudioContext.Provider>
    </>
  )
}

export default App
