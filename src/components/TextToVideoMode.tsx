import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, RotateCcw, Download, Image as ImageIcon, Save, Check, X, FileSpreadsheet, Plus, AlertCircle, ChevronDown, ChevronUp, Activity, PauseCircle, PlayCircle, Settings, Sparkles, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { API_URL, authService, fetchWithAuth } from '../services/authService';

const VOICE_OPTIONS = [
  { id: 'achernar', name: 'Achernar', description: 'Female, soft, high pitch', color: 'bg-gradient-to-br from-yellow-400 to-yellow-600' },
  { id: 'achird', name: 'Achird', description: 'Male, friendly, mid pitch', color: 'bg-gradient-to-br from-blue-800 to-blue-950' },
  { id: 'algenib', name: 'Algenib', description: 'Male, gravelly, low pitch', color: 'bg-gradient-to-br from-teal-300 to-teal-500' },
  { id: 'algieba', name: 'Algieba', description: 'Male, easy-going, mid-low pitch', color: 'bg-gradient-to-br from-purple-800 to-gray-800' },
  { id: 'alnilam', name: 'Alnilam', description: 'Male, firm, mid-low pitch', color: 'bg-gradient-to-br from-green-700 to-green-900' },
  { id: 'aoede', name: 'Aoede', description: 'Female, breezy, mid pitch', color: 'bg-gradient-to-br from-green-300 to-green-500' },
  { id: 'autonoe', name: 'Autonoe', description: 'Female, bright, mid pitch', color: 'bg-gradient-to-br from-purple-500 to-purple-700' },
  { id: 'callirrhoe', name: 'Callirrhoe', description: 'Female, easy-going, mid pitch', color: 'bg-gradient-to-br from-pink-600 to-red-800' },
  { id: 'charon', name: 'Charon', description: 'Male, informative, lower pitch', color: 'bg-gradient-to-br from-gray-500 to-gray-700' },
  { id: 'despina', name: 'Despina', description: 'Female, smooth, mid pitch', color: 'bg-gradient-to-br from-red-500 to-red-700' },
  { id: 'enceladus', name: 'Enceladus', description: 'Male, breathy, lower pitch', color: 'bg-gradient-to-br from-purple-200 to-purple-400' },
  { id: 'erinome', name: 'Erinome', description: 'Female, clear, mid pitch', color: 'bg-gradient-to-br from-orange-300 to-orange-500' },
  { id: 'fenrir', name: 'Fenrir', description: 'Male, excitable, younger pitch', color: 'bg-gradient-to-br from-blue-400 to-blue-600' },
  { id: 'gacrux', name: 'Gacrux', description: 'Female, mature, mid pitch', color: 'bg-gradient-to-br from-teal-700 to-teal-900' },
  { id: 'iapetus', name: 'Iapetus', description: 'Male, clear, mid-low pitch', color: 'bg-gradient-to-br from-teal-200 to-teal-400' },
  { id: 'kore', name: 'Kore', description: 'Female, firm, mid pitch', color: 'bg-gradient-to-br from-purple-700 to-purple-900' },
  { id: 'laomedeia', name: 'Laomedeia', description: 'Female, upbeat, mid-high pitch', color: 'bg-gradient-to-br from-green-500 to-green-700' },
  { id: 'leda', name: 'Leda', description: 'Female, youthful, mid-high pitch', color: 'bg-gradient-to-br from-green-300 to-green-500' },
  { id: 'orus', name: 'Orus', description: 'Male, firm, mid-low pitch', color: 'bg-gradient-to-br from-purple-500 to-purple-800' },
  { id: 'puck', name: 'Puck', description: 'Male, upbeat, mid pitch', color: 'bg-gradient-to-br from-pink-500 to-pink-700' },
  { id: 'pulcherrima', name: 'Pulcherrima', description: 'Ungendered, forward, mid-high pitch', color: 'bg-gradient-to-br from-purple-300 to-purple-500' },
  { id: 'rasalgethi', name: 'Rasalgethi', description: 'Male, informative, mid pitch', color: 'bg-gradient-to-br from-red-500 to-red-700' },
  { id: 'sadachbia', name: 'Sadachbia', description: 'Male, lively, low pitch', color: 'bg-gradient-to-br from-indigo-200 to-indigo-400' },
  { id: 'sirius', name: 'Sirius', description: 'Female, relaxed, lower pitch', color: 'bg-gradient-to-br from-indigo-500 to-indigo-700' },
  { id: 'tarvos', name: 'Tarvos', description: 'Male, firm, low pitch', color: 'bg-gradient-to-br from-blue-700 to-gray-700' },
  { id: 'thera', name: 'Thera', description: 'Female, friendly, lower pitch', color: 'bg-gradient-to-br from-indigo-300 to-indigo-500' },
  { id: 'titania', name: 'Titania', description: 'Female, friendly, mid pitch', color: 'bg-gradient-to-br from-teal-400 to-teal-600' },
];

const cleanPromptForDisplay = (promptStr: string) => {
  if (!promptStr) return '';
  let cleaned = promptStr;

  const preamble = "A professional character reference sheet, model sheet, turnaround sheet layout.";
  if (cleaned.includes(preamble)) {
    cleaned = cleaned.replace(preamble, '');
  }

  const layoutIndex = cleaned.indexOf("Layout:");
  if (layoutIndex !== -1) {
    cleaned = cleaned.substring(0, layoutIndex);
  }

  return cleaned.trim();
};

import { resolveImageUrl } from '../utils/urlUtils';

