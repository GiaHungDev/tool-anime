import { useState, useEffect, useRef } from 'react';
import { User, LogOut, FileText, Blocks, Users, Image as ImageIcon, Film, ChevronLeft, ChevronRight, Key, Mic, FileAudio, Play, Pause, X, Volume2 } from 'lucide-react'
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

function App() {
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
      <div className="flex flex-col min-h-screen space-bg text-gray-100 font-sans">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-black/20 backdrop-blur-md border-b border-white/10 shrink-0 z-20">
          <div className="flex items-center">
            <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-orange-300 via-fuchsia-400 to-purple-400 uppercase">
              FLOW AI
            </h1>
          </div>
          <div className="flex items-center space-x-6">
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
        <div className="flex flex-1 overflow-hidden relative z-10">
          {/* Sidebar (Approx 25%) */}
          <aside className={`bg-black/20 backdrop-blur-md border-r border-white/10 overflow-hidden shrink-0 flex flex-col shadow-xl z-20 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-[88px] p-3' : 'w-[280px] p-4'}`}>
            <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden pr-2 -mr-2 pb-4 min-h-0">
              <div className={`flex items-center mb-6 w-full shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'justify-center mt-2' : 'justify-between px-2'}`}>
              <div className={`text-xs font-semibold text-purple-300/70 uppercase tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
                AI GENERATION
              </div>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
                title={isSidebarCollapsed ? "Mở rộng" : "Thu gọn"}
              >
                {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>
            <nav className="flex flex-col space-y-2 w-full">
              <button
                onClick={() => setActiveMode('text-to-video')}
                title={isSidebarCollapsed ? "Text to video" : ""}
                className={`flex items-center rounded-xl transition-all duration-300 group border ${isSidebarCollapsed ? 'justify-center p-3 w-[64px] mx-auto' : 'px-4 py-3.5 w-full'} ${activeMode === 'text-to-video' ? 'bg-white/15 border-purple-400/50' : 'hover:bg-white/10 border-transparent hover:border-purple-400/30'}`}
              >
                <div className="shrink-0 flex items-center justify-center">
                  <FileText className={`group-hover:text-fuchsia-300 transition-colors ${activeMode === 'text-to-video' ? 'text-fuchsia-300' : 'text-purple-400'}`} size={22} />
                </div>
                <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>Text to video</span>
              </button>

              <button
                onClick={() => setActiveMode('ingredients-to-video')}
                title={isSidebarCollapsed ? "Ingredients to Video" : ""}
                className={`flex items-center rounded-xl transition-all duration-300 group border ${isSidebarCollapsed ? 'justify-center p-3 w-[64px] mx-auto' : 'px-4 py-3.5 w-full'} ${activeMode === 'ingredients-to-video' ? 'bg-white/15 border-purple-400/50' : 'hover:bg-white/10 border-transparent hover:border-purple-400/30'}`}
              >
                <div className="shrink-0 flex items-center justify-center">
                  <Blocks className={`group-hover:text-fuchsia-300 transition-colors ${activeMode === 'ingredients-to-video' ? 'text-fuchsia-300' : 'text-purple-400/70'}`} size={22} />
                </div>
                <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>Ingredients to Video</span>
              </button>

              <button
                onClick={() => setActiveMode('nanobanana')}
                title={isSidebarCollapsed ? "Tạo ảnh nhân vật" : ""}
                className={`flex items-center rounded-xl transition-all duration-300 group border relative overflow-hidden ${isSidebarCollapsed ? 'justify-center p-3 w-[64px] mx-auto' : 'px-4 py-3.5 w-full'} ${activeMode === 'nanobanana' ? 'bg-indigo-900/40 border-indigo-400/50' : 'hover:bg-indigo-900/30 border-transparent hover:border-indigo-400/30'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent -translate-x-full group-hover:animate-shine"></div>
                <div className="shrink-0 flex items-center justify-center relative z-10">
                  <Users className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" size={22} />
                </div>
                <span className={`font-medium bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-300 group-hover:from-orange-300 group-hover:to-fuchsia-300 whitespace-nowrap overflow-hidden transition-all duration-300 relative z-10 ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>Tạo ảnh nhân vật</span>
              </button>


              <button
                onClick={() => setActiveMode('auto-merge')}
                title={isSidebarCollapsed ? "Ghép video tự động" : ""}
                className={`flex items-center rounded-xl transition-all duration-300 group border relative overflow-hidden ${isSidebarCollapsed ? 'justify-center p-3 w-[64px] mx-auto' : 'px-4 py-3.5 w-full'} ${activeMode === 'auto-merge' ? 'bg-blue-900/40 border-blue-400/50' : 'hover:bg-blue-900/30 border-transparent hover:border-blue-400/30'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent -translate-x-full group-hover:animate-shine"></div>
                <div className="shrink-0 flex items-center justify-center relative z-10">
                  <Film className={`transition-colors ${activeMode === 'auto-merge' ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'text-purple-400/70 group-hover:text-blue-400 group-hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]'}`} size={22} />
                </div>
                <span className={`font-medium bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-300 group-hover:from-blue-300 group-hover:to-cyan-300 whitespace-nowrap overflow-hidden transition-all duration-300 relative z-10 ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>Ghép video tự động</span>
              </button>

              <button
                onClick={() => setActiveMode('tts-voices')}
                title={isSidebarCollapsed ? "Kho Nhân vật" : ""}
                className={`flex items-center rounded-xl transition-all duration-300 group border relative overflow-hidden ${isSidebarCollapsed ? 'justify-center p-3 w-[64px] mx-auto' : 'px-4 py-3.5 w-full'} ${activeMode === 'tts-voices' ? 'bg-orange-900/40 border-orange-400/50' : 'hover:bg-orange-900/30 border-transparent hover:border-orange-400/30'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/10 to-transparent -translate-x-full group-hover:animate-shine"></div>
                <div className="shrink-0 flex items-center justify-center relative z-10">
                  <User className={`transition-colors ${activeMode === 'tts-voices' ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]' : 'text-purple-400/70 group-hover:text-orange-400 group-hover:drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]'}`} size={22} />
                </div>
                <span className={`font-medium bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-300 group-hover:from-orange-300 group-hover:to-orange-400 whitespace-nowrap overflow-hidden transition-all duration-300 relative z-10 ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>Kho Nhân vật</span>
              </button>

              <button
                onClick={() => setActiveMode('tts-scripts')}
                title={isSidebarCollapsed ? "Kịch bản TTS" : ""}
                className={`flex items-center rounded-xl transition-all duration-300 group border relative overflow-hidden ${isSidebarCollapsed ? 'justify-center p-3 w-[64px] mx-auto' : 'px-4 py-3.5 w-full'} ${activeMode === 'tts-scripts' ? 'bg-green-900/40 border-green-400/50' : 'hover:bg-green-900/30 border-transparent hover:border-green-400/30'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/10 to-transparent -translate-x-full group-hover:animate-shine"></div>
                <div className="shrink-0 flex items-center justify-center relative z-10">
                  <FileAudio className={`transition-colors ${activeMode === 'tts-scripts' ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'text-purple-400/70 group-hover:text-green-400 group-hover:drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]'}`} size={22} />
                </div>
                <span className={`font-medium bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-300 group-hover:from-green-300 group-hover:to-green-400 whitespace-nowrap overflow-hidden transition-all duration-300 relative z-10 ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>Kịch bản TTS</span>
              </button>
            </nav>

            {/* Nhập API Key ngay dưới Menu */}
            <div className={`transition-all duration-300 w-full ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden m-0 p-0' : 'opacity-100 mt-6'}`}>
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center gap-2 mb-3 px-2">
                  <Key size={14} className="text-purple-300/70" />
                  <span className="text-xs font-semibold text-purple-300/70 uppercase tracking-wider">GEMINI API KEY</span>
                </div>
                <div className="relative group w-full overflow-hidden rounded-xl bg-black/20 hover:bg-white/5 border border-white/10 focus-within:border-purple-400/50 focus-within:bg-white/10 transition-all duration-300 shadow-inner">
                  <input
                    type="password"
                    value={globalApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="w-full bg-transparent px-4 py-3.5 text-sm font-medium text-white outline-none relative z-10"
                  />
                  {!globalApiKey && (
                    <div className="absolute inset-y-0 left-4 right-2 max-w-full overflow-hidden flex items-center pointer-events-none z-0 mask-image-fade">
                      <span className="text-white/50 text-[13px] whitespace-nowrap animate-marquee-placeholder">
                        Nhập api key bắt buộc để sử dụng (Sao chép ý tưởng)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

          {/* Main Content (Approx 75%) */}
          <main key={auth.isLoggedIn ? 'in' : 'out'} className="flex-1 p-6 overflow-y-auto bg-black/10 flex flex-col">
            {activeMode === 'nanobanana' ? (
              <NanoBananaProMode />
            ) : activeMode === 'ingredients-to-video' ? (
              <IngredientToVideoMode />
            ) : activeMode === 'text-to-video' ? (
              <TextToVideoMode />
            ) : activeMode === 'auto-merge' ? (
              <AutoMergeVideoMode />
            ) : activeMode === 'tts-voices' ? (
              <TTSVoicesPage />
            ) : activeMode === 'tts-scripts' ? (
              <TTSScriptsPage />
            ) : (
              <div className="max-w-5xl mx-auto h-full w-full flex flex-col rounded-3xl border border-white/10 bg-black/20 backdrop-blur-xl shadow-2xl items-center justify-center text-center p-12 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-fuchsia-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-full shadow-[0_0_30px_rgba(192,132,252,0.15)] mb-6 relative z-10 backdrop-blur-md">
                  <FileText className="text-fuchsia-300" size={36} />
                </div>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-fuchsia-100 mb-3 relative z-10">Chế độ đang được chọn</h2>
                <p className="text-purple-200/60 max-w-md relative z-10 text-lg">Khu vực này sẽ hiển thị các công cụ và cấu hình tương ứng với chế độ được lựa chọn ở thanh menu bên trái.</p>
              </div>
            )}
          </main>
        </div>
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
