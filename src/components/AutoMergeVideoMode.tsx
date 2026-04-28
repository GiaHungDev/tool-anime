import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, PlaySquare, ShieldAlert, CheckCircle, PackageSearch, DownloadCloud, Library } from 'lucide-react';
import { API_URL, fetchWithAuth, authService } from '../services/authService';


export default function AutoMergeVideoMode() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ffmpegFound, setFfmpegFound] = useState<boolean | null>(null);
  const [combiningProject, setCombiningProject] = useState<string | null>(null);

  const [projectAudio, setProjectAudio] = useState<Record<string, string>>({});
  const [projectSrt, setProjectSrt] = useState<Record<string, string>>({});

  const isElectron = !!(window as any).ipcRenderer;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/veo3/video/all`);
      if (response.ok) {
        const json = await response.json();
        const list = Array.isArray(json) ? json : (json.data || []);
        // Lọc hiển thị theo User
        const ownerId = authService.getCurrentUserId();
        const filteredList = ownerId ? list.filter((row: any) => row.ownerID === ownerId || row.ownerId === ownerId) : list;
        setData(filteredList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (isElectron) {
      (window as any).ipcRenderer.invoke('check-ffmpeg').then((res: any) => {
        setFfmpegFound(res.found);
      });
    }
  }, []);

  // Format dataset
  const projects = useMemo(() => {
    const groups: Record<string, any[]> = {};
    data.forEach(item => {
      let pName = 'Dự Án Khác';
      let jobIdNum = 9999;
      if (item.metadata) {
        try {
          const parsed = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
          if (parsed.projectName) pName = parsed.projectName;
          if (parsed.jobId) {
            const m = String(parsed.jobId).match(/\d+/);
            if (m) jobIdNum = parseInt(m[0], 10);
          }
        } catch (e) { }
      }
      if (!groups[pName]) groups[pName] = [];
      groups[pName].push({ ...item, jobIdNum });
    });

    // Sort items within each project by jobIdNum
    Object.keys(groups).forEach(pName => {
      groups[pName].sort((a, b) => a.jobIdNum - b.jobIdNum);
    });

    return Object.entries(groups).map(([name, items]) => {
      const completed = items.filter(i => {
        const resultStr = i.videoURL || i.result || i.result_image || i.s3Key;
        return i.status === 'completed' || (i.status === 'Completed') || !!resultStr;
      });
      return {
        name,
        items,
        total: items.length,
        completed: completed.length,
        completedItems: completed
      };
    }).sort((a, b) => {
      if (a.name === 'Dự Án Khác') return 1;
      if (b.name === 'Dự Án Khác') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [data]);

  const handleCombine = async (projectName: string, completedItems: any[]) => {
    if (!isElectron) {
      alert('Tính năng ghép video chỉ hoạt động trên Ứng Dụng Desktop (Electron). Vui lòng sử dụng App!');
      return;
    }

    const audioPath = projectAudio[projectName] || null;
    const srtPath = projectSrt[projectName] || null;

    const urls: string[] = [];
    completedItems.forEach(item => {
      const resultStr = item.videoURL || item.result || item.result_image || item.s3Key;
      if (resultStr) {
        if (resultStr.startsWith('http') || resultStr.startsWith('data:')) {
          urls.push(resultStr);
        } else {
          const cleanKey = resultStr.startsWith('/') ? resultStr.substring(1) : resultStr;
          const baseUrl = import.meta.env.VITE_S3_BASE_URL;
          urls.push(`${baseUrl}${cleanKey}`);
        }
      }
    });

    if (urls.length === 0) {
      alert('Không tìm thấy link video cấu thành nào để ghép!');
      return;
    }

    setCombiningProject(projectName);
    try {
      // Gửi mảng urls cho Electron để tự động tải về thư mục tạm rồi ghép
      const res = await (window as any).ipcRenderer.invoke('execute-ffmpeg-combine-urls', {
        urls,
        projectName,
        audioPath,
        srtPath
      });
      if (res.success) {
        alert(`Ghép Video Thành Công!\nĐã lưu tại: ${res.filePath}`);
      } else if (res.canceled) {
        console.log('User canceled merge.');
      } else {
        alert(`Lỗi khi ghép video: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Lỗi ngoại lệ: ${err.message}`);
    } finally {
      setCombiningProject(null);
    }
  };

  const handleMergeFolderVideos = async () => {
    if (!isElectron) {
      alert('Tính năng ghép video chỉ hoạt động trên Ứng Dụng Desktop (Electron). Vui lòng sử dụng App!');
      return;
    }
    try {
      const folderPath = await (window as any).ipcRenderer?.invoke('select-directory');
      if (!folderPath) return;
      
      setIsLoading(true);
      
      const res = await (window as any).ipcRenderer.invoke('merge-videos-in-folder', { folderPath });
      if (res && res.success) {
        alert(`Ghép Video Thành Công!\nĐã lưu tại: ${res.filePath}`);
      } else {
        alert(`Lỗi ghép video: ${res?.error || 'Lỗi không xác định'}`);
      }
    } catch (e) {
      alert('Lỗi khi gọi tính năng ghép video (Tính năng chỉ hoạt động trên App)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFile = async (projectName: string, type: 'audio' | 'srt') => {
    const filters = type === 'audio'
      ? [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'aac'] }]
      : [{ name: 'Subtitles', extensions: ['srt'] }];

    const filePath = await (window as any).ipcRenderer.invoke('select-file', { filters });
    if (filePath) {
      if (type === 'audio') setProjectAudio(prev => ({ ...prev, [projectName]: filePath }));
      if (type === 'srt') setProjectSrt(prev => ({ ...prev, [projectName]: filePath }));
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header Info */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="flex justify-between items-center relative z-10">
          <div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-300 mb-1 flex items-center gap-2">
              <PlaySquare className="text-blue-300" /> Xưởng Ghép Phim
            </h2>
            <p className="text-sm text-gray-400">Các video được tạo sẽ gom nhóm tự động theo Tên Dự Án (ProjectName). Bạn có thể nối toàn bộ các đoạn video hoàn thành thành một file MP4 duy nhất.</p>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-3">
              <button onClick={handleMergeFolderVideos} className="flex items-center space-x-2 bg-gradient-to-r from-green-600/80 to-teal-600/80 hover:from-green-500 hover:to-teal-500 text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-lg shadow-teal-900/20">
                <Library size={16} />
                <span>Ghép Video Trong Thư Mục</span>
              </button>
              <button onClick={fetchData} className="flex items-center space-x-2 bg-indigo-600/80 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-lg shadow-indigo-900/20">
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                <span>Làm mới</span>
              </button>
            </div>
            {isElectron && ffmpegFound === false && (
              <div className="flex items-center space-x-1 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                <ShieldAlert size={12} /> <span>Lỗi thư viện FFMPEG (Vui lòng khởi động lại Tool)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl overflow-y-auto">
        {projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 min-h-[40vh]">
            <PackageSearch size={48} className="mb-4 opacity-30" />
            <p>Chưa có dự án nào được khởi tạo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-xl p-5 flex flex-col transition-colors group">
                <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-200 group-hover:text-indigo-300 transition-colors">{proj.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">Tổng cộng: {proj.total} scenes</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center space-x-1 bg-black/40 px-2 py-1 rounded text-xs font-medium">
                      <CheckCircle size={14} className={proj.completed === proj.total ? "text-green-500" : "text-yellow-500"} />
                      <span className={proj.completed === proj.total ? "text-green-400" : "text-yellow-400"}>
                        {proj.completed} / {proj.total} Xong
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-32 space-y-2 mb-4">
                  {proj.items.map((item: any, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-black/30 p-2 rounded">
                      <span className="text-gray-300 font-mono">{(item.metadata && (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata).jobId) || `Job_${i + 1}`}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${(item.status === 'completed' || item.status === 'Completed' || item.videoURL || item.result)
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        {(item.status === 'completed' || item.status === 'Completed' || item.videoURL || item.result) ? 'Hoàn Thành' : 'Đang xử lý'}
                      </span>
                    </div>
                  ))}
                </div>

                {isElectron && (
                  <div className="flex flex-col space-y-2 mb-4 bg-black/40 p-3 rounded text-xs border border-white/5">
                    <div className="flex justify-between items-center bg-fuchsia-900/20 p-2 rounded border border-fuchsia-500/20">
                      <button onClick={() => handleSelectFile(proj.name, 'srt')} className="px-3 py-1.5 bg-fuchsia-600/30 text-fuchsia-300 hover:bg-fuchsia-600/50 rounded transition-colors whitespace-nowrap border border-fuchsia-500/30 font-medium">1. Chọn Video Subtitle (.srt)</button>
                      <div className="flex items-center gap-2 overflow-hidden ml-3">
                        <span className="text-gray-400 truncate" title={projectSrt[proj.name]}>
                          {projectSrt[proj.name]
                            ? projectSrt[proj.name].split('\\').pop()
                            : 'Chưa chèn phụ đề'}
                        </span>
                        {projectSrt[proj.name] && <button onClick={() => setProjectSrt(prev => ({ ...prev, [proj.name]: '' }))} className="text-red-400 hover:text-red-300 ml-1 font-bold">✕</button>}
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-blue-900/20 p-2 rounded border border-blue-500/20">
                      <button onClick={() => handleSelectFile(proj.name, 'audio')} className="px-3 py-1.5 bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 rounded transition-colors whitespace-nowrap border border-blue-500/30 font-medium">2. Chọn Nhạc Tách Lời (.mp3)</button>
                      <div className="flex items-center gap-2 overflow-hidden ml-3">
                        <span className="text-gray-400 truncate" title={projectAudio[proj.name]}>
                          {projectAudio[proj.name]
                            ? projectAudio[proj.name].split('\\').pop()
                            : 'Chưa chèn nền nhạc'}
                        </span>
                        {projectAudio[proj.name] && <button onClick={() => setProjectAudio(prev => ({ ...prev, [proj.name]: '' }))} className="text-red-400 hover:text-red-300 ml-1 font-bold">✕</button>}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleCombine(proj.name, proj.completedItems)}
                  disabled={proj.completed === 0 || combiningProject === proj.name || ffmpegFound === false}
                  className={`mt-auto w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${combiningProject === proj.name
                    ? 'bg-indigo-600/50 text-white cursor-not-allowed opacity-80'
                    : proj.completed > 0 && ffmpegFound !== false
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-900/30'
                      : 'bg-white/10 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {combiningProject === proj.name ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Đang Download & Ghép...</span>
                    </>
                  ) : (
                    <>
                      <DownloadCloud size={16} />
                      <span>Ghép {proj.completed} Video Này</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