export default function TextToVideoMode() {
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [projectName, setProjectName] = useState<string>('');

  // States for pagination and accordion
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});

  const toggleProject = (pName: string) => {
    setExpandedProjects(prev => ({ ...prev, [pName]: prev[pName] === false ? true : false }));
  };

  interface StoryBoard {
    id: string;
    prompt: string;
    characters?: (string | File)[];
    voice?: string;
  }

  const [selectedVoice, setSelectedVoice] = useState('achernar');
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const [openVoiceMenuId, setOpenVoiceMenuId] = useState<string | null>(null);
  const [isPromptExpanded, setIsPromptExpanded] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [ideaUrl, setIdeaUrl] = useState('');
  const [isAnalyzingIdea, setIsAnalyzingIdea] = useState(false);

  const [storyBoards, setStoryBoards] = useState<StoryBoard[]>(() => {
    try {
      const saved = localStorage.getItem('tool_text_storyboards');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('tool_text_storyboards', JSON.stringify(storyBoards));
  }, [storyBoards]);

  const [characterNames, setCharacterNames] = useState<Record<string, string>>({});
  const [characterPaths, setCharacterPaths] = useState<Record<string, string>>({});
  const [userImages, setUserImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchUserImages = async () => {
      try {
        const response = await fetchWithAuth(`${API_URL}/veo3/character`);
        if (response.ok) {
          const data = await response.json();
          const urls = new Set<string>();
          const names: Record<string, string> = {};
          const paths: Record<string, string> = {};

          data.forEach((char: any) => {
            const url = resolveImageUrl(char.imageUrl);
            urls.add(url);
            if (char.name) names[url] = char.name;

            // Extract localPath if imageUrl is a JSON string
            if (typeof char.imageUrl === 'string' && char.imageUrl.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(char.imageUrl);
                if (parsed.localPath) paths[url] = parsed.localPath;
              } catch (e) { }
            } else if (typeof char.imageUrl === 'object' && char.imageUrl?.localPath) {
              paths[url] = char.imageUrl.localPath;
            }

            if (char.exteriorUrl) {
              const extUrl = resolveImageUrl(char.exteriorUrl);
              urls.add(extUrl);
              names[extUrl] = `[Ngoại cảnh] ${char.name || `Nhân vật ${char.id}`}`;

              // Extract localPath for exterior
              if (typeof char.exteriorUrl === 'string' && char.exteriorUrl.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(char.exteriorUrl);
                  if (parsed.localPath) paths[extUrl] = parsed.localPath;
                } catch (e) { }
              } else if (typeof char.exteriorUrl === 'object' && char.exteriorUrl?.localPath) {
                paths[extUrl] = char.exteriorUrl.localPath;
              }
            }
          });

          setUserImages(urls);
          setCharacterNames(names);
          setCharacterPaths(paths);
        }
      } catch (e) {
        console.error('Error fetching characters:', e);
      }
    };
    fetchUserImages();
  }, []);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        let startIndex = 0;
        let isFormat2 = false;
        let charColIdx = 1;
        let promptColIdx = 2;
        let extColIdx = -1;

        if (data[0]) {
          const header = data[0].map(h => String(h || '').toLowerCase());
          const foundCharIdx = header.findIndex(h => h.includes('character'));
          const foundDescIdx = header.findIndex(h => h.includes('description') || h.includes('prompt'));
          const foundExtIdx = header.findIndex(h => h.includes('exterior') || h.includes('ngoại cảnh'));

          if (foundCharIdx !== -1 && foundDescIdx !== -1) {
            startIndex = 1;
            isFormat2 = true;
            charColIdx = foundCharIdx;
            promptColIdx = foundDescIdx;
            extColIdx = foundExtIdx;
          } else if (header[0].includes('id') || (header.length > 1 && header[1].includes('prompt'))) {
            startIndex = 1;
            promptColIdx = 1;
          }
        }

        const newBoards: StoryBoard[] = [];
        for (let i = startIndex; i < data.length; i++) {
          const row = data[i];
          if (!row || (!row[0] && !row[1] && !row[2])) continue;

          let promptText = '';
          let finalCharacters: (string | File)[] = [];

          if (isFormat2) {
            promptText = String(row[promptColIdx] || '');
            const charRaw = String(row[charColIdx] || '').trim();
            const extRaw = extColIdx !== -1 ? String(row[extColIdx] || '').trim() : '';

            const charMentions = charRaw ? charRaw.split(',').map(c => c.trim().replace(/^@/, '')) : [];
            const extMentions = extRaw ? extRaw.split(',').map(c => c.trim().replace(/^@/, '')) : [];

            // Match Characters
            charMentions.forEach(targetRaw => {
              if (!targetRaw) return;
              const targetName = targetRaw.toLowerCase().replace(/\s/g, '');
              const matchedEntry = Object.entries(characterNames).find(([url, name]) => {
                return !name.startsWith('[Ngoại cảnh]') && name.toLowerCase().replace(/\s/g, '') === targetName && userImages.has(url);
              });
              if (matchedEntry && !finalCharacters.includes(matchedEntry[0])) {
                finalCharacters.push(matchedEntry[0]);
              }
            });

            // Match Exteriors
            extMentions.forEach(targetRaw => {
              if (!targetRaw) return;
              const targetName = targetRaw.toLowerCase().replace(/\s/g, '');
              const matchedEntry = Object.entries(characterNames).find(([url, name]) => {
                if (!name.startsWith('[Ngoại cảnh]')) return false;
                const cleanStoredName = name.replace(/^\[Ngoại cảnh\]\s*/i, '');
                return cleanStoredName.toLowerCase().replace(/\s/g, '') === targetName && userImages.has(url);
              });
              if (matchedEntry && !finalCharacters.includes(matchedEntry[0])) {
                finalCharacters.push(matchedEntry[0]);
              }
            });
          } else {
            promptText = String(row[promptColIdx] || row[1] || '');
            const mentions = promptText.match(/@([^\s\)\]\.,:]+)/g);
            if (mentions) {
              mentions.forEach(mention => {
                const targetName = mention.substring(1).toLowerCase().replace(/\s/g, '');
                const matchedEntry = Object.entries(characterNames).find(([url, name]) => {
                  const cleanStoredName = name.replace(/^\[Ngoại cảnh\]\s*/i, '');
                  return cleanStoredName.toLowerCase().replace(/\s/g, '') === targetName && userImages.has(url);
                });
                if (matchedEntry && !finalCharacters.includes(matchedEntry[0])) {
                  finalCharacters.push(matchedEntry[0]);
                }
              });
            }
          }

          // 2. ƯU TIÊN 2: Lấy ảnh từ trực tiếp các cột Excel
          const excelImages = [];
          if (!isFormat2) {
            if (row[2]) excelImages.push(String(row[2]));
            if (row[3]) excelImages.push(String(row[3]));
            if (row[4]) excelImages.push(String(row[4]));
          }

          const maxAllowed = 3;
          for (const img of excelImages) {
            if (finalCharacters.length < maxAllowed && !finalCharacters.includes(img)) {
              finalCharacters.push(img);
            }
          }
          if (finalCharacters.length > maxAllowed) finalCharacters.length = maxAllowed;

          newBoards.push({
            id: String(row[0] || `Row-${i}`),
            prompt: promptText,
            characters: finalCharacters
          });
        }

        setStoryBoards(newBoards);
      } catch (error) {
        console.error('Error importing excel:', error);
        alert('Có lỗi xảy ra khi đọc file Excel!');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const [isSaved, setIsSaved] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyIdea = async () => {
    if (!ideaUrl) {
      setShowErrorToast({ show: true, message: 'Vui lòng điền link Facebook/TikTok/YouTube!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3500);
      return;
    }

    const storedApiKey = localStorage.getItem('tool_gemini_api_key') || '';
    if (!storedApiKey.trim()) {
      setShowErrorToast({ show: true, message: 'Vui lòng nhập Google Gemini API Key ở thanh Menu bên trái trước khi thực hiện!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3500);
      return;
    }

    setIsAnalyzingIdea(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/ai/generate-script-from-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ideaUrl, apiKey: storedApiKey }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        // Tách Table Markdown
        const lines = result.data.split('\n');
        const blocks: string[] = [];
        let insideTable = false;

        for (const line of lines) {
          const tLine = line.trim();
          if (tLine.startsWith('|')) {
            // Nhận diện dòng Header (chứa chữ Hành động, Cỡ cảnh) hoặc dòng phân tách (---)
            if ((tLine.toLowerCase().includes('hành động') && tLine.toLowerCase().includes('cảnh')) || tLine.includes('---')) {
              insideTable = true;
              continue;
            }
            if (insideTable) {
              // Extract columns
              const cols = tLine.split('|').map((s: string) => s.trim()).filter(Boolean);
              if (cols.length >= 3) {
                // Định dạng lại thông tin cho Storyboard
                let sceneDesc = `[${cols[0].replace(/\*\*/g, '')}]\n`;
                sceneDesc += `🎥 Góc máy: ${cols[1]}\n`;
                sceneDesc += `🎬 Hành động: ${cols[2]}`;
                if (cols[3] && cols[3].toLowerCase() !== 'không có') sceneDesc += `\n💬 Thoại: ${cols[3]}`;
                if (cols[4] && cols[4].toLowerCase() !== 'không có') sceneDesc += `\n🆎 Text: ${cols[4]}`;
                blocks.push(sceneDesc);
              } else {
                blocks.push(tLine.replace(/\|/g, '').trim());
              }
            }
          } else if (insideTable && tLine === '') {
            // Dừng dọc table khi đã hết
            insideTable = false;
          }
        }

        // Fallback phòng khi AI không trả về dạng Table
        if (blocks.length === 0) {
          const rawBlocks = result.data.split('\n\n').filter((b: string) => b.trim() !== '');
          blocks.push(...rawBlocks);
        }

        let currentMaxId = 0;
        if (storyBoards.length > 0) {
          storyBoards.forEach(sb => {
            const m = String(sb.id).match(/\d+$/);
            if (m) currentMaxId = Math.max(currentMaxId, parseInt(m[0]));
          });
        }

        const newBoards = blocks.map((b: string, i: number) => ({
          id: `Scene_${currentMaxId + i + 1}`,
          prompt: b.trim()
        }));
        setStoryBoards(prev => [...prev, ...newBoards]);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2000);
        setIdeaUrl('');
      } else {
        setShowErrorToast({ show: true, message: result.message || 'Lỗi xử lý từ AI!' });
        setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3500);
      }
    } catch (e) {
      console.error(e);
      setShowErrorToast({ show: true, message: 'Lỗi gọi API AI!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3500);
    } finally {
      setIsAnalyzingIdea(false);
    }
  };

  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const handleSelectAll = (projectData: any[]) => {
    const projectIds = projectData.map(row => row.id);
    const allSelected = projectIds.every(id => selectedIds.has(id));
    const newSet = new Set(selectedIds);
    if (allSelected && projectIds.length > 0) {
      projectIds.forEach(id => newSet.delete(id));
    } else {
      projectIds.forEach(id => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const toggleSelect = (id: number | string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkRecreate = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn TẠO LẠI ${selectedIds.size} mục này không? Dữ liệu cũ sẽ bị xóa vĩnh viễn.`)) return;
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetchWithAuth(`${API_URL}/veo3/video/${id}/recreate`, { method: 'POST' })
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      fetchImages();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tạo lại hàng loạt!');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedIds.size} mục này không?`)) return;
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetchWithAuth(`${API_URL}/veo3/video/${id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      fetchImages();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi xóa hàng loạt!');
    }
  };

  const handleBulkDownload = async () => {
    const rows = tableData.filter(row => selectedIds.has(row.id));
    for (const row of rows) {
      await handleDownload(row);
      await new Promise(res => setTimeout(res, 500));
    }
  };

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/veo3/video/all`);
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.data || []);
        const ownerId = authService.getCurrentUserId();
        const filteredList = ownerId ? list.filter((row: any) => row.ownerID === ownerId || row.ownerId === ownerId) : list;
        setTableData(filteredList);
      } else {
        console.error('Failed to fetch Veo3 images:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching Veo3 images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleBatchSave = async () => {
    if (storyBoards.length === 0) {
      setShowErrorToast({ show: true, message: 'Vui lòng thêm Storyboard để tạo video!' });
      setTimeout(() => setShowErrorToast(prev => ({ ...prev, show: false })), 3500);
      return;
    }

    const hasEmptyPrompt = storyBoards.some(sb => sb.prompt.trim() === '');
    if (hasEmptyPrompt) {
      setShowErrorToast({ show: true, message: 'Lỗi: Có phân cảnh (Storyboard) chưa nhập Prompt! Vui lòng nhập đầy đủ để AI vẽ chính xác.' });
      setTimeout(() => setShowErrorToast(prev => ({ ...prev, show: false })), 3500);
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    const successfulIds = new Set<string>();

    for (const sb of storyBoards) {
      try {
        const aspectStr = aspectRatio === '16:9' ? '169' : '916';
        const voiceToUse = sb.voice || selectedVoice;
        const typeI2VValue = `text${aspectStr}-${voiceToUse}`;

        // Xử lý ảnh nhân vật nếu có
        let base64Images: string[] = [];
        let originalPaths: string[] = [];

        if (sb.characters && sb.characters.length > 0) {
          const base64Promises = sb.characters.map(charData => {
            if (typeof charData === 'string') return Promise.resolve(charData);
            let electronPath = '';
            if ((window as any).ipcRenderer && (window as any).ipcRenderer.getFilePath) {
              electronPath = (window as any).ipcRenderer.getFilePath(charData);
            } else {
              electronPath = (charData as any).path;
            }
            if (electronPath) return Promise.resolve(electronPath);
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(charData);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = error => reject(error);
            });
          });
          base64Images = await Promise.all(base64Promises);

          originalPaths = sb.characters.map(f => {
            if (typeof f === 'string') return characterPaths[f] || f;
            if ((window as any).ipcRenderer && (window as any).ipcRenderer.getFilePath) {
              return (window as any).ipcRenderer.getFilePath(f);
            }
            return (f as any).path;
          }).filter(Boolean);
        }

        const ownerId = authService.getCurrentUserId();
        const payload: any = {
          prompt: sb.prompt,
          status: 'pending',
          typeI2V: typeI2VValue,
          ownerID: ownerId,
          metadata: JSON.stringify({
            jobId: sb.id,
            projectName: projectName.trim() || 'Dự Án Khác',
            voice: voiceToUse,
            originalPaths: originalPaths
          })
        };

        if (base64Images[0]) payload.image1 = base64Images[0];
        if (base64Images[1]) payload.image2 = base64Images[1];
        if (base64Images[2]) payload.image3 = base64Images[2];

        const response = await fetchWithAuth(`${API_URL}/veo3/video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          successCount++;
          successfulIds.add(sb.id);
        } else {
          console.error(`Status ${response.status} for Job ID ${sb.id}`);
        }
      } catch (error: any) {
        console.error(`Error saving Job ID ${sb.id}:`, error);
      }
    }

    setIsSaving(false);
    if (successCount > 0) {
      setIsSaved(true);
      setShowSuccessToast(true);
      setTimeout(() => setIsSaved(false), 2000);
      setTimeout(() => setShowSuccessToast(false), 3000);
      fetchImages();
      setStoryBoards(prev => prev.filter(sb => !successfulIds.has(sb.id)));
    } else {
      alert('Lỗi: Không tạo được video nào. Vui lòng kiểm tra lại!');
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục này không?')) return;
    try {
      const response = await fetchWithAuth(`${API_URL}/veo3/video/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchImages();
      } else {
        alert('Xóa thất bại!');
      }
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
      alert('Có lỗi xảy ra khi xóa!');
    }
  };

  const handleProjectToggleStatus = async (pName: string, oldStatus: string, newStatus: string) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/veo3/project/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: pName, oldStatus, newStatus })
      });
      if (response.ok) {
        fetchImages();
      } else {
        alert('Cập nhật trạng thái thất bại!');
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái project:', error);
      alert('Có lỗi xảy ra khi gọi API!');
    }
  };

  const handleRecreate = async (id: string | number) => {
    if (!window.confirm('Bạn có chắc chắn muốn TẠO LẠI mục này không? Dữ liệu cũ sẽ bị xóa vĩnh viễn.')) return;
    try {
      const response = await fetchWithAuth(`${API_URL}/veo3/video/${id}/recreate`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchImages();
      } else {
        alert('Tạo lại thất bại!');
      }
    } catch (error) {
      console.error('Lỗi khi tạo lại:', error);
      alert('Có lỗi xảy ra khi gọi API tạo lại!');
    }
  };

  const handleDownload = async (row: any) => {
    const resultData = row.videoURL || row.result || row.result_image || row.s3Key;
    if (!resultData) {
      alert('Không có kết quả để tải xuống!');
      return;
    }

    let resultImages: string[] = [];
    const extractUrl = (item: any) => {
      const val = typeof item === 'object' && item !== null ? (item.url || item.s3Key || item) : item;
      return resolveImageUrl(val);
    };

    if (Array.isArray(resultData)) {
      resultImages = resultData.map(extractUrl);
    } else if (typeof resultData === 'string') {
      try {
        const parsed = JSON.parse(resultData);
        if (Array.isArray(parsed)) {
          resultImages = parsed.map(extractUrl);
        } else if (typeof parsed === 'object' && parsed !== null && (parsed.url || parsed.s3Key)) {
          resultImages = [extractUrl(parsed)];
        } else {
          resultImages = [extractUrl(resultData)];
        }
      } catch (e) {
        resultImages = [extractUrl(resultData)];
      }
    } else if (typeof resultData === 'object' && resultData !== null) {
      resultImages = [extractUrl(resultData)];
    }

    if (resultImages.length === 0) {
      alert('Không tìm thấy link ảnh hợp lệ!');
      return;
    }

    for (let i = 0; i < resultImages.length; i++) {
      const url = resultImages[i];
      let ext = 'jpg';
      const urlClean = url.split('?')[0].toLowerCase();
      if (urlClean.endsWith('.mp4')) ext = 'mp4';
      else if (urlClean.endsWith('.mov')) ext = 'mov';
      else if (urlClean.endsWith('.png')) ext = 'png';
      else if (urlClean.endsWith('.gif')) ext = 'gif';

      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `result_${row.id}_${i + 1}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error('Lỗi tải ảnh (có thể do CORS), sẽ mở sang tab mới:', err);
        window.open(url, '_blank');
      }
    }
  };
  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const textVideoData = tableData.filter(row => !row.image1 && !row.image2 && !row.image3 && !row.image && !row.imageRef && !row.image_ref && row.typeI2V?.startsWith('text'));

    textVideoData.forEach(row => {
      let pName = 'Dự Án Khác';
      if (row.metadata) {
        try {
          const parsed = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
          if (parsed && typeof parsed.projectName === 'string' && parsed.projectName.trim() !== '') {
            pName = parsed.projectName;
          }
        } catch (e) { }
      }
      if (!groups[pName]) groups[pName] = [];
      groups[pName].push(row);
    });
    // Sắp xếp Dự Án Khác xuống cuối cùng nếu có
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      if (a === 'Dự Án Khác') return 1;
      if (b === 'Dự Án Khác') return -1;
      return a.localeCompare(b);
    }).reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, any[]>);

    return sortedGroups;
  }, [tableData]);

  return (
    <div className="h-full flex flex-col space-y-4 text-gray-200">

      {/* Top 50% - Editor */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6 shrink-0 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

        {/* Left Side: General Settings */}
        <div
          className={`shrink-0 z-10 transition-all duration-500 ease-in-out overflow-hidden relative ${isSettingsOpen ? 'w-full md:w-[320px] pr-6 md:border-r border-white/10 border-b md:border-b-0 pb-6 md:pb-0 mb-4 md:mb-0' : 'w-10 border-transparent'
            }`}
        >
          <div className="flex items-center h-[32px] mb-6 relative w-[296px]">
            <h2 className={`text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-fuchsia-300 whitespace-nowrap transition-all duration-500 ${isSettingsOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'}`}>
              Cài đặt
            </h2>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-1.5 absolute top-0 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-300 hover:text-white transition-all duration-500 flex items-center justify-center z-20 ${isSettingsOpen ? 'left-[260px]' : 'left-0'}`}
              title={isSettingsOpen ? "Thu gọn cài đặt" : "Mở cài đặt"}
            >
              <Settings size={20} className={`transition-transform duration-500 ${isSettingsOpen ? 'rotate-90 text-fuchsia-400' : 'rotate-0'}`} />
            </button>
          </div>

          <div className={`transition-all duration-500 w-[296px] space-y-5 ${isSettingsOpen ? 'opacity-100 pointer-events-auto max-h-[1000px]' : 'opacity-0 pointer-events-none max-h-0 overflow-hidden m-0 p-0'}`}>
            <div className="space-y-2 relative z-50 pt-2">
              <label className="text-sm text-purple-200/70 font-medium">Voice (Giọng đọc)</label>
              <div className="relative">
                <button
                  onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-left text-sm text-gray-200 hover:bg-black/60 focus:outline-none focus:border-purple-400/50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${VOICE_OPTIONS.find(v => v.id === selectedVoice)?.color || 'bg-gray-700'}`}>
                      <Activity size={16} className="text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name}</div>
                      <div className="text-xs text-gray-400">{VOICE_OPTIONS.find(v => v.id === selectedVoice)?.description}</div>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isVoiceDropdownOpen ? 'rotate-180 text-fuchsia-400' : 'group-hover:text-gray-200'}`} />
                </button>

                {isVoiceDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsVoiceDropdownOpen(false)} />
                    <div className="absolute top-full mt-2 w-full bg-[#1a1a24] border border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden z-50 py-1 max-h-[180px] overflow-y-auto">
                      {VOICE_OPTIONS.map((voice) => (
                        <div key={voice.id} className="w-full flex items-center group/voice relative">
                          <button
                            onClick={() => {
                              setSelectedVoice(voice.id);
                              setIsVoiceDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${selectedVoice === voice.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${voice.color}`}>
                              <Activity size={16} className="text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-white">{voice.name}</div>
                              <div className="text-xs text-gray-400">{voice.description}</div>
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStoryBoards(prev => prev.map(sb => ({ ...sb, voice: voice.id })));
                              setSelectedVoice(voice.id);
                              setIsVoiceDropdownOpen(false);
                            }}
                            className="absolute right-4 px-2 py-1 bg-white/10 hover:bg-white/20 text-[11px] rounded border border-white/20 text-white/80 opacity-0 group-hover/voice:opacity-100 transition-opacity whitespace-nowrap"
                            title="Áp dụng giọng này cho toàn bộ thông số"
                          >
                            Áp dụng tất cả
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-purple-200/70 font-medium">Khổ (Aspect Ratio)</label>
              <div className="relative flex p-1 bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
                <div
                  className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] bg-gradient-to-r from-fuchsia-600/80 to-purple-600/80 rounded-lg shadow-[0_0_15px_rgba(192,132,252,0.3)] transition-all duration-300 ease-out border border-white/10"
                  style={{ transform: aspectRatio === '16:9' ? 'translateX(0)' : 'translateX(100%)' }}
                />
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition-colors ${aspectRatio === '16:9' ? 'text-white drop-shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  16:9
                </button>
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition-colors ${aspectRatio === '9:16' ? 'text-white drop-shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  9:16
                </button>
              </div>
            </div>

            {/* Khối gọi AI Sao chép Ý Tưởng */}
            <div className="space-y-2 pt-2">
              <label className="text-sm flex items-center gap-1.5 text-purple-200/70 font-medium">
                Sao chép ý tưởng
              </label>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Dán link Facebook/TikTok..."
                  value={ideaUrl}
                  onChange={(e) => setIdeaUrl(e.target.value)}
                  disabled={isAnalyzingIdea}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-fuchsia-400/50 transition-colors w-full disabled:opacity-50"
                />
                <button
                  onClick={handleCopyIdea}
                  disabled={isAnalyzingIdea || !ideaUrl}
                  className="w-full bg-gradient-to-r from-fuchsia-600/80 to-purple-600/80 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-lg px-3 py-2 text-sm font-medium transition-all shadow-[0_0_15px_rgba(192,132,252,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAnalyzingIdea ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isAnalyzingIdea ? 'Đang Xử Lí...' : 'Phân Tích Bằng AI'}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm text-purple-200/70 font-medium">Dữ liệu Đầu Vào (Excel / Thủ Công)</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Nút Upload Excel */}
                <div className="relative group w-full h-[60px] flex flex-col items-center justify-center bg-white/5 border border-dashed border-white/10 rounded-xl hover:bg-white/10 hover:border-fuchsia-400/50 transition-all overflow-hidden p-0">
                  <FileSpreadsheet className="text-gray-500 group-hover:text-fuchsia-400 mb-1 transition-colors cursor-pointer" size={20} />
                  <span className="text-xs font-medium text-gray-400 group-hover:text-fuchsia-300 transition-colors pointer-events-none tracking-tight">Upload Excel</span>

                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelUpload}
                  />
                </div>

                {/* Nút Thêm Thủ Công */}
                <button
                  onClick={() => {
                    let newId = 'Job_1';
                    if (storyBoards.length > 0) {
                      const lastId = String(storyBoards[storyBoards.length - 1].id).trim();
                      const match = lastId.match(/^(.*?)(\d+)$/);
                      if (match) {
                        const prefix = match[1];
                        const numStr = match[2];
                        const nextNumStr = numStr.startsWith('0')
                          ? (parseInt(numStr, 10) + 1).toString().padStart(numStr.length, '0')
                          : (parseInt(numStr, 10) + 1).toString();
                        newId = `${prefix}${nextNumStr}`;
                      } else {
                        newId = `${lastId}_1`;
                      }
                    }
                    setStoryBoards(prev => [...prev, { id: newId, prompt: '' }]);
                  }}
                  className="relative group w-full h-[60px] flex flex-col items-center justify-center bg-[#1e1e2d]/60 border border-white/10 rounded-xl hover:bg-[#2c2c42] hover:border-purple-400/50 transition-all active:scale-95 shadow-inner p-0"
                >
                  <Plus className="text-gray-500 group-hover:text-purple-400 mb-1 transition-colors" size={20} />
                  <span className="text-xs font-medium text-gray-400 group-hover:text-purple-300 transition-colors tracking-tight">Thêm Thủ Công</span>

                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Storyboard Editor */}
        <div className="flex-1 flex flex-col z-10 transition-all duration-500 min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <h2
              className="text-xl font-semibold flex items-center cursor-pointer group select-none"
              onClick={() => setIsPromptExpanded(!isPromptExpanded)}
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-300 to-fuchsia-300 whitespace-nowrap">
                Cấu hình Prompt {storyBoards.length > 0 && `(${storyBoards.length})`}
              </span>
              <div className="ml-2 text-fuchsia-400/70 group-hover:text-fuchsia-300 transition-colors p-1">
                {isPromptExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
              </div>
            </h2>
            <div className={`flex items-center space-x-3 w-full sm:w-auto transition-all duration-500 origin-right ${isPromptExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 max-w-0 overflow-hidden pointer-events-none'}`}>
              {storyBoards.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Bạn có chắc chắn muốn XÓA TRẮNG toàn bộ danh sách hiện tại không?')) {
                      setStoryBoards([]);
                    }
                  }}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center space-x-1"
                  title="Xóa tất cả"
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Xóa</span>
                </button>
              )}
              <input
                type="text"
                placeholder="Nhập tên dự án (Tuỳ chọn)"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-fuchsia-400/50 transition-colors flex-1 sm:w-48"
              />
              <button
                onClick={handleBatchSave}
                disabled={isSaving || storyBoards.length === 0}
                className={`${isSaving || storyBoards.length === 0 ? 'bg-fuchsia-600/50 cursor-not-allowed' : 'bg-fuchsia-600 hover:bg-fuchsia-500'} text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-[0_0_15px_rgba(192,132,252,0.4)] whitespace-nowrap`}
              >
                {isSaved ? <Check size={16} /> : (isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={16} />)}
                <span>{isSaved ? 'Đã Gửi' : (isSaving ? 'Đang tạo...' : 'Tạo Tất Cả Video')}</span>
              </button>
            </div>
          </div>

          <div className={`transition-all duration-500 overflow-y-auto pr-2 flex flex-wrap gap-4 content-start items-start ${isPromptExpanded ? 'opacity-100 flex-1 h-[450px] max-h-[450px]' : 'opacity-0 h-0 max-h-0 overflow-hidden m-0 p-0 pointer-events-none'}`}>
            {storyBoards.length === 0 ? (
              <div className="w-full h-full min-h-[300px] flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-black/20 text-gray-500 italic">
                Chưa có dữ liệu. Hãy tải lên file Excel bên trái.
              </div>
            ) : (
              storyBoards.map((sb, idx) => (
                <div key={idx} className="bg-black/30 border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-colors flex flex-col w-[480px] max-w-full shrink-0">
                  <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex justify-between items-center text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="text-fuchsia-300/70 text-xs">Tên Cảnh / Job :</span>
                      <input
                        className="bg-transparent text-fuchsia-300 font-medium outline-none border-b border-transparent focus:border-fuchsia-500/50 w-32 px-1 py-0.5 text-sm transition-colors"
                        value={sb.id}
                        onChange={(e) => {
                          const newSb = [...storyBoards];
                          newSb[idx].id = e.target.value;
                          setStoryBoards(newSb);
                        }}
                      />
                    </div>
                    <button
                      title="Xóa Storyboard"
                      onClick={() => {
                        const newSb = [...storyBoards];
                        newSb.splice(idx, 1);
                        setStoryBoards(newSb);
                      }}
                      className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="p-4 space-y-3 flex-1 flex flex-col">
                    <textarea
                      className="w-full flex-1 bg-black/40 border border-transparent rounded-lg p-3 text-sm text-gray-200 outline-none focus:border-fuchsia-400/50 transition-colors resize-none mb-1 shadow-inner"
                      value={sb.prompt}
                      placeholder="Nhập prompt cho phân cảnh này..."
                      onChange={(e) => {
                        const newSb = [...storyBoards];
                        newSb[idx].prompt = e.target.value;
                        setStoryBoards(newSb);
                      }}
                      rows={4}
                    />

                    <div className="flex flex-wrap items-center gap-2 pt-1 mt-auto">
                      {/* Voice Selection cho riêng Prompt */}
                      <div className="relative flex items-center ml-auto border-t-0 p-0 shadow-none">
                        {sb.voice ? (
                          <div className="flex items-center gap-1.5 bg-fuchsia-900/20 border border-fuchsia-500/20 rounded-full pl-1.5 pr-1 py-1">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${VOICE_OPTIONS.find(v => v.id === sb.voice)?.color || 'bg-gray-600'}`}>
                              <Activity size={10} className="text-white" />
                            </div>
                            <span className="text-[11px] text-fuchsia-200 font-medium mr-1">{VOICE_OPTIONS.find(v => v.id === sb.voice)?.name}</span>
                            <button
                              onClick={() => {
                                const newSb = [...storyBoards];
                                delete newSb[idx].voice;
                                setStoryBoards(newSb);
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/20 text-fuchsia-300/60 hover:text-red-400 transition-colors"
                              title="Bỏ Voice này, dùng mặc định"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setOpenVoiceMenuId(openVoiceMenuId === sb.id ? null : sb.id)}
                            className="flex items-center justify-center space-x-1 text-xs bg-fuchsia-900/30 hover:bg-fuchsia-800/50 text-fuchsia-200 border border-fuchsia-500/30 rounded-full px-3 py-1.5 transition-colors shadow-sm h-8 whitespace-nowrap"
                          >
                            <Activity size={13} />
                            <span className="ml-1">Thêm Voice</span>
                          </button>
                        )}

                        {openVoiceMenuId === sb.id && !sb.voice && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenVoiceMenuId(null)} />
                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.8)] overflow-hidden z-40 max-h-[140px] overflow-y-auto">
                              <div className="px-3 py-2 border-b border-white/5 bg-black/20 text-[10px] text-gray-400 uppercase tracking-wider font-semibold sticky top-0 backdrop-blur-md z-10">
                                Chọn giọng đọc
                              </div>
                              {VOICE_OPTIONS.map(v => (
                                <button
                                  key={v.id}
                                  onClick={() => {
                                    const newSb = [...storyBoards];
                                    newSb[idx].voice = v.id;
                                    setStoryBoards(newSb);
                                    setOpenVoiceMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors flex items-center gap-2 group border-b border-white/5 last:border-0 relative z-0"
                                >
                                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${v.color}`}>
                                    <Activity size={10} className="text-white" />
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-white font-medium">{v.name}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom 50% - Table */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl flex-1 p-6 shadow-xl flex flex-col z-10 overflow-hidden min-h-[300px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-fuchsia-300">Danh sách Kết quả</h2>
          <button
            onClick={fetchImages}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-purple-200/70 hover:text-purple-200 transition-colors"
          >
            <RotateCcw size={14} className={isLoading ? 'animate-spin text-fuchsia-400' : ''} />
            <span>{isLoading ? 'Đang tải...' : 'Tải lại'}</span>
          </button>
        </div>

        <div className="relative overflow-y-auto overflow-x-hidden flex-1 pb-2 space-y-6">
          {isLoading && tableData.length > 0 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-xl">
              <div className="flex items-center space-x-3 bg-black/80 px-5 py-3 rounded-xl border border-white/10 shadow-2xl">
                <div className="w-5 h-5 border-2 border-fuchsia-400/30 border-t-fuchsia-400 rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-fuchsia-300">Đang đồng bộ...</span>
              </div>
            </div>
          )}
          <div className={`transition-opacity duration-300 space-y-6 ${isLoading ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            {tableData.length === 0 && isLoading ? (
              <div className="py-8 text-center text-gray-400 border border-dashed border-white/10 rounded-xl bg-black/20">Đang tải dữ liệu...</div>
            ) : tableData.length === 0 ? (
              <div className="py-8 text-center text-gray-400 border border-dashed border-white/10 rounded-xl bg-black/20">Chưa có dữ liệu</div>
            ) : Object.keys(groupedData).map((project, pIdx) => {
              const isExpanded = expandedProjects[project] === true;

              const currentPage = currentPages[project] || 1;
              const itemsPerPage = 10;
              const totalItems = groupedData[project].length;
              const totalPages = Math.ceil(totalItems / itemsPerPage);

              const getPageNumbers = () => {
                const pages = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  if (currentPage <= 3) {
                    pages.push(1, 2, 3, 4, '...', totalPages);
                  } else if (currentPage >= totalPages - 2) {
                    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                  }
                }
                return pages;
              };

              const currentTableData = groupedData[project].slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
              const completedItems = groupedData[project].filter(row => row.status === 'completed').length;
              const isAllCompleted = totalItems > 0 && completedItems === totalItems;
              const pendingItemsCount = groupedData[project].filter(row => row.status === 'pending').length;
              const stoppedItemsCount = groupedData[project].filter(row => row.status === 'stop').length;

              return (
                <div key={pIdx} className="relative border border-white/10 rounded-xl overflow-hidden bg-black/20 shadow-lg group/project">
                  <div
                    onClick={() => toggleProject(project)}
                    className="bg-gradient-to-r from-fuchsia-900/40 to-transparent border-b border-white/10 px-5 py-3 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] cursor-pointer hover:from-fuchsia-900/60 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-300 to-purple-300 uppercase tracking-widest">{project}</span>
                      {isAllCompleted ? (
                        <div className="ml-3 flex items-center space-x-1.5 px-2.5 py-1 bg-black/40 border border-green-500/20 rounded text-xs font-semibold text-green-500">
                          <Check size={14} className="text-green-500" />
                          <span>{completedItems} / {totalItems} Xong</span>
                        </div>
                      ) : (
                        <div className="ml-3 px-2.5 py-1 bg-black/40 border border-white/5 rounded text-xs font-medium text-gray-400">
                          {completedItems} / {totalItems} Xong
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      {pendingItemsCount > 0 ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleProjectToggleStatus(project, 'pending', 'stop'); }}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-500 transition-colors shadow-sm"
                          title="Dừng tất cả ID đang pending"
                        >
                          <PauseCircle size={16} />
                        </button>
                      ) : stoppedItemsCount > 0 ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleProjectToggleStatus(project, 'stop', 'pending'); }}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-500 transition-colors shadow-sm"
                          title="Tiếp tục chạy tất cả ID đã dừng"
                        >
                          <PlayCircle size={16} />
                        </button>
                      ) : null}

                      <div className="text-fuchsia-400/70 group-hover/project:text-fuchsia-300 transition-colors cursor-pointer p-1">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-purple-200/50 text-xs font-semibold uppercase tracking-wider">
                            <th className="py-3 px-5 w-12">
                              <input type="checkbox" className="rounded bg-black/40 border-white/20 text-fuchsia-500 focus:ring-fuchsia-500/50 cursor-pointer"
                                checked={groupedData[project].length > 0 && groupedData[project].every(row => selectedIds.has(row.id))}
                                onChange={() => handleSelectAll(groupedData[project])}
                              />
                            </th>
                            <th className="py-3 px-5 w-16">ID</th>

                            <th className="py-3 px-5 min-w-[200px]">Prompt</th>
                            <th className="py-3 px-5">Trạng thái</th>
                            <th className="py-3 px-5">Kiểu video</th>
                            <th className="py-3 px-5">Kết quả</th>
                            <th className="py-3 px-5 text-right w-32">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {currentTableData.map((row, index) => (
                            <tr key={row.id || index} className={`hover:bg-white/[0.03] transition-colors group ${selectedIds.has(row.id) ? 'bg-fuchsia-500/10' : ''}`}>
                              <td className="py-4 px-5">
                                <input type="checkbox" className="rounded bg-black/40 border-white/20 text-fuchsia-500 focus:ring-fuchsia-500/50 cursor-pointer"
                                  checked={selectedIds.has(row.id)}
                                  onChange={() => toggleSelect(row.id)}
                                />
                              </td>
                              <td className="py-4 px-4 text-gray-400">{row.id || index + 1}</td>


                              <td className="py-4 px-4">
                                {(() => {
                                  const displayPrompt = cleanPromptForDisplay(row.prompt);
                                  return (
                                    <p className="max-w-[150px] truncate text-sm text-gray-300" title={displayPrompt}>{displayPrompt}</p>
                                  );
                                })()}
                              </td>

                              <td className="py-4 px-4">
                                {row.status === 'completed' && <span className="px-2 py-1.5 bg-green-500/10 text-green-400 text-xs rounded-md border border-green-500/20 font-medium whitespace-nowrap">Thành công</span>}
                                {(row.status === 'processing' || row.status === 'Generating') && <span className="px-2 py-1.5 bg-blue-500/10 text-blue-400 text-xs rounded-md border border-blue-500/20 font-medium whitespace-nowrap">Đang tạo</span>}
                                {row.status === 'pending' && <span className="px-2 py-1.5 bg-yellow-500/10 text-yellow-500 text-xs rounded-md border border-yellow-500/20 font-medium whitespace-nowrap">Đang chờ...</span>}
                                {row.status === 'stop' && <span className="px-2 py-1.5 bg-orange-500/10 text-orange-400 text-xs rounded-md border border-orange-500/20 font-medium whitespace-nowrap">Đã dừng</span>}
                                {(row.status === 'failed' || row.status === 'uncompleted' || row.status === 'Uncompleted') && <span className="px-2 py-1.5 bg-red-500/10 text-red-400 text-xs rounded-md border border-red-500/20 font-medium whitespace-nowrap">Thất bại</span>}
                                {(!row.status || !['completed', 'processing', 'Generating', 'pending', 'stop', 'failed', 'uncompleted', 'Uncompleted'].includes(row.status)) && <span className="px-2 py-1.5 bg-gray-500/10 text-gray-400 text-xs rounded-md border border-gray-500/20 font-medium whitespace-nowrap">{row.status || 'Chờ xử lý'}</span>}
                              </td>
                              <td className="py-4 px-4">
                                {row.typeI2V ? (
                                  <span className="px-2 py-1.5 bg-purple-500/10 text-white text-xs rounded-md border border-purple-500/20 font-medium whitespace-nowrap">
                                    {row.typeI2V?.startsWith('frames') ? 'Frames to Video' : row.typeI2V?.startsWith('ingredient') ? 'Ingredient to Video' : row.typeI2V?.startsWith('text') ? 'Text to Video' : row.typeI2V}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-500 font-medium">N/A</span>
                                )}
                              </td>

                              <td className="py-4 px-4 border-l border-white/5 bg-black/10">
                                <div className="flex gap-3 flex-wrap items-center justify-start">
                                  {(() => {
                                    const resultData = row.videoURL || row.result || row.result_image || row.s3Key;
                                    if (!resultData) {
                                      return (
                                        <div className="w-24 h-24 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 opacity-70">
                                          <ImageIcon className="text-fuchsia-500/30" size={32} />
                                        </div>
                                      );
                                    }

                                    let resultImages: string[] = [];
                                    const extractUrl = (item: any) => {
                                      const val = typeof item === 'object' && item !== null ? (item.url || item.s3Key || item.videoURL || item) : item;
                                      return resolveImageUrl(val);
                                    };

                                    if (Array.isArray(resultData)) {
                                      resultImages = resultData.map(extractUrl);
                                    } else if (typeof resultData === 'string') {
                                      try {
                                        const parsed = JSON.parse(resultData);
                                        if (Array.isArray(parsed)) {
                                          resultImages = parsed.map(extractUrl);
                                        } else if (typeof parsed === 'object' && parsed !== null && (parsed.url || parsed.s3Key || parsed.videoURL)) {
                                          resultImages = [extractUrl(parsed)];
                                        } else {
                                          resultImages = [extractUrl(resultData)];
                                        }
                                      } catch (e) {
                                        resultImages = [extractUrl(resultData)];
                                      }
                                    } else if (typeof resultData === 'object' && resultData !== null) {
                                      resultImages = [extractUrl(resultData)];
                                    }

                                    return (
                                      <>
                                        {resultImages.slice(0, 3).map((imgUrl, i) => {
                                          const isVideo = imgUrl.toLowerCase().endsWith('.mp4') || imgUrl.toLowerCase().endsWith('.mov');
                                          return (
                                            <div key={i} className="h-20 w-fit rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black/40 group-hover:shadow-[0_0_15px_rgba(192,132,252,0.15)] transition-all">
                                              {isVideo ? (
                                                <video src={imgUrl} className="h-full w-auto object-cover hover:scale-[1.03] transition-transform duration-300 cursor-pointer" onClick={() => setPreviewImage(imgUrl)} muted autoPlay loop playsInline />
                                              ) : (
                                                <img src={imgUrl} alt="Result" className="h-full w-auto object-cover hover:scale-[1.03] transition-transform duration-300 cursor-pointer" onClick={() => setPreviewImage(imgUrl)} />
                                              )}
                                            </div>
                                          );
                                        })}
                                        {resultImages.length > 3 && (
                                          <div className="h-20 px-3 rounded-lg flex items-center justify-center bg-fuchsia-900/40 border border-fuchsia-500/30 text-sm font-medium text-fuchsia-300 backdrop-blur-sm cursor-pointer hover:bg-fuchsia-900/60 transition-colors">
                                            +{resultImages.length - 3}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end space-x-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                  {/* <button className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors" title="Sửa">
                                  <Edit size={16} />
                                </button> */}
                                  <button onClick={() => handleRecreate(row.id)} className="p-2 hover:bg-white/10 rounded-lg text-purple-400 transition-colors" title="Tạo lại">
                                    <RotateCcw size={16} />
                                  </button>
                                  {/* <button onClick={() => addToGallery(row)} className="p-2 hover:bg-white/10 rounded-lg text-yellow-400 transition-colors" title="Thêm vào kho ảnh">
                                  <Library size={16} />
                                </button> */}
                                  <button onClick={() => handleDownload(row)} className="p-2 hover:bg-white/10 rounded-lg text-green-400 transition-colors" title="Lưu ảnh">
                                    <Download size={16} />
                                  </button>
                                  <button onClick={() => handleDelete(row.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors" title="Xóa">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Pagination Footer */}
                      {totalPages > 1 && (
                        <div className="py-3 px-5 border-t border-white/5 flex items-center justify-center space-x-2 bg-black/10">
                          <button
                            onClick={() => setCurrentPages(prev => ({ ...prev, [project]: Math.max((prev[project] || 1) - 1, 1) }))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg disabled:opacity-50 transition-colors text-sm font-medium text-gray-300"
                          >
                            Trước
                          </button>

                          <div className="flex items-center space-x-1 mx-2">
                            {getPageNumbers().map((page, index) => (
                              typeof page === 'number' ? (
                                <button
                                  key={index}
                                  onClick={() => setCurrentPages(prev => ({ ...prev, [project]: page }))}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${currentPage === page
                                    ? 'bg-fuchsia-600 text-white border border-fuchsia-500'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                    }`}
                                >
                                  {page}
                                </button>
                              ) : (
                                <span key={index} className="w-8 flex justify-center text-gray-500">
                                  {page}
                                </span>
                              )
                            ))}
                          </div>

                          <button
                            onClick={() => setCurrentPages(prev => ({ ...prev, [project]: Math.min((prev[project] || 1) + 1, totalPages) }))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg disabled:opacity-50 transition-colors text-sm font-medium text-gray-300"
                          >
                            Sau
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {createPortal(
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-3 pointer-events-none`}>
          {/* Success Toast */}
          <div className={`transition-all duration-300 transform ${showSuccessToast ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 hidden'}`}>
            <div className="bg-green-500/90 backdrop-blur-sm text-white px-5 py-3 rounded-lg shadow-lg border border-green-400/30 flex items-center space-x-3">
              <div className="bg-white/20 rounded-full p-1 shrink-0">
                <Check size={16} className="text-white" />
              </div>
              <span className="font-medium">Yêu cầu tạo ảnh thành công</span>
            </div>
          </div>

          {/* Error Toast */}
          <div className={`transition-all duration-300 transform ${showErrorToast.show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 hidden'}`}>
            <div className="bg-red-500/90 backdrop-blur-sm text-white px-5 py-3 rounded-lg shadow-lg border border-red-400/30 flex items-center space-x-3 max-w-sm">
              <div className="bg-white/20 rounded-full p-1 shrink-0">
                <AlertCircle size={16} className="text-white" />
              </div>
              <span className="font-medium text-sm leading-snug">{showErrorToast.message}</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Action Floating Bar */}
      {createPortal(
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 transform ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
          <div className="bg-black/90 backdrop-blur-xl border border-fuchsia-500/30 shadow-[0_0_30px_rgba(217,70,239,0.15)] rounded-2xl px-6 py-4 flex items-center space-x-6">
            <div className="flex items-center space-x-3 pr-6 border-r border-white/10">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-fuchsia-500/20 text-fuchsia-400 font-bold text-sm">
                {selectedIds.size}
              </span>
              <span className="text-white/90 font-medium">mục đã chọn</span>
              <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-sm text-gray-400 hover:text-white transition-colors underline decoration-white/20 underline-offset-4 cursor-pointer">
                Bỏ chọn
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={handleBulkDownload} className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors border border-green-500/20 cursor-pointer">
                <Download size={16} />
                <span className="font-medium">Tải xuống</span>
              </button>
              <button onClick={handleBulkRecreate} className="flex items-center space-x-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors border border-purple-500/20 cursor-pointer">
                <RotateCcw size={16} />
                <span className="font-medium">Tạo lại</span>
              </button>
              <button onClick={handleBulkDelete} className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20 cursor-pointer">
                <Trash2 size={16} />
                <span className="font-medium">Xóa</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-7xl max-h-[95vh] w-full flex items-center justify-center">
            {previewImage.toLowerCase().endsWith('.mp4') || previewImage.toLowerCase().endsWith('.mov') ? (
              <video
                src={previewImage}
                controls
                autoPlay
                className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl bg-black/50"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <button
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
              onClick={() => setPreviewImage(null)}
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
