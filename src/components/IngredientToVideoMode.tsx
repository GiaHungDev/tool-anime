import { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GlobalAudioContext } from '../contexts/GlobalAudioContext';
import { Trash2, RotateCcw, Download, Image as ImageIcon, Save, Check, X, FileSpreadsheet, Plus, Upload, User, AlertCircle, ChevronDown, ChevronUp, Activity, Settings, PauseCircle, PlayCircle, Sparkles, Loader2, BookOpen, Mic, Volume2, Cpu, Play, Wand2, Library } from 'lucide-react';
import * as XLSX from 'xlsx';
import { API_URL, authService, fetchWithAuth } from '../services/authService';
import { COUNTRY_MAP } from './NanoBananaProMode';
import { storySystemPrompt } from '../../constants';
import { api_tts } from '../services/api_tts';
import { cleanVoiceName } from '../utils/system_presets';

export interface DialogLine {
  characterName: string;
  text: string;
  emotion: string;
  voiceId?: string;
}




const cleanPromptForDisplay = (promptStr: string) => {
  if (typeof promptStr !== 'string') return '';
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

const resolveImageUrl = (urlOrKey: string) => {
  if (!urlOrKey || typeof urlOrKey !== 'string') return urlOrKey;

  let actualUrl = urlOrKey;
  if (urlOrKey.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(urlOrKey);
      if (parsed && parsed.url) {
        actualUrl = parsed.url;
      }
    } catch (e) {
      // Ignore parse error, treat as normal string
    }
  }

  if (actualUrl.startsWith('http') || actualUrl.startsWith('data:')) return actualUrl;
  if (/^[A-Za-z]:[\\/]/.test(actualUrl) || actualUrl.startsWith('/')) {
    return `${API_URL}/veo3/local-file?path=${encodeURIComponent(actualUrl)}`;
  }
  const cleanKey = actualUrl.startsWith('/') ? actualUrl.substring(1) : actualUrl;
  const baseUrl = import.meta.env.VITE_S3_BASE_URL;
  return `${baseUrl}${cleanKey}`;
};

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
  { id: 'sadaltager', name: 'Sadaltager', description: 'Male, knowledgeable, mid pitch', color: 'bg-gradient-to-br from-orange-300 to-orange-500' },
  { id: 'schedar', name: 'Schedar', description: 'Male, even, mid-low pitch', color: 'bg-gradient-to-br from-blue-300 to-blue-500' },
  { id: 'sulafat', name: 'Sulafat', description: 'Female, warm, mid pitch', color: 'bg-gradient-to-br from-cyan-700 to-cyan-900' },
  { id: 'umbriel', name: 'Umbriel', description: 'Male, smooth, lower pitch', color: 'bg-gradient-to-br from-cyan-200 to-cyan-400' },
  { id: 'vindemiatrix', name: 'Vindemiatrix', description: 'Female, gentle, mid pitch', color: 'bg-gradient-to-br from-purple-600 to-purple-800' },
  { id: 'zephyr', name: 'Zephyr', description: 'Female, bright, mid-high pitch', color: 'bg-gradient-to-br from-green-600 to-green-800' },
  { id: 'zubenelgenubi', name: 'Zubenelgenubi', description: 'Male, casual, mid-low pitch', color: 'bg-gradient-to-br from-green-300 to-green-500' }
];

const getVoiceAvatarUrl = (voice: any) => {
  if (!voice) return null;
  if (voice.imageUrl || voice.exteriorUrl) {
    return resolveImageUrl(voice.imageUrl || voice.exteriorUrl);
  }
  if (voice.avatar_path) {
    if (voice.avatar_path.startsWith('http')) return voice.avatar_path;
    return `${import.meta.env.VITE_SVC_API_URL}/api/tts_static/${voice.avatar_path}`;
  }
  return null;
};

export interface IngredientToVideoModeProps {
  hidePromptConfig?: boolean;
}

export default function IngredientToVideoMode({ hidePromptConfig = false }: IngredientToVideoModeProps = {}) {
  const context = useContext(GlobalAudioContext);
  const globalPlayer = context?.globalPlayer;
  const setGlobalPlayer = context?.setGlobalPlayer || (() => { });

  const [typeSelect, setTypeSelect] = useState<'frames' | 'ingredient'>('ingredient');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [projectName, setProjectName] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('achernar');
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const [openVoiceMenuId, setOpenVoiceMenuId] = useState<string | null>(null);
  const [openMainVoiceMenuId, setOpenMainVoiceMenuId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(true);
  type StoryboardFilter = 'all' | 'has_image' | 'no_image' | 'has_voice' | 'no_voice' | 'has_dialogue' | 'no_dialogue';
  const [storyboardFilter, setStoryboardFilter] = useState<StoryboardFilter>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const [ideaUrl, setIdeaUrl] = useState('');
  const [isAnalyzingIdea, setIsAnalyzingIdea] = useState(false);

  // Helper function to robustly find a TTS voice for a given character name.
  // It checks by ID, by Name, and crucially falls back to mapping via the Legacy Database Avatar URL
  // to handle cases where the TTS Voice wasn't successfully renamed but shares the same avatar.
  const findVoiceForCharacter = (targetName: string, voiceId?: string | number): any => {
    const res = voices.find(v => {
      // 1. Match by explicit voiceId
      if (voiceId && v.id == voiceId) return true;
      // 2. Match by clean voice name
      if (cleanVoiceName(v.name).trim().toLowerCase() === targetName.trim().toLowerCase()) return true;
      // 3. Fallback: match by legacy character name via avatar URL
      const avatarUrl = getVoiceAvatarUrl(v);
      if (avatarUrl && characterNames[avatarUrl]) {
        const legacyName = characterNames[avatarUrl].replace(/^\[Ngoại cảnh\]\s*/i, '').trim().toLowerCase();
        if (legacyName === targetName.trim().toLowerCase()) return true;
      }
      return false;
    });
    fetch('http://localhost:9999/debug', { method: 'POST', body: JSON.stringify({ targetName, voiceId, found: !!res, vName: res?.name, allVoices: voices.map(v => ({ id: v.id, name: v.name })) }) }).catch(() => null);
    return res;
  };

  // Script generator panel states
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [scriptDuration, setScriptDuration] = useState(5);
  const [scriptSeconds, setScriptSeconds] = useState(0);
  const [scriptText, setScriptText] = useState('');
  const [scriptCountry, setScriptCountry] = useState('Japan');
  const [scriptGenre, setScriptGenre] = useState('Shounen (action, power growth)');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // States for pagination and accordion
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});

  const toggleProject = (pName: string) => {
    setExpandedProjects(prev => ({ ...prev, [pName]: prev[pName] === false ? true : false }));
  };

  const [conversionProgress, setConversionProgress] = useState<Record<string, number>>({});
  const conversionIntervals = useRef<Record<string, any>>({});

  useEffect(() => {
    return () => {
      Object.values(conversionIntervals.current).forEach(interval => clearInterval(interval));
    };
  }, []);

  interface StoryBoard {
    id: string;
    prompt: string;
    characters: (string | File)[];
    voice?: string;
    dialogues?: DialogLine[];
  }

  const [storyBoards, setStoryBoards] = useState<StoryBoard[]>(() => {
    try {
      const saved = localStorage.getItem('tool_storyboards');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clean out invalid non-string objects (like {} created from saving File objects)
        return parsed.map((sb: any) => ({
          ...sb,
          characters: Array.isArray(sb.characters) ? sb.characters.filter((c: any) => typeof c === 'string') : []
        }));
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('tool_storyboards', JSON.stringify(storyBoards));
  }, [storyBoards]);
  const [characterNames, setCharacterNames] = useState<Record<string, string>>({});
  const [characterPaths, setCharacterPaths] = useState<Record<string, string>>({});
  const [userImages, setUserImages] = useState<Set<string>>(new Set());
  const [voices, setVoices] = useState<any[]>([]);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState<{ isOpen: boolean, storyIndex: number }>({ isOpen: false, storyIndex: -1 });
  const [characterModalTab, setCharacterModalTab] = useState<'character' | 'exterior'>('character');

  useEffect(() => {
    const fetchUserImages = async () => {
      try {
        const urls = new Set<string>();
        const names: Record<string, string> = {};
        const paths: Record<string, string> = {};

        // 1. Fetch voices from TTS microservice
        const voiceRes = await api_tts.getVoices();
        if (voiceRes && voiceRes.data) {
          setVoices(voiceRes.data);
          // We no longer add TTS avatars to visual characters gallery
        }

        // 2. Fetch legacy characters
        const charRes = await fetchWithAuth(`${API_URL}/veo3/character`);
        if (charRes.ok) {
          const charData = await charRes.json();
          charData.forEach((char: any) => {
            if (char.imageUrl) {
              const url = resolveImageUrl(char.imageUrl);
              urls.add(url);
              if (char.name && !names[url]) names[url] = char.name;
              try {
                const parsed = typeof char.imageUrl === 'string' ? JSON.parse(char.imageUrl) : char.imageUrl;
                if (parsed && parsed.localPath) paths[url] = parsed.localPath;
              } catch (e) { }
            }

            if (char.exteriorUrl) {
              const extUrl = resolveImageUrl(char.exteriorUrl);
              urls.add(extUrl);
              names[extUrl] = `[Ngoại cảnh] ${char.name || `Nhân vật ${char.id}`}`;
              try {
                const parsed = typeof char.exteriorUrl === 'string' ? JSON.parse(char.exteriorUrl) : char.exteriorUrl;
                if (parsed && parsed.localPath) paths[extUrl] = parsed.localPath;
              } catch (e) { }
            }
          });
        }

        setUserImages(urls);
        setCharacterNames(names);
        setCharacterPaths(paths);
      } catch (e) {
        console.error('Error fetching characters and voices:', e);
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
        // Giả sử lấy state characterNames, userImages trực tiếp từ bên trong (chúng ta đang ở trong func component nên có thể access trực tiếp)
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

          // Giới hạn số lượng tuỳ theo loại video
          const maxAllowed = typeSelect === 'frames' ? 2 : 3;

          // Bồi thêm ảnh từ excel nếu còn "cửa" (chưa đạt tới maxAllowed)
          for (const img of excelImages) {
            if (finalCharacters.length < maxAllowed && !finalCharacters.includes(img)) {
              finalCharacters.push(img);
            }
          }

          // Kéo phanh giữ form tuyệt đối (cho dù có quá nhiều @Name trong prompt)
          if (finalCharacters.length > maxAllowed) {
            finalCharacters.length = maxAllowed;
          }

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
  const [successToastMessage, setSuccessToastMessage] = useState('Thao tác thành công');
  const [showErrorToast, setShowErrorToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [tableData, setTableData] = useState<any[]>([]);

  const parseMetadata = (metadata: any) => {
    if (!metadata) return {};
    if (typeof metadata === 'object') return metadata;
    try {
      let parsed = JSON.parse(metadata);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (e) {
      return {};
    }
  };
  const [rowViewMode, setRowViewMode] = useState<Record<string, 'video' | 'audio'>>({});
  const [projectSentences, setProjectSentences] = useState<Record<string, any>>({});

  const getSentencesArray = (projName: string) => {
    const s = projectSentences[projName];
    if (!s) return [];
    if (Array.isArray(s)) return s;
    if (s.data && Array.isArray(s.data)) return s.data;
    return [];
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingSentences, setIsRefreshingSentences] = useState(false);
  const [mergingSentences, setMergingSentences] = useState<Record<string, boolean>>({});
  const [syncingSentences, setSyncingSentences] = useState<Record<string, boolean>>({});
  const [isConvertingAll, setIsConvertingAll] = useState<Record<string, boolean>>({});
  const [isSyncingAll, setIsSyncingAll] = useState<Record<string, boolean>>({});

  // Polling for sentences in Audio Mode
  useEffect(() => {
    const activeProjectNames = Object.keys(rowViewMode).filter(id => rowViewMode[id] === 'audio').map(id => {
      const row = tableData.find(r => r.id == id);
      if (!row) return null;
      return parseMetadata(row.metadata).projectName || null;
    }).filter(Boolean);

    if (activeProjectNames.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const pName of activeProjectNames) {
        const sentencesArr = getSentencesArray(pName);
        if (sentencesArr.length === 0) continue;
        const hasPending = sentencesArr.some((s: any) => s.status === 'Processing' || s.status === 'Queued' || s.status === 'Draft' || !s.audioPath);
        if (hasPending) {
          handleRefreshProjectSentences(pName, true);
        }
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [rowViewMode, projectSentences, tableData]);

  const handleMergeAudioToVideo = async (videoId: number, sentenceId: string) => {
    // 1. Lấy thông tin URL
    const row = tableData.find(r => r.id === videoId);
    if (!row || !(row.videoURL || row.result || row.result_image || row.s3Key)) {
      setShowErrorToast({ show: true, message: 'Không tìm thấy video gốc!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3000);
      return;
    }

    // Find video url
    const resultVid = row.videoURL || row.result || row.result_image || row.s3Key;
    let vUrl = '';
    if (typeof resultVid === 'string') {
      try {
        const parsed = JSON.parse(resultVid);
        vUrl = resolveImageUrl(parsed.url || parsed.s3Key || resultVid);
      } catch {
        vUrl = resolveImageUrl(resultVid);
      }
    } else if (Array.isArray(resultVid)) {
      vUrl = resolveImageUrl(resultVid[0]);
    } else {
      vUrl = resolveImageUrl(resultVid);
    }

    if (!vUrl.startsWith('http')) {
      vUrl = vUrl.startsWith('/') ? `${window.location.origin}${vUrl}` : vUrl;
    }

    const sentences = Object.values(projectSentences).flat() as any[];
    const sentence = sentences.find(s => s.id === sentenceId);
    if (!sentence || !(sentence.audioPath || sentence.status?.toLowerCase() === 'completed')) {
      setShowErrorToast({ show: true, message: 'Không tìm thấy file audio để làm mẫu giọng!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3000);
      return;
    }

    let aUrl = api_tts.getStreamUrl(sentence.id);

    const meta = parseMetadata(row.metadata);
    const projectName = meta.projectName || 'Du_An_Khac';

    setMergingSentences(prev => ({ ...prev, [sentenceId]: true }));
    setConversionProgress(prev => ({ ...prev, [sentenceId]: 0 }));

    conversionIntervals.current[sentenceId] = setInterval(async () => {
      try {
        const pRes = await fetch(`${API_URL}/tts/voice-conversion-progress/${sentenceId}`);
        const pData = await pRes.json();
        if (pData.progress > 0) setConversionProgress(prev => ({ ...prev, [sentenceId]: pData.progress }));
      } catch (e) { }
    }, 1500);

    try {
      const cleanProjectName = projectName.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
      const outputPath = `C:\\${cleanProjectName}\\video_${videoId}.mp4`;

      const response = await fetchWithAuth(`${API_URL}/tts/voice-conversion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: vUrl,
          targetAudioUrl: aUrl,
          sentenceId: sentenceId,
          outputPath: outputPath
        })
      });

      clearInterval(conversionIntervals.current[sentenceId]);
      setConversionProgress(prev => ({ ...prev, [sentenceId]: 100 }));

      const resData = await response.json();
      if (response.ok && resData.success) {
        // Cập nhật kết quả vào database để hiển thị trên UI
        await fetchWithAuth(`${API_URL}/veo3/video/${videoId}/video-url`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoURL: outputPath })
        });

        fetchImages();

        setSuccessToastMessage(`Đã convert & lưu về ${outputPath}!`);

        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
      } else {
        setShowErrorToast({ show: true, message: `Lỗi Server: ${resData.message || 'Unknown error'}` });
        setTimeout(() => setShowErrorToast(prev => ({ ...prev, show: false })), 4000);
      }
    } catch (e: any) {
      clearInterval(conversionIntervals.current[sentenceId]);
      setShowErrorToast({ show: true, message: `Lỗi kết nối: ${e.message}` });
      setTimeout(() => setShowErrorToast(prev => ({ ...prev, show: false })), 3000);
    } finally {
      clearInterval(conversionIntervals.current[sentenceId]);
      setMergingSentences(prev => ({ ...prev, [sentenceId]: false }));
    }
  };

  const handleSyncMergeVoice = async (videoId: number, sentenceId: string) => {
    const row = tableData.find(r => r.id === videoId);
    if (!row || !(row.videoURL || row.result || row.result_image || row.s3Key)) {
      setShowErrorToast({ show: true, message: 'Không tìm thấy video gốc!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3000);
      return;
    }

    const resultVid = row.videoURL || row.result || row.result_image || row.s3Key;
    let vUrl = '';
    if (typeof resultVid === 'string') {
      try {
        vUrl = resolveImageUrl(JSON.parse(resultVid).url || JSON.parse(resultVid).s3Key || resultVid);
      } catch { vUrl = resolveImageUrl(resultVid); }
    } else if (Array.isArray(resultVid)) {
      vUrl = resolveImageUrl(resultVid[0]?.url || resultVid[0]?.s3Key || resultVid[0]);
    } else { vUrl = resolveImageUrl(resultVid); }

    if (!vUrl.startsWith('http')) vUrl = vUrl.startsWith('/') ? `${window.location.origin}${vUrl}` : vUrl;

    const sentences = Object.values(projectSentences).flat() as any[];
    const sentence = sentences.find(s => s.id === sentenceId);
    if (!sentence || !(sentence.audioPath || sentence.status?.toLowerCase() === 'completed')) {
      setShowErrorToast({ show: true, message: 'Không tìm thấy file audio để ghép!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3000);
      return;
    }

    let aUrl = api_tts.getStreamUrl(sentence.id);
    const meta = parseMetadata(row.metadata);
    const projectName = meta.projectName || 'Du_An_Khac';

    setSyncingSentences(prev => ({ ...prev, [sentenceId]: true }));

    try {
      const cleanProjectName = projectName.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
      const outputPath = `C:\\${cleanProjectName}\\video_${videoId}.mp4`;

      const response = await fetchWithAuth(`${API_URL}/tts/sync-merge-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: vUrl,
          targetAudioUrl: aUrl,
          outputPath: outputPath
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        await fetchWithAuth(`${API_URL}/veo3/video/${videoId}/video-url`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoURL: outputPath })
        });
        fetchImages();
        setSuccessToastMessage(`Đã ghép giọng & lưu về ${outputPath}!`);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
      } else {
        setShowErrorToast({ show: true, message: `Lỗi Server: ${resData.message || 'Unknown error'}` });
        setTimeout(() => setShowErrorToast(prev => ({ ...prev, show: false })), 4000);
      }
    } catch (e: any) {
      setShowErrorToast({ show: true, message: `Lỗi kết nối: ${e.message}` });
      setTimeout(() => setShowErrorToast(prev => ({ ...prev, show: false })), 3000);
    } finally {
      setSyncingSentences(prev => ({ ...prev, [sentenceId]: false }));
    }
  };

  const handleConvertAllProject = async (projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rows = groupedData[projectName] || [];
    const allProjectSentences = getSentencesArray(projectName);

    const tasks: { videoId: number, sentenceId: string, videoUrl: string, audioUrl: string }[] = [];

    for (const row of rows) {
      if (!(row.videoURL || row.result || row.result_image || row.s3Key)) continue;

      const meta = parseMetadata(row.metadata);
      const sceneIndex = meta.sceneIndex;

      let sentences = [];
      if (meta.sentenceStartIndex !== undefined && meta.sentenceCount !== undefined) {
        sentences = allProjectSentences.filter((s: any) => s.order_index >= meta.sentenceStartIndex && s.order_index < meta.sentenceStartIndex + meta.sentenceCount);
      } else {
        sentences = allProjectSentences.filter((s: any) => s.mode === `ultimate-scene-${sceneIndex}`);
        if (sentences.length === 0 && allProjectSentences.length > 0 && sceneIndex === 0) {
          sentences = allProjectSentences;
        }
      }

      for (const s of sentences) {
        if (s.audioPath || s.status?.toLowerCase() === 'completed') {
          // Find real video URL
          const resultVid = row.videoURL || row.result || row.result_image || row.s3Key;
          let vUrl = '';
          if (typeof resultVid === 'string') {
            try {
              const parsed = JSON.parse(resultVid);
              vUrl = resolveImageUrl(parsed.url || parsed.s3Key || resultVid);
            } catch {
              vUrl = resolveImageUrl(resultVid);
            }
          } else if (Array.isArray(resultVid)) {
            vUrl = resolveImageUrl(resultVid[0]);
          } else {
            vUrl = resolveImageUrl(resultVid);
          }

          if (!vUrl.startsWith('http')) {
            vUrl = vUrl.startsWith('/') ? `${window.location.origin}${vUrl}` : vUrl;
          }

          tasks.push({ videoId: row.id, sentenceId: s.id, videoUrl: vUrl, audioUrl: api_tts.getStreamUrl(s.id) });
          break; // Chỉ cần convert câu thoại đầu tiên hợp lệ của video
        }
      }
    }

    if (tasks.length === 0) {
      setShowErrorToast({ show: true, message: 'Không có Video & Audio nào thoả điều kiện Convert!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3000);
      return;
    }

    setIsConvertingAll(prev => ({ ...prev, [projectName]: true }));

    let successCount = 0;
    // Chạy tuần tự qua Backend
    for (const task of tasks) {
      setMergingSentences(prev => ({ ...prev, [task.sentenceId]: true }));
      setConversionProgress(prev => ({ ...prev, [task.sentenceId]: 0 }));

      conversionIntervals.current[task.sentenceId] = setInterval(async () => {
        try {
          const pRes = await fetch(`${API_URL}/tts/voice-conversion-progress/${task.sentenceId}`);
          const pData = await pRes.json();
          if (pData.progress > 0) setConversionProgress(prev => ({ ...prev, [task.sentenceId]: pData.progress }));
        } catch (e) { }
      }, 1500);

      const cleanProjectName = projectName.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
      const outputPath = `C:\\${cleanProjectName}\\video_${task.videoId}.mp4`;

      try {
        const response = await fetchWithAuth(`${API_URL}/tts/voice-conversion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: task.videoUrl,
            targetAudioUrl: task.audioUrl,
            sentenceId: task.sentenceId,
            outputPath: outputPath
          })
        });

        clearInterval(conversionIntervals.current[task.sentenceId]);
        setConversionProgress(prev => ({ ...prev, [task.sentenceId]: 100 }));

        const resData = await response.json();
        if (response.ok && resData.success) {
          successCount++;

          // Cập nhật kết quả vào database
          await fetchWithAuth(`${API_URL}/veo3/video/${task.videoId}/video-url`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoURL: outputPath })
          });

          // Nghỉ 1s trước khi gọi file tải tiếp theo
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err) {
        clearInterval(conversionIntervals.current[task.sentenceId]);
        console.error('Convert failed for', task.videoId, err);
      } finally {
        clearInterval(conversionIntervals.current[task.sentenceId]);
        setMergingSentences(prev => ({ ...prev, [task.sentenceId]: false }));
      }
    }

    setIsConvertingAll(prev => ({ ...prev, [projectName]: false }));
    if (successCount > 0) fetchImages();
    setSuccessToastMessage(`Đã hoàn tất chuyển đổi giọng cho ${successCount}/${tasks.length} video!`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
  };

  const handleSyncMergeVoiceAllProject = async (projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rows = groupedData[projectName] || [];
    const allProjectSentences = getSentencesArray(projectName);

    const tasks: { videoId: number, sentenceId: string, videoUrl: string, audioUrl: string }[] = [];

    for (const row of rows) {
      if (!(row.videoURL || row.result || row.result_image || row.s3Key)) continue;

      const meta = parseMetadata(row.metadata);
      const sceneIndex = meta.sceneIndex;

      let sentences = [];
      if (meta.sentenceStartIndex !== undefined && meta.sentenceCount !== undefined) {
        sentences = allProjectSentences.filter((s: any) => s.order_index >= meta.sentenceStartIndex && s.order_index < meta.sentenceStartIndex + meta.sentenceCount);
      } else {
        sentences = allProjectSentences.filter((s: any) => s.mode === `ultimate-scene-${sceneIndex}`);
        if (sentences.length === 0 && allProjectSentences.length > 0 && sceneIndex === 0) {
          sentences = allProjectSentences;
        }
      }

      for (const s of sentences) {
        if (s.audioPath || s.status?.toLowerCase() === 'completed') {
          const resultVid = row.videoURL || row.result || row.result_image || row.s3Key;
          let vUrl = '';
          if (typeof resultVid === 'string') {
            try {
              const parsed = JSON.parse(resultVid);
              vUrl = resolveImageUrl(parsed.url || parsed.s3Key || resultVid);
            } catch { vUrl = resolveImageUrl(resultVid); }
          } else if (Array.isArray(resultVid)) {
            vUrl = resolveImageUrl(resultVid[0]);
          } else { vUrl = resolveImageUrl(resultVid); }

          if (!vUrl.startsWith('http')) vUrl = vUrl.startsWith('/') ? `${window.location.origin}${vUrl}` : vUrl;

          tasks.push({ videoId: row.id, sentenceId: s.id, videoUrl: vUrl, audioUrl: api_tts.getStreamUrl(s.id) });
          break;
        }
      }
    }

    if (tasks.length === 0) {
      setShowErrorToast({ show: true, message: 'Không có Video & Audio nào thoả điều kiện Ghép giọng!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3000);
      return;
    }

    setIsSyncingAll(prev => ({ ...prev, [projectName]: true }));
    let successCount = 0;

    for (const task of tasks) {
      setSyncingSentences(prev => ({ ...prev, [task.sentenceId]: true }));
      const cleanProjectName = projectName.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
      const outputPath = `C:\\${cleanProjectName}\\video_${task.videoId}.mp4`;

      try {
        const response = await fetchWithAuth(`${API_URL}/tts/sync-merge-voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: task.videoUrl,
            targetAudioUrl: task.audioUrl,
            outputPath: outputPath
          })
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          successCount++;
          await fetchWithAuth(`${API_URL}/veo3/video/${task.videoId}/video-url`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoURL: outputPath })
          });
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err) {
        console.error('Merge voice failed for', task.videoId, err);
      } finally {
        setSyncingSentences(prev => ({ ...prev, [task.sentenceId]: false }));
      }
    }

    setIsSyncingAll(prev => ({ ...prev, [projectName]: false }));
    if (successCount > 0) fetchImages();
    setSuccessToastMessage(`Đã ghép giọng thành công ${successCount}/${tasks.length} video!`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
  };

  const handleRefreshProjectSentences = async (projectName: string, silent = false) => {
    if (!projectName) return;
    if (!silent) setIsRefreshingSentences(true);
    try {
      const scripts = await api_tts.getScripts();
      const script = scripts.data.find((s: any) => s.title === projectName);
      if (script) {
        const sentences = await api_tts.getSentences(script.id);
        setProjectSentences(prev => ({ ...prev, [projectName]: sentences.data }));
      }
    } catch (err) {
      console.error("Lỗi làm mới câu thoại:", err);
    } finally {
      if (!silent) setIsRefreshingSentences(false);
    }
  };

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
          prompt: b.trim(),
          characters: []
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

  // Auto-sync genre when country changes
  useEffect(() => {
    const cfg = COUNTRY_MAP[scriptCountry as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan;
    setScriptGenre(cfg.genres[0]);
  }, [scriptCountry]);

  const handleGenerateScript = async () => {
    const apiKey = localStorage.getItem('tool_gemini_api_key') || '';
    if (!apiKey.trim()) {
      setShowErrorToast({ show: true, message: 'Vui lòng nhập Google Gemini API Key ở thanh Menu bên trái!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3500);
      return;
    }
    if (!scriptText.trim()) {
      setShowErrorToast({ show: true, message: 'Vui lòng nhập nội dung kịch bản!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3500);
      return;
    }
    setIsGeneratingScript(true);
    const cfg = COUNTRY_MAP[scriptCountry as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan;
    const totalSeconds = scriptDuration * 60 + scriptSeconds;
    const scenesCount = Math.max(3, Math.round(totalSeconds / 8));
    const durationLabel = `${scriptDuration}p${scriptSeconds > 0 ? ` ${scriptSeconds}s` : ''}`;
    const availableChars = Array.from(new Set(Object.values(characterNames).map(n => n.replace('[Ngoại cảnh] ', '')))).join(', ');
    const userPrompt = `Script/Story content:\n${scriptText}\n\nRequirements:\n- EXACTLY ${scenesCount} scenes total. DO NOT exceed ${scenesCount} scenes! You MUST summarize the story by cutting out less important dialogue and minor scenes while preserving the core narrative. DO NOT stuff too much dialogue into a single scene. Keep the STRICT limit of MAXIMUM 2 lines of dialogue per scene.\n- Animation style: ${cfg.countryStyle}\n- Genre: ${scriptGenre}\n- Style details: ${cfg.styleDesc.trim()}\n\nCRITICAL INSTRUCTIONS:\n1. USE character names exactly as they appear in the Script/Story content (e.g., "俺", "社長"). \n2. IF a character from the script matches one in this list: [${availableChars}], you MAY use the name from the list to help with mapping, but priority is keeping the story consistent.\n3. For any narrator text or unidentified speaker, ALWAYS use "Người kể chuyện". ABSOLUTELY DO NOT use "[None]" as a character name!\n4. NEVER invent new names like "Rena" or "Sayuri" if they are not in the provided script.\n5. DO NOT TRANSLATE DIALOGUE AND THOUGHT! You MUST copy the dialogue and thought EXACTLY in its original language (Japanese, Vietnamese, etc.). ONLY visual descriptions should be in English.\n6. DO NOT DESCRIBE CHARACTER APPEARANCE. Focus deeply on the environment, action, and situation instead.\n7. DO NOT CREATE EXTRA DIALOGUE. Only use dialogue strictly present in the provided script.\n8. FOR THOUGHT SCENES WITHOUT DIALOGUE, the character MUST NOT move their mouth. You MUST explicitly include "mouth closed, no lip movement, not speaking" in the ACTION_EMOTION field.\n9. Output STRICTLY as a valid JSON object with a "prompts" array containing exactly ${scenesCount} items.`;
    try {
      const fetchResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `SYSTEM_INSTRUCTION:\n${storySystemPrompt}\n\nUSER_CONTENT:\n${userPrompt}`
            }]
          }],
          generationConfig: { temperature: 1 }
        })
      });

      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json();
        throw new Error(errorData.error?.message || 'Lỗi kết nối Gemini API');
      }

      const data = await fetchResponse.json();
      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        setShowErrorToast({ show: true, message: 'AI không trả về nội dung. Vui lòng thử lại!' });
        setTimeout(() => setShowErrorToast({ show: false, message: '' }), 4000);
        return;
      }

      const extractDialogues = (text: string): DialogLine[] => {
        const results: DialogLine[] = [];
        if (!text || text.toLowerCase() === 'none') return results;

        const bracketRegex = /\[(.*?)\]\s*(.*)/g;
        let match;
        let found = false;
        while ((match = bracketRegex.exec(text)) !== null) {
          if (match[1] && match[2]) {
            results.push({ characterName: match[1].trim(), text: match[2].trim().replace(/^['"「『]+|['"」』]+$/g, ''), emotion: 'NEUTRAL' });
            found = true;
          }
        }

        if (!found) {
          const colonRegex = /^([^:]+):\s*(.*)$/gm;
          while ((match = colonRegex.exec(text)) !== null) {
            if (match[1] && match[2]) {
              results.push({ characterName: match[1].trim(), text: match[2].trim().replace(/^['"「『]+|['"」』]+$/g, ''), emotion: 'NEUTRAL' });
              found = true;
            }
          }
        }
        return results;
      };

      const blocks: { prompt: string, dialogues: DialogLine[] }[] = [];

      try {
        // Automatically correct [None] hallucination from AI
        let fixedText = text.replace(/\[None\]/gi, '[Người kể chuyện]');

        // System prompt instructs AI to return JSON, so we parse it first
        const cleanJson = fixedText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanJson);
        if (parsedData.prompts && Array.isArray(parsedData.prompts)) {
          parsedData.prompts.forEach((scene: any) => {
            let sd = '[SCENE_START]\n\n';
            if (scene.SCENE_HEADING) sd += `SCENE_HEADING: ${scene.SCENE_HEADING}\n\n`;
            if (scene.CHARACTER) sd += `CHARACTER: ${scene.CHARACTER}\n\n`;
            if (scene.CINEMATOGRAPHY) sd += `CINEMATOGRAPHY: ${scene.CINEMATOGRAPHY}\n\n`;
            if (scene.LIGHTING) sd += `LIGHTING: ${scene.LIGHTING}\n\n`;
            if (scene.ENVIRONMENT) sd += `ENVIRONMENT: ${scene.ENVIRONMENT}\n\n`;
            if (scene.ACTION_EMOTION) sd += `ACTION_EMOTION: ${scene.ACTION_EMOTION}\n\n`;
            const dialogues: DialogLine[] = [];
            if (scene.DIALOGUE && scene.DIALOGUE.toLowerCase() !== 'none') {
              sd += `DIALOGUE: ${scene.DIALOGUE}\n\n`;
              dialogues.push(...extractDialogues(scene.DIALOGUE));
            }
            if (scene.THOUGHT && scene.THOUGHT.toLowerCase() !== 'none') {
              sd += `THOUGHT: ${scene.THOUGHT}\n\n`;
              dialogues.push(...extractDialogues(scene.THOUGHT));
            }
            if (scene.STYLE) sd += `STYLE: ${scene.STYLE}\n\n`;
            sd += '[SCENE_END]';
            blocks.push({ prompt: sd, dialogues });
          });
        }
      } catch (err) {
        // Fallback to text matching if JSON parsing fails
        const sceneBlocks = text.split('[SCENE_START]').map(s => s.trim()).filter(Boolean);
        if (sceneBlocks.length > 0) {
          const getField = (block: string, field: string): string => {
            const regex = new RegExp(`${field}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, 's');
            const match = block.match(regex);
            return match ? match[1].trim() : '';
          };
          for (const block of sceneBlocks) {
            const heading = getField(block, 'SCENE_HEADING');
            const cinematography = getField(block, 'CINEMATOGRAPHY');
            const lighting = getField(block, 'LIGHTING');
            const environment = getField(block, 'ENVIRONMENT');
            const action = getField(block, 'ACTION_EMOTION');
            const dialogue = getField(block, 'DIALOGUE');
            const thought = getField(block, 'THOUGHT');
            let sd = '';
            const dialogues: DialogLine[] = [];
            if (heading) sd += `[${heading}]\n`;
            if (cinematography) sd += `🎥 ${cinematography}\n`;
            if (lighting) sd += `💡 ${lighting}\n`;
            if (environment) sd += `🌆 ${environment}\n`;
            if (action) sd += `🎬 ${action}`;
            if (dialogue && dialogue.toLowerCase() !== 'none') {
              sd += `\n💬 ${dialogue}`;
              dialogues.push(...extractDialogues(dialogue));
            }
            if (thought && thought.toLowerCase() !== 'none') {
              sd += `\n💭 ${thought}`;
              dialogues.push(...extractDialogues(thought));
            }
            if (sd.trim()) blocks.push({ prompt: sd.trim(), dialogues });
          }
        }
      }

      // Final Fallback: parse raw chunks and extract dialogues
      if (blocks.length === 0) {
        text.split('\n\n').filter((b: string) => b.trim()).forEach((b: string) => {
          let promptText = b.trim();
          // Try to insert newlines before known labels if they are mashed
          const labels = ['SCENE_HEADING:', 'CHARACTER:', 'CINEMATOGRAPHY:', 'LIGHTING:', 'ENVIRONMENT:', 'ACTION_EMOTION:', 'DIALOGUE:', 'THOUGHT:', 'STYLE:', '\\[SCENE_END\\]'];
          labels.forEach(label => {
            const regex = new RegExp(`\\s+${label}`, 'g');
            promptText = promptText.replace(regex, `\n\n${label.replace('\\', '')}`);
          });

          blocks.push({ prompt: promptText, dialogues: extractDialogues(promptText) });
        });
      }

      let maxId = 0;
      storyBoards.forEach(sb => { const m = String(sb.id).match(/\d+$/); if (m) maxId = Math.max(maxId, parseInt(m[0])); });

      let matchedCount = 0;
      const uniqueCharNames = new Set<string>();

      const newBoards = blocks.map((b, i: number) => {
        const matchedCharacters: (string | File)[] = [];

        // Match names to voices
        const sceneChars = new Set<string>();
        b.dialogues.forEach(d => sceneChars.add(d.characterName.toLowerCase()));

        // Match names from CHARACTER field in prompt (for scenes without dialogue)
        const charMatch = b.prompt.match(/CHARACTER:\s*(.+?)(?=\n|$)/i);
        if (charMatch) {
          const charNamesInPrompt = charMatch[1].split(',').map(s => s.trim());
          charNamesInPrompt.forEach(cName => {
            if (cName.toLowerCase() !== 'none' && !cName.includes('Người kể chuyện')) {
              uniqueCharNames.add(cName);
              const matchedVoice = findVoiceForCharacter(cName);
              const avatarUrl = getVoiceAvatarUrl(matchedVoice);
              if (avatarUrl) {
                if (!matchedCharacters.includes(avatarUrl)) {
                  matchedCharacters.push(avatarUrl);
                  matchedCount++;
                }
              }
            }
          });
        }

        // Match names from dialogues (to map voices)
        b.dialogues.forEach(dlg => {
          uniqueCharNames.add(dlg.characterName);
          const matchedVoice = findVoiceForCharacter(dlg.characterName);
          if (matchedVoice) {
            dlg.voiceId = matchedVoice.id;
            const avatarUrl = getVoiceAvatarUrl(matchedVoice);
            if (avatarUrl) {
              if (!matchedCharacters.includes(avatarUrl)) {
                matchedCharacters.push(avatarUrl);
                matchedCount++;
              }
            }
          }
        });

        // AUTO-CORRECT: If Gemini hallucinated 'Người kể chuyện' but there is exactly 1 valid character in the scene,
        // we assume the dialogue belongs to that character.
        if (matchedCharacters.length === 1 && b.dialogues.length > 0) {
          const soleCharUrl = String(matchedCharacters[0]);
          const soleCharNameRaw = characterNames[soleCharUrl] || '';
          const soleCharName = soleCharNameRaw.replace(/^\[Ngoại cảnh\]\s*/i, '').trim();
          if (soleCharName) {
            b.dialogues.forEach(dlg => {
              if (dlg.characterName.toLowerCase() === 'người kể chuyện' || dlg.characterName.toLowerCase() === 'none') {
                dlg.characterName = soleCharName;
                // Map voiceId again with correct name
                const matchedVoice = findVoiceForCharacter(soleCharName);
                if (matchedVoice) {
                  dlg.voiceId = matchedVoice.id;
                }
              }
            });
          }
        }

        return {
          id: `Scene_${maxId + i + 1}`,
          prompt: b.prompt,
          characters: matchedCharacters,
          dialogues: b.dialogues
        };
      });

      setStoryBoards(prev => [...prev, ...newBoards]);
      setShowScriptPanel(false);
      setScriptText('');

      const totalUnique = uniqueCharNames.size;
      const unmatched = Array.from(uniqueCharNames).filter(n => !findVoiceForCharacter(n) && n.toLowerCase() !== 'người kể chuyện');

      if (unmatched.length > 0) {
        setShowErrorToast({
          show: true,
          message: `Đã tạo kịch bản! Tự động khớp ${matchedCount} ảnh nhân vật. CẢNH BÁO: Không tìm thấy giọng/ảnh cho: ${unmatched.join(', ')}.`
        });
        setTimeout(() => setShowErrorToast({ show: false, message: '' }), 6000);
      } else {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
    } catch (e: any) {
      console.error('[handleGenerateScript] Lỗi SDK:', e);
      let errMsg = 'Kiểm tra lại API Key!';
      if (e && e.message) {
        errMsg = e.message;
      } else if (e && e.statusText) {
        errMsg = e.statusText;
      }
      setShowErrorToast({ show: true, message: `Lỗi Gemini API: ${errMsg}` });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 5000);
    } finally {
      setIsGeneratingScript(false);
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
    if (!window.confirm(`Bạn có chắc nhận muốn XÓA VĨNH VIỄN ${selectedIds.size} mục này không?`)) return;
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
    if (!projectName.trim()) {
      setShowErrorToast({ show: true, message: 'Tên dự án còn trống , bạn cần đặt tên dự án để tiếp tục' });
      setTimeout(() => setShowErrorToast(prev => ({ ...prev, show: false })), 3500);
      return;
    }

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

    const hasMissingCharacters = storyBoards.some(sb => sb.characters.length === 0);
    if (hasMissingCharacters) {
      setShowErrorToast({ show: true, message: 'Lỗi Bắt Buộc: Tất cả phân cảnh phải chọn ít nhất 1 ảnh (nhân vật / ingredient) để tham chiếu!' });
      setTimeout(() => setShowErrorToast(prev => ({ ...prev, show: false })), 4000);
      return;
    }

    const missingVoiceChars = new Set<string>();
    storyBoards.forEach(sb => {
      if (sb.dialogues) {
        sb.dialogues.forEach(dlg => {
          if (dlg.characterName && dlg.characterName.toLowerCase() !== 'người kể chuyện') {
            const voice = findVoiceForCharacter(dlg.characterName, dlg.voiceId);
            if (!voice) {
              missingVoiceChars.add(dlg.characterName);
            }
          }
        });
      }
    });

    if (missingVoiceChars.size > 0) {
      if (!window.confirm(`Các nhân vật sau chưa được gán Giọng đọc: ${Array.from(missingVoiceChars).join(', ')}.\nBạn vẫn muốn tiếp tục? (Các câu thoại của nhân vật này sẽ được đưa vào Kịch bản nhưng chưa có âm thanh)`)) {
        return;
      }
    }

    setIsSaving(true);
    let successCount = 0;
    const successfulIds = new Set<string>();

    let ttsScriptId = '';
    let orderCounter = 0;
    const hasAnyDialogue = storyBoards.some(sb => sb.dialogues && sb.dialogues.length > 0);
    
    // Tự động tạo hoặc lấy TTS Project ID
    let currentTtsProjectId = '';
    try {
      const pName = projectName.trim();
      const ttsProjectsRes = await api_tts.getProjects();
      const existingTtsProject = Array.isArray(ttsProjectsRes.data) ? ttsProjectsRes.data.find((p: any) => p.name === pName) : null;
      if (existingTtsProject) {
        currentTtsProjectId = existingTtsProject.id;
      } else {
        const newTtsProject = await api_tts.createProject(pName);
        if (newTtsProject?.id) currentTtsProjectId = newTtsProject.id;
      }
    } catch (e) {
      console.error('Lỗi khi lấy/tạo TTS Project', e);
    }

    if (hasAnyDialogue) {
      try {
        const pName = projectName.trim();
        const scriptsRes = await api_tts.getScripts();
        const scriptsArr = Array.isArray(scriptsRes.data) ? scriptsRes.data : ((scriptsRes.data as any)?.data && Array.isArray((scriptsRes.data as any).data) ? (scriptsRes.data as any).data : []);
        const existingScript = scriptsArr.find((s: any) => s.title === pName);

        if (existingScript) {
          ttsScriptId = existingScript.id;
        } else {
          const scriptRes = await api_tts.createScript(pName, "Vietnamese", 200, currentTtsProjectId || undefined);
          if (scriptRes && scriptRes.data && scriptRes.data.id) {
            ttsScriptId = scriptRes.data.id;
          }
        }
      } catch (e) {
        console.error('Error creating or finding TTS script:', e);
      }
    }

    for (const sb of storyBoards) {
      try {
        const aspectStr = aspectRatio === '16:9' ? '169' : '916';
        const voiceToUse = sb.voice || selectedVoice;
        const typeI2VValue = `${typeSelect}${aspectStr}-${voiceToUse}`;

        const base64Promises = sb.characters.map(charData => {
          if (typeof charData === 'string') {
            if (charData.trim().startsWith('{')) {
              return Promise.resolve(charData);
            }
            if (characterPaths[charData]) {
              const resolvedStr = JSON.stringify({ url: charData, localPath: characterPaths[charData] });
              console.log(`[localPath Log] Tìm thấy trong thư viện cũ ->`, resolvedStr);
              return Promise.resolve(resolvedStr);
            }

            // Fallback: If charData is a TTS avatar URL or unknown, try to find its corresponding legacy character
            try {
              console.log(`[localPath Debug] Đang cố map TTS Avatar:`, charData);
              const ttsVoice = voices.find(v => {
                const vAvatar = getVoiceAvatarUrl(v);
                const cAvatar = resolveImageUrl(charData);
                return vAvatar === cAvatar || vAvatar === charData;
              });

              if (ttsVoice) {
                const targetName = cleanVoiceName(ttsVoice.name).toLowerCase();
                console.log(`[localPath Debug] Tên của TTS Voice này là:`, targetName);

                const matchedLegacyUrl = Object.keys(characterNames).find(url => {
                  const lName = cleanVoiceName(characterNames[url]).toLowerCase();
                  return lName === targetName && characterPaths[url];
                });

                if (matchedLegacyUrl) {
                  const resolvedStr = JSON.stringify({ url: matchedLegacyUrl, localPath: characterPaths[matchedLegacyUrl] });
                  console.log(`[localPath Log] Đã chuyển đổi từ TTS Avatar sang Legacy ->`, resolvedStr);
                  return Promise.resolve(resolvedStr);
                } else {
                  console.log(`[localPath Debug] KHÔNG tìm thấy Nhân Vật Cũ nào có tên là:`, targetName);
                  console.log(`[localPath Debug] Danh sách tên Legacy đang có:`, characterNames);
                }
              } else {
                console.log(`[localPath Debug] KHÔNG tìm thấy TTS Voice nào khớp với URL này trong list voices!`);
              }
            } catch (e) { console.error(e); }

            const fallbackStr = JSON.stringify({ url: charData, localPath: charData });
            console.log(`[localPath Log] Fallback (Không tìm thấy) ->`, fallbackStr);
            return Promise.resolve(fallbackStr);
          }
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(charData);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
        });

        const base64Images = await Promise.all(base64Promises);

        const ownerId = authService.getCurrentUserId();
        const payload: any = {
          prompt: sb.prompt,
          status: 'pending',
          typeI2V: typeI2VValue,
          ownerID: ownerId,
          metadata: JSON.stringify({
            jobId: sb.id,
            sceneIndex: storyBoards.indexOf(sb),
            projectName: projectName.trim() || 'Dự Án Khác',
            voice: voiceToUse,
            sentenceStartIndex: orderCounter,
            sentenceCount: sb.dialogues ? sb.dialogues.length : 0
          })
        };

        if (base64Images[0]) payload.image1 = base64Images[0];
        if (base64Images[1]) payload.image2 = base64Images[1];
        if (base64Images[2]) payload.image3 = base64Images[2];

        // Parallel execution of video creation and audio creation
        const tasks: Promise<any>[] = [];

        // 1. Video Job
        tasks.push(
          fetchWithAuth(`${API_URL}/veo3/video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(response => {
            if (response.ok) {
              successCount++;
              successfulIds.add(sb.id);
            } else {
              console.error(`Status ${response.status} for Video Job ID ${sb.id}`);
            }
          })
        );

        // 2. Audio Jobs
        if (ttsScriptId && sb.dialogues && sb.dialogues.length > 0) {
          for (const dlg of sb.dialogues) {
            // Match voice by ID (if pre-matched) or by Name or Avatar
            const voiceToFallback = voices.find(v => v.id == voiceToUse) || voices[0];
            const voice = findVoiceForCharacter(dlg.characterName, dlg.voiceId) || voiceToFallback;

            if (voice) {
              const sceneIndex = storyBoards.indexOf(sb);
              tasks.push(
                api_tts.addSentence(ttsScriptId, dlg.text, String(voice.id), dlg.emotion, `ultimate-scene-${sceneIndex}`, "", 1.0, 1.0, orderCounter++, dlg.characterName)
                  .then(sentenceRes => {
                    if (sentenceRes.data && sentenceRes.data.id) {
                      return api_tts.renderSentence(sentenceRes.data.id);
                    }
                  })
                  .catch(err => {
                    console.error(`[Audio Job] Lỗi render câu thoại "${dlg.text.substring(0, 20)}...":`, err);
                  })
              );
            } else {
              const sceneIndex = storyBoards.indexOf(sb);
              tasks.push(
                api_tts.addSentence(ttsScriptId, dlg.text, undefined, dlg.emotion, `ultimate-scene-${sceneIndex}`, "", 1.0, 1.0, orderCounter++, dlg.characterName)
                  .catch(err => {
                    console.error(`[Audio Job] Lỗi lưu câu thoại "${dlg.text.substring(0, 20)}...":`, err);
                  })
              );
              console.warn(`[Audio Job] Không tìm thấy voice cho nhân vật: ${dlg.characterName}`);
            }
          }
        }

        await Promise.all(tasks);

      } catch (error: any) {
        console.error(`Error processing Job ID ${sb.id}:`, error);
      }
    }

    // Sau khi loop xong, lưu Project vào Backend (IngredientProject)
    try {
      const pName = projectName.trim();
      const savePayload = {
        name: pName,
        storyBoards: storyBoards.map(sb => ({
          ...sb,
          characters: sb.characters.filter(c => typeof c === 'string') // chỉ lưu text/URLs
        }))
      };
      await fetchWithAuth(`${API_URL}/veo3/ingredient-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload)
      });
    } catch (e) {
      console.error('Lưu DB IngredientProject lỗi:', e);
    }

    setIsSaving(false);
    if (successCount > 0) {
      setIsSaved(true);
      setSuccessToastMessage(`Tạo thành công ${successCount} tiến trình video & thoại!`);
      setShowSuccessToast(true);
      setTimeout(() => setIsSaved(false), 2000);
      setTimeout(() => setShowSuccessToast(false), 3000);
      fetchImages();
      setStoryBoards(prev => prev.filter(sb => !successfulIds.has(sb.id)));
    } else {
      alert('Lỗi: Không tạo được tiến trình nào. Vui lòng kiểm tra lại!');
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

  const handleAddToGallery = async (row: any) => {
    const name = row.character || `Nhân vật ${row.id.toString().substring(0, 4)}`;

    // Validate if character exists in TTS voices
    if (voices.some(v => v.name.toLowerCase() === name.toLowerCase()) || Object.values(characterNames).some(n => n.toLowerCase() === name.toLowerCase())) {
      setShowErrorToast({ show: true, message: `Nhân vật "${name}" đã tồn tại trong kho TTS!` });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3000);
      return;
    }

    const isUploadFailed = String(row.upload_status || row.uploadStatus || '').toLowerCase() === 'failed';
    const resultData = isUploadFailed
      ? (row.result || row.result_image || row.s3Url || row.videoURL || row.s3Key)
      : (row.s3Url || row.videoURL || row.result || row.result_image || row.s3Key);

    if (!resultData) {
      setShowErrorToast({ show: true, message: 'Không có ảnh để thêm vào kho!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3000);
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
    } else {
      resultImages = [extractUrl(resultData)];
    }

    const imgUrl = resultImages[0];
    if (!imgUrl) {
      setShowErrorToast({ show: true, message: 'Không tìm thấy ảnh hợp lệ!' });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 3000);
      return;
    }

    try {
      setSuccessToastMessage(`Đang xử lý thêm nhân vật ${name}...`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);

      const response = await fetch(imgUrl);
      if (!response.ok) throw new Error("Không thể tải ảnh");

      const blob = await response.blob();
      const file = new File([blob], "avatar.png", { type: blob.type });

      // Save to old character database
      await fetchWithAuth(`${API_URL}/veo3/character`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: imgUrl,
          name: name,
          source: 'generate',
          ownerID: authService.getCurrentUserId()
        })
      });

      // Save to TTS AI microservice
      await api_tts.createVoice(name, "Thêm từ Ingredient Mode", "Vietnamese", "unknown", false, file);

      setSuccessToastMessage(`Đã thêm nhân vật AI: ${name}`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      // Reload voices so it appears in dropdowns immediately
      const voicesRes = await api_tts.getVoices();
      if (voicesRes && voicesRes.data) {
        setVoices(voicesRes.data);
      }
    } catch (e: any) {
      setShowErrorToast({ show: true, message: 'Lỗi khi thêm nhân vật: ' + (e.response?.data?.detail || e.message) });
      setTimeout(() => setShowErrorToast({ show: false, message: '' }), 4000);
    }
  };

  const handleDownload = async (row: any) => {
    const isUploadFailed = String(row.upload_status || row.uploadStatus || '').toLowerCase() === 'failed';
    const resultData = isUploadFailed
      ? (row.result || row.result_image || row.s3Url || row.videoURL || row.s3Key)
      : (row.s3Url || row.videoURL || row.result || row.result_image || row.s3Key);

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
    const ingredientData = tableData.filter(row => !row.typeI2V?.startsWith('text'));

    ingredientData.forEach(row => {
      let pName = 'Dự Án Khác';
      if (row.metadata) {
        const parsed = parseMetadata(row.metadata);
        if (parsed.projectName && typeof parsed.projectName === 'string' && parsed.projectName.trim() !== '') {
          pName = parsed.projectName;
        }
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

  const toggleRowAudioMode = async (row: any) => {
    const isAudio = rowViewMode[row.id] === 'audio';
    setRowViewMode(prev => ({ ...prev, [row.id]: isAudio ? 'video' : 'audio' }));

    if (!isAudio) {
      // Fetch sentences if not already loaded for this project
      const meta = parseMetadata(row.metadata);
      const projectName = meta.projectName;
      if (projectName && !projectSentences[projectName]) {
        try {
          // Find the script with this name
          const scripts = await api_tts.getScripts();
          const script = scripts.data.find((s: any) => s.title === projectName);
          if (script) {
            const sentences = await api_tts.getSentences(script.id);
            setProjectSentences(prev => ({ ...prev, [projectName]: sentences.data }));
          }
        } catch (err) {
          console.error("Lỗi khi tải câu thoại:", err);
        }
      }
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 text-gray-200">

      {/* Top 50% - Editor (Commented out per user request) */}
      {false && (
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6 shrink-0 relative overflow-visible z-20">
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

            <div className="space-y-2">
              <label className="text-sm text-purple-200/70 font-medium">Type</label>
              <div className="relative flex p-1 bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
                <div
                  className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] bg-gradient-to-r from-fuchsia-600/80 to-purple-600/80 rounded-lg shadow-[0_0_15px_rgba(192,132,252,0.3)] transition-all duration-300 ease-out border border-white/10"
                  style={{ transform: typeSelect === 'frames' ? 'translateX(0)' : 'translateX(100%)' }}
                />
                <button
                  onClick={() => setTypeSelect('frames')}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition-colors ${typeSelect === 'frames' ? 'text-white drop-shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Frames to Video
                </button>
                <button
                  onClick={() => setTypeSelect('ingredient')}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition-colors ${typeSelect === 'ingredient' ? 'text-white drop-shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Ingredient to Video
                </button>
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
                  {isAnalyzingIdea ? 'AI Đang Xử Lý (15s)...' : 'Phân Tích Bằng AI'}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm text-purple-200/70 font-medium">Dữ Liệu Đầu Vào</label>
              <div className="grid grid-cols-3 gap-2">
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
                    setStoryBoards(prev => [...prev, { id: newId, prompt: '', characters: [] as (string | File)[] }]);
                  }}
                  className="relative group w-full h-[60px] flex flex-col items-center justify-center bg-[#1e1e2d]/60 border border-white/10 rounded-xl hover:bg-[#2c2c42] hover:border-purple-400/50 transition-all active:scale-95 shadow-inner p-0"
                >
                  <Plus className="text-gray-500 group-hover:text-purple-400 mb-1 transition-colors" size={20} />
                  <span className="text-xs font-medium text-gray-400 group-hover:text-purple-300 transition-colors tracking-tight">Thêm Thủ Công</span>
                </button>

                {/* Nút Tạo Kịch Bản */}
                <button
                  onClick={() => setShowScriptPanel(true)}
                  className="relative group w-full h-[60px] flex flex-col items-center justify-center bg-[#0d1e2e]/60 border border-white/10 rounded-xl hover:bg-[#0e2840] hover:border-cyan-400/50 transition-all active:scale-95 shadow-inner p-0"
                >
                  <BookOpen className="text-gray-500 group-hover:text-cyan-400 mb-1 transition-colors" size={20} />
                  <span className="text-xs font-medium text-gray-400 group-hover:text-cyan-300 transition-colors tracking-tight">Tạo Kịch Bản</span>
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
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="bg-black/40 border border-white/10 hover:border-fuchsia-500/50 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-200 outline-none transition-colors cursor-pointer flex items-center h-full min-w-[160px]"
                >
                  <span className="truncate">
                    {storyboardFilter === 'all' && `Lọc: Tất cả (${storyBoards.length})`}
                    {storyboardFilter === 'has_image' && `Đã có ảnh (${storyBoards.filter(sb => sb.characters && sb.characters.length > 0).length})`}
                    {storyboardFilter === 'no_image' && `Chưa có ảnh (${storyBoards.filter(sb => !sb.characters || sb.characters.length === 0).length})`}
                    {storyboardFilter === 'has_voice' && `Đã có Voice (${storyBoards.filter(sb => !!sb.voice).length})`}
                    {storyboardFilter === 'no_voice' && `Chưa có Voice (${storyBoards.filter(sb => !sb.voice).length})`}
                    {storyboardFilter === 'has_dialogue' && `Đã có Thoại (${storyBoards.filter(sb => sb.dialogues && sb.dialogues.length > 0).length})`}
                    {storyboardFilter === 'no_dialogue' && `Chưa có Thoại (${storyBoards.filter(sb => !sb.dialogues || sb.dialogues.length === 0).length})`}
                  </span>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180 text-fuchsia-400' : ''}`} />
                  </div>
                </button>

                {isFilterDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />
                    <div className="absolute top-full mt-2 right-0 w-[220px] bg-[#1a1a24] border border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden z-50 py-1">
                      {[
                        { value: 'all', label: `Tất cả (${storyBoards.length})` },
                        { value: 'has_image', label: `Đã có ảnh (${storyBoards.filter(sb => sb.characters && sb.characters.length > 0).length})` },
                        { value: 'no_image', label: `Chưa có ảnh (${storyBoards.filter(sb => !sb.characters || sb.characters.length === 0).length})` },
                        { value: 'has_voice', label: `Đã có Voice (${storyBoards.filter(sb => !!sb.voice).length})` },
                        { value: 'no_voice', label: `Chưa có Voice (${storyBoards.filter(sb => !sb.voice).length})` },
                        { value: 'has_dialogue', label: `Đã có Thoại (${storyBoards.filter(sb => sb.dialogues && sb.dialogues.length > 0).length})` },
                        { value: 'no_dialogue', label: `Chưa có Thoại (${storyBoards.filter(sb => !sb.dialogues || sb.dialogues.length === 0).length})` }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setStoryboardFilter(option.value as StoryboardFilter);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${storyboardFilter === option.value ? 'bg-fuchsia-900/40 text-fuchsia-300 font-medium' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                        >
                          <span>{option.label}</span>
                          {storyboardFilter === option.value && <Check size={14} className="text-fuchsia-400" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
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
                  <span className="hidden sm:inline">Xóa toàn bộ Prompt</span>
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

          <div className={`transition-all duration-500 overflow-y-auto pr-2 flex flex-wrap gap-4 content-start items-start ${isPromptExpanded ? 'opacity-100 flex-1 min-h-[540px] max-h-[540px] h-[540px]' : 'opacity-0 h-0 max-h-0 overflow-hidden m-0 p-0 pointer-events-none'}`}>
            {storyBoards.length === 0 ? (
              showScriptPanel ? (
                /* ===== PANEL TẠO KỊCH BẢN ===== */
                <div className="h-full w-full bg-black/30 border border-cyan-500/20 rounded-xl overflow-auto p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <BookOpen size={16} className="text-cyan-400" />
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-fuchsia-300">
                        Tạo Kịch Bản Bằng AI
                      </span>
                    </h3>
                    <button
                      onClick={() => setShowScriptPanel(false)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex flex-col xl:flex-row gap-5 h-[calc(100%-52px)]">
                    {/* CỘT TRÁI */}
                    <div className="w-full xl:w-5/12 flex flex-col gap-4">
                      {/* Thời lượng: Phút / Giây */}
                      <div className="space-y-2">
                        <label className="text-xs text-purple-200/70 font-medium">
                          ⏱ Thời lượng video — ~{Math.max(1, Math.round((scriptDuration * 60 + scriptSeconds) / 8))} cảnh (≈ 8 giây/cảnh)
                        </label>
                        <div className="flex gap-3">
                          {([
                            { label: 'Phút', value: scriptDuration, setter: setScriptDuration },
                            { label: 'Giây', value: scriptSeconds, setter: setScriptSeconds },
                          ] as { label: string; value: number; setter: React.Dispatch<React.SetStateAction<number>> }[]).map(({ label, value, setter }) => (
                            <div key={label} className="flex-1 flex flex-col gap-1.5">
                              <span className="text-[11px] text-gray-400 font-medium text-center tracking-widest uppercase">{label}</span>
                              <div className="relative group/stepper flex items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-fuchsia-500/40 focus-within:border-fuchsia-500/60 transition-all duration-200">
                                {/* Number input (hides native spinner) */}
                                <input
                                  type="number"
                                  min={0} max={59}
                                  value={value}
                                  onChange={e => setter(Math.min(59, Math.max(0, Number(e.target.value))))}
                                  className="flex-1 bg-transparent py-3 pl-4 pr-1 text-center text-xl font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                {/* Custom ▲▼ buttons stacked on right */}
                                <div className="flex flex-col h-full border-l border-white/8 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setter(v => Math.min(59, v + 1))}
                                    className="flex-1 px-2.5 flex items-center justify-center text-gray-500 hover:text-fuchsia-300 hover:bg-fuchsia-500/15 transition-all active:bg-fuchsia-500/25 border-b border-white/8 text-[9px] leading-none select-none"
                                  >▲</button>
                                  <button
                                    type="button"
                                    onClick={() => setter(v => Math.max(0, v - 1))}
                                    className="flex-1 px-2.5 flex items-center justify-center text-gray-500 hover:text-fuchsia-300 hover:bg-fuchsia-500/15 transition-all active:bg-fuchsia-500/25 text-[9px] leading-none select-none"
                                  >▼</button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Textarea */}
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-xs text-purple-200/70 font-medium">1. Nội Dung / Ý Tưởng Kịch Bản</label>
                        <textarea
                          className="flex-1 min-h-[200px] xl:min-h-0 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-200 outline-none focus:border-cyan-400/50 transition-colors resize-none"
                          placeholder={"Nhập tóm tắt nội dung hoặc toàn bộ kịch bản của bạn...\n\nVD: Câu chuyện về một chàng trai trẻ phát hiện mình có sức mạnh đặc biệt và phải đối mặt với thế lực bóng tối đang xâm chiếm thành phố..."}
                          value={scriptText}
                          onChange={e => setScriptText(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* CỘT PHẢI */}
                    <div className="w-full xl:w-7/12 flex flex-col gap-4">
                      <div>
                        <label className="text-xs text-purple-200/70 font-medium mb-3 block">2. Định Hướng Nghệ Thuật</label>

                        {/* Quốc gia */}
                        <div className="space-y-2 mb-4">
                          <p className="text-xs text-gray-400 font-medium">Quốc gia / Phong cách hoạt hình:</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {Object.entries(COUNTRY_MAP).map(([key, val]) => (
                              <button
                                key={key}
                                onClick={() => setScriptCountry(key)}
                                className={`px-2 py-2 rounded-lg text-xs font-medium transition-all border text-left ${scriptCountry === key
                                  ? 'bg-fuchsia-600/80 border-fuchsia-400/60 text-white shadow-[0_0_10px_rgba(192,132,252,0.25)]'
                                  : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:text-gray-200 hover:border-white/20'
                                  }`}
                              >
                                {val.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Thể loại */}
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400 font-medium">Thể loại phim:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(COUNTRY_MAP[scriptCountry as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan).genres.map(genre => (
                              <button
                                key={genre}
                                onClick={() => setScriptGenre(genre)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${scriptGenre === genre
                                  ? 'bg-cyan-600/80 border-cyan-400/60 text-white shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                                  : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                  }`}
                              >
                                {genre}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Nút Hoàn Tất */}
                      <div className="mt-auto pt-3 border-t border-white/5">
                        <button
                          onClick={handleGenerateScript}
                          disabled={isGeneratingScript || !scriptText.trim()}
                          className="w-full bg-gradient-to-r from-cyan-600/80 to-fuchsia-600/80 hover:from-cyan-500 hover:to-fuchsia-500 text-white rounded-xl px-4 py-3 text-sm font-semibold transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                          {isGeneratingScript ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                          {isGeneratingScript ? 'Đang Tạo Kịch Bản AI...' : '✨ Hoàn Tất – Tạo Kịch Bản'}
                        </button>
                        {isGeneratingScript && (
                          <p className="text-center text-xs text-gray-500 mt-2 animate-pulse">
                            AI đang phân tích và viết kịch bản, vui lòng chờ...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-black/20 text-gray-500 italic gap-3">
                  <BookOpen size={28} className="text-gray-600/60" />
                  <span>Chưa có dữ liệu. Hãy tải lên file Excel hoặc nhấn "Tạo Kịch Bản".</span>
                </div>
              )
            ) : (
              storyBoards.map((sb, idx) => {
                if (storyboardFilter === 'has_image' && (!sb.characters || sb.characters.length === 0)) return null;
                if (storyboardFilter === 'no_image' && sb.characters && sb.characters.length > 0) return null;
                if (storyboardFilter === 'has_voice' && !sb.voice) return null;
                if (storyboardFilter === 'no_voice' && sb.voice) return null;
                if (storyboardFilter === 'has_dialogue' && (!sb.dialogues || sb.dialogues.length === 0)) return null;
                if (storyboardFilter === 'no_dialogue' && sb.dialogues && sb.dialogues.length > 0) return null;

                return (
                  <div key={idx} className="w-full xl:w-[calc(50%-0.5rem)] bg-black/30 border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-colors flex flex-col shrink-0 min-h-[250px]">
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
                      <div className="flex items-center space-x-4">


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
                    </div>
                    <div className="p-4 flex flex-col xl:flex-row gap-4 h-auto min-h-[420px]">
                      {/* Ô 1: Textarea */}
                      <div className="w-full xl:w-2/5 flex flex-col h-auto">
                        <textarea
                          className="w-full flex-1 bg-black/40 border border-transparent rounded-lg p-3 text-sm text-gray-200 outline-none focus:border-fuchsia-400/50 transition-colors resize-none min-h-[200px]"
                          value={sb.prompt}
                          placeholder="Nhập prompt cho phân cảnh này..."
                          onChange={(e) => {
                            const newSb = [...storyBoards];
                            newSb[idx].prompt = e.target.value;
                            setStoryBoards(newSb);
                          }}
                        />
                      </div>

                      {/* Ô 2 & 3: Ảnh & Buttons */}
                      <div className="w-full xl:w-3/5 flex flex-col bg-black/20 rounded-lg p-3 border border-white/5 space-y-3 h-auto">

                        {/* Khu vực ảnh hiển thị to rõ */}
                        <div className="grid grid-cols-3 gap-2 flex-1 place-content-start">
                          {sb.characters.length === 0 && (
                            <div className="col-span-3 w-full h-full min-h-[80px] flex items-center justify-center text-gray-500 text-sm italic">
                              Chưa có hình nhân vật/ngoại cảnh
                            </div>
                          )}
                          {sb.characters.map((charData, cIdx) => {
                            const isFile = charData instanceof File;
                            const isPath = typeof charData === 'string' && (/^[A-Za-z]:[\\/]/.test(charData) || charData.startsWith('/'));

                            let rawLabelName = isFile ? charData.name : (characterNames[charData as string] || 'Không Tên');
                            if (isPath && rawLabelName === 'Không Tên') {
                              rawLabelName = (charData as string).split(/[\\/]/).pop() || (charData as string);
                            }

                            const labelName = rawLabelName.replace(/^\[Ngoại cảnh\]\s*/i, '');
                            const previewUrl = isFile ? URL.createObjectURL(charData) : resolveImageUrl(charData as string);
                            return (
                              <div key={cIdx} className="relative group flex flex-col items-center bg-fuchsia-900/20 border border-fuchsia-500/30 rounded-lg p-2 w-full shadow-sm max-w-[120px]">
                                <div className="w-full aspect-square rounded-md overflow-hidden bg-black/40 mb-2 flex items-center justify-center p-1">
                                  <img src={previewUrl} className="w-full h-full object-contain" />
                                </div>
                                <span className="text-[11px] text-fuchsia-200 font-medium truncate w-full text-center" title={labelName}>
                                  {labelName}
                                </span>
                                <button
                                  onClick={() => {
                                    const newSb = [...storyBoards];
                                    newSb[idx].characters.splice(cIdx, 1);
                                    setStoryBoards(newSb);
                                  }}
                                  className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-red-500/80 hover:bg-black/60 hover:text-red-400 text-white rounded-full shadow-md transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Khu vực Lời thoại (Dialogues) */}
                        {sb.dialogues && sb.dialogues.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {sb.dialogues.map((dlg, dIdx) => {
                              const voice = findVoiceForCharacter(dlg.characterName, dlg.voiceId);
                              let errorMsg = null;
                              if (!voice && dlg.characterName.toLowerCase() !== 'người kể chuyện') {
                                errorMsg = "Thiếu nhân vật";
                              } else if (voice && (!voice.samples || voice.samples.length === 0) && dlg.characterName.toLowerCase() !== 'người kể chuyện') {
                                errorMsg = "Thiếu Voice";
                              }

                              return (
                                <div key={dIdx} className={`flex items-start gap-2 p-2 rounded-lg border ${errorMsg ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'bg-black/30 border-white/5'}`}>
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0">
                                    <img src={getVoiceAvatarUrl(voice) || 'https://ui-avatars.com/api/?name=' + dlg.characterName + '&background=random'} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                      <span className={`text-[11px] font-bold ${errorMsg ? 'text-red-400' : 'text-cyan-300'}`}>{dlg.characterName}</span>
                                      {errorMsg && <span className="text-[9px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-1"><AlertCircle size={10} /> {errorMsg}</span>}
                                    </div>
                                    <input
                                      type="text"
                                      className="text-xs text-gray-300 mt-0.5 w-full bg-transparent border-b border-transparent focus:border-cyan-500/50 outline-none"
                                      value={dlg.text}
                                      onChange={(e) => {
                                        const newSb = [...storyBoards];
                                        newSb[idx].dialogues![dIdx].text = e.target.value;
                                        setStoryBoards(newSb);
                                      }}
                                    />
                                  </div>
                                  <button onClick={() => {
                                    const newSb = [...storyBoards];
                                    newSb[idx].dialogues!.splice(dIdx, 1);
                                    setStoryBoards(newSb);
                                  }} className="text-gray-500 hover:text-red-400 p-1">
                                    <X size={14} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Các Nút Action */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">

                          {/* Voice Selection cho riêng Prompt */}
                          <div className="relative flex items-center shadow-none">
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
                                onClick={() => setOpenMainVoiceMenuId(openMainVoiceMenuId === sb.id ? null : sb.id)}
                                className="flex items-center justify-center space-x-1 text-xs bg-fuchsia-900/30 hover:bg-fuchsia-800/50 text-fuchsia-200 border border-fuchsia-500/30 rounded-full px-3 py-1.5 transition-colors shadow-sm h-8 whitespace-nowrap"
                              >
                                <Activity size={13} />
                                <span className="ml-1">Thêm Voice</span>
                              </button>
                            )}

                            {openMainVoiceMenuId === sb.id && !sb.voice && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setOpenMainVoiceMenuId(null)} />
                                <div className="absolute left-0 bottom-full mb-2 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.8)] overflow-hidden z-40 max-h-[140px] overflow-y-auto">
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
                                        setOpenMainVoiceMenuId(null);
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

                          <div className="relative flex items-center">
                            <button
                              onClick={() => setOpenVoiceMenuId(openVoiceMenuId === sb.id ? null : sb.id)}
                              className="flex items-center justify-center space-x-1 text-xs bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-200 border border-cyan-500/30 rounded-full px-3 py-1.5 transition-colors shadow-sm h-8 whitespace-nowrap"
                            >
                              <Activity size={13} />
                              <span className="ml-1">Thêm Thoại</span>
                            </button>

                            {openVoiceMenuId === sb.id && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setOpenVoiceMenuId(null)} />
                                <div className="absolute left-0 bottom-full mb-2 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl overflow-hidden z-40 max-h-[200px] overflow-y-auto">
                                  <div className="px-3 py-2 border-b border-white/5 bg-black/20 text-[10px] text-gray-400 uppercase tracking-wider font-semibold sticky top-0 backdrop-blur-md z-10">
                                    Chọn nhân vật
                                  </div>
                                  {voices.map(v => (
                                    <button
                                      key={v.id}
                                      onClick={() => {
                                        const newSb = [...storyBoards];
                                        if (!newSb[idx].dialogues) newSb[idx].dialogues = []; if (!newSb[idx].characters) newSb[idx].characters = [];
                                        newSb[idx].dialogues!.push({ characterName: v.name, text: 'Nhập thoại vào đây...', emotion: 'NEUTRAL', voiceId: v.id });

                                        const avatarUrl = getVoiceAvatarUrl(v);
                                        if (avatarUrl && !newSb[idx].characters.includes(avatarUrl)) {
                                          newSb[idx].characters.push(avatarUrl);
                                        }

                                        setStoryBoards(newSb);
                                        setOpenVoiceMenuId(null);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-2 group border-b border-white/5 last:border-0 relative z-0"
                                    >
                                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 overflow-hidden bg-white/10`}>
                                        <img src={getVoiceAvatarUrl(v) || 'https://ui-avatars.com/api/?name=' + v.name} className="w-full h-full object-cover" />
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-white font-medium">{v.name}</div>
                                      </div>
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => {
                                      const newSb = [...storyBoards];
                                      if (!newSb[idx].dialogues) newSb[idx].dialogues = []; if (!newSb[idx].characters) newSb[idx].characters = [];
                                      newSb[idx].dialogues!.push({ characterName: 'Người kể chuyện', text: 'Nhập thoại vào đây...', emotion: 'NEUTRAL' });
                                      setStoryBoards(newSb);
                                      setOpenVoiceMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-2 group border-b border-white/5 last:border-0 relative z-0"
                                  >
                                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 overflow-hidden bg-gray-600`}>
                                      <User size={12} className="text-white" />
                                    </div>
                                    <div>
                                      <div className="text-[11px] text-white font-medium">Người kể chuyện</div>
                                    </div>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {sb.characters.length < (typeSelect === 'frames' ? 2 : 3) && (
                            <div className="flex space-x-2 shrink-0">
                              <button
                                title="Thêm nhân vật"
                                onClick={() => setIsCharacterModalOpen({ isOpen: true, storyIndex: idx })}
                                className="flex items-center justify-center space-x-1 text-xs bg-fuchsia-600/80 hover:bg-fuchsia-500 text-white border border-fuchsia-400/50 rounded-full px-3 py-1.5 transition-colors shadow-sm h-8 whitespace-nowrap"
                              >
                                <User size={13} />
                                {(sb.characters.length === 0 || sb.characters.length > 0) && <span className="ml-1">Thêm nhân vật</span>}
                              </button>

                              <label
                                title="Tải ảnh từ máy lên"
                                className="flex items-center justify-center space-x-1 text-xs bg-indigo-600/80 hover:bg-indigo-500 text-white border border-indigo-400/50 rounded-full px-3 py-1.5 transition-colors shadow-sm cursor-pointer h-8 whitespace-nowrap"
                              >
                                <Upload size={13} />
                                {(sb.characters.length === 0 || sb.characters.length > 0) && <span className="ml-1">Tải lên</span>}
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      const filesArray = Array.from(e.target.files);
                                      const newSb = [...storyBoards];
                                      const limit = typeSelect === 'frames' ? 2 : 3;
                                      const currentLen = newSb[idx].characters.length;
                                      const canAdd = limit - currentLen;
                                      if (canAdd > 0) {
                                        const toAdd = filesArray.slice(0, canAdd).map(f => {
                                          const electronPath = (f as any).path;
                                          return electronPath || f;
                                        });
                                        newSb[idx].characters.push(...toAdd);
                                        setStoryBoards(newSb);
                                      }
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}

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
                    <div className="flex items-center gap-3">
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

                      {projectSentences[project] && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRefreshProjectSentences(project); }}
                          disabled={isRefreshingSentences}
                          className={`p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-fuchsia-400 transition-all ${isRefreshingSentences ? 'animate-spin' : ''}`}
                          title="Làm mới trạng thái Audio"
                        >
                          <RotateCcw size={14} />
                        </button>
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

                      <button
                        onClick={(e) => handleConvertAllProject(project, e)}
                        disabled={isConvertingAll[project] || isSyncingAll[project]}
                        className={`flex items-center space-x-1 px-2.5 py-1.5 border rounded-lg transition-colors shadow-sm ${isConvertingAll[project]
                          ? 'bg-purple-900/50 border-purple-500/50 text-purple-400 cursor-not-allowed'
                          : 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50 text-purple-400'
                          }`}
                        title="Convert tất cả các video đã render xong ảnh và có audio"
                      >
                        {isConvertingAll[project] ? (
                          <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                        ) : (
                          <Wand2 size={16} />
                        )}
                        <span className="text-[10px] font-semibold whitespace-nowrap hidden md:inline">Convert All</span>
                      </button>

                      <button
                        onClick={(e) => handleSyncMergeVoiceAllProject(project, e)}
                        disabled={isConvertingAll[project] || isSyncingAll[project]}
                        className={`flex items-center space-x-1 px-2.5 py-1.5 border rounded-lg transition-colors shadow-sm ${isSyncingAll[project]
                          ? 'bg-blue-900/50 border-blue-500/50 text-blue-400 cursor-not-allowed'
                          : 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-400'
                          }`}
                        title="Ghép giọng tất cả các video đã render xong ảnh và có audio"
                      >
                        {isSyncingAll[project] ? (
                          <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                        ) : (
                          <Volume2 size={16} />
                        )}
                        <span className="text-[10px] font-semibold whitespace-nowrap hidden md:inline">Ghép giọng All</span>
                      </button>

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
                            <th className="py-3 px-5">Ảnh Nhân Vật</th>
                            <th className="py-3 px-5 min-w-[200px]">
                              {rowViewMode[Object.keys(rowViewMode)[0]] === 'audio' ? 'Kịch bản & Audio' : 'Prompt'}
                            </th>
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
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const imgData = row.image || row.imageRef || row.image_ref;
                                    let images: string[] = [];

                                    const extractUrl = (item: any) => typeof item === 'object' && item !== null && item.url ? item.url : item;

                                    if (Array.isArray(imgData)) {
                                      images = imgData.map(extractUrl);
                                    } else if (typeof imgData === 'string') {
                                      try {
                                        const parsed = JSON.parse(imgData);
                                        if (Array.isArray(parsed)) {
                                          images = parsed.map(extractUrl);
                                        } else if (typeof parsed === 'object' && parsed !== null && parsed.url) {
                                          images = [parsed.url];
                                        } else {
                                          images = [imgData];
                                        }
                                      } catch (e) {
                                        images = [imgData];
                                      }
                                    }

                                    // Add video images
                                    [row.image1, row.image2, row.image3].forEach(img => {
                                      if (img) {
                                        try {
                                          const parsed = JSON.parse(img);
                                          if (parsed && parsed.url) images.push(resolveImageUrl(parsed.url));
                                          else images.push(resolveImageUrl(img));
                                        } catch {
                                          images.push(resolveImageUrl(img));
                                        }
                                      }
                                    });

                                    if (images.length > 0) {
                                      return (
                                        <>
                                          {images.slice(0, 3).map((imgUrl, i) => (
                                            <div key={i} className="w-28 aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/40 shadow-sm cursor-pointer hover:border-fuchsia-500/50 transition-colors flex items-center justify-center p-0.5" onClick={() => setPreviewImage(imgUrl)}>
                                              <img src={imgUrl} alt="Ref" className="w-full h-full object-contain" />
                                            </div>
                                          ))}
                                          {images.length > 3 && (
                                            <div className="w-28 aspect-video rounded-lg flex items-center justify-center bg-fuchsia-900/60 border border-fuchsia-500/30 text-xs font-medium text-fuchsia-300">
                                              +{images.length - 3}
                                            </div>
                                          )}
                                        </>
                                      );
                                    }

                                    return (
                                      <div className="w-28 aspect-video bg-black/20 rounded-lg flex items-center justify-center border border-white/10">
                                        <ImageIcon className="text-gray-500/50" size={18} />
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="py-4 px-4" colSpan={rowViewMode[row.id] === 'audio' ? 3 : 1}>
                                {rowViewMode[row.id] === 'audio' ? (
                                  <div className="flex flex-col gap-4 w-full max-w-5xl my-2">
                                    {(() => {
                                      const meta = parseMetadata(row.metadata);
                                      const projectName = meta.projectName;
                                      const sceneIndex = meta.sceneIndex;
                                      const allProjectSentences = getSentencesArray(projectName);

                                      let sentences = [];
                                      if (meta.sentenceStartIndex !== undefined && meta.sentenceCount !== undefined) {
                                        sentences = allProjectSentences.filter((s: any) => s.order_index >= meta.sentenceStartIndex && s.order_index < meta.sentenceStartIndex + meta.sentenceCount);
                                      } else {
                                        // Dành cho dữ liệu cũ
                                        sentences = allProjectSentences.filter((s: any) => s.mode === `ultimate-scene-${sceneIndex}`);
                                        if (sentences.length === 0 && allProjectSentences.length > 0 && sceneIndex === 0) {
                                          // Chỉ hiện fallback ở scene đầu tiên nếu db cũ bị mất mode
                                          sentences = allProjectSentences;
                                        }
                                      }

                                      if (sentences.length === 0) {
                                        if (meta.sentenceCount === 0) {
                                          return (
                                            <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-xl bg-black/10 gap-2">
                                              <div className="text-gray-500 italic text-sm">🎬 Cảnh này không có thoại.</div>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div className="flex flex-col items-center justify-center py-8 border border-dashed border-white/10 rounded-xl bg-black/20 gap-2">
                                            <div className="text-gray-500 italic text-sm">Không tìm thấy câu thoại cho dự án "{projectName}"</div>
                                            <p className="text-[10px] text-gray-600 max-w-xs text-center px-4">Lưu ý: Nếu đây là dữ liệu cũ, hệ thống có thể không khớp được từng cảnh. Hãy thử bấm "Tạo tất cả" lại để đồng bộ hoàn toàn.</p>
                                          </div>
                                        );
                                      }

                                      return sentences.map((s: any) => {
                                        const voice = voices.find(v => v.id == s.voice_id);
                                        return (
                                          <div key={s.id} className="relative flex flex-col w-full group/sentence">
                                            <div className="flex gap-2 items-stretch rounded-xl border border-slate-700 bg-[#151B2B] p-2 shadow-lg transition-all hover:border-indigo-500/50">

                                              {/* LEFT PANEL: CONTROLS */}
                                              <div className="flex flex-col justify-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700 shrink-0 w-[240px]">
                                                {/* Voice & Emotion */}
                                                <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
                                                  <div className="flex items-center gap-2 text-xs text-slate-300">
                                                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span className="font-bold truncate max-w-[120px]">{voice?.name || s.characterName || 'Người kể chuyện'}</span>
                                                  </div>
                                                  <div className="flex items-center">
                                                    <span className="text-indigo-400 font-bold uppercase text-[10px] px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">{s.emotion || 'NEUTRAL'}</span>
                                                  </div>
                                                </div>

                                                {/* Speed & Pitch & Player */}
                                                <div className="flex items-center justify-end mt-1">
                                                  <div className="flex items-center gap-1.5">
                                                    <button
                                                      onClick={() => {
                                                        const isReady = s.audioPath || s.status?.toLowerCase() === 'completed';
                                                        if (!isReady) return;
                                                        if (globalPlayer?.id === s.id) {
                                                          setGlobalPlayer(null);
                                                        } else {
                                                          const url = api_tts.getStreamUrl(s.id);
                                                          setGlobalPlayer({ url, title: s.text.substring(0, 50), id: s.id });
                                                        }
                                                      }}
                                                      disabled={!(s.audioPath || s.status?.toLowerCase() === 'completed')}
                                                      className={`p-2 rounded-full transition-all ${(s.audioPath || s.status?.toLowerCase() === 'completed')
                                                        ? globalPlayer?.id === s.id
                                                          ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-playing'
                                                          : 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:scale-110 active:scale-95'
                                                        : 'bg-slate-700 text-slate-500 opacity-50 cursor-not-allowed'
                                                        }`}
                                                    >
                                                      {globalPlayer?.id === s.id ? <PauseCircle size={18} /> : <Play size={18} fill="currentColor" />}
                                                    </button>

                                                    {(s.audioPath || s.status?.toLowerCase() === 'completed') && (row.videoURL || row.result || row.result_image || row.s3Key) && (
                                                      (() => {
                                                        const resultVid = row.videoURL || row.result || row.result_image || row.s3Key;
                                                        const isConverted = typeof resultVid === 'string' && (resultVid.includes('final_vc_') || resultVid.includes('merged_'));
                                                        return (
                                                          <button
                                                            onClick={() => handleMergeAudioToVideo(row.id, s.id)}
                                                            disabled={mergingSentences[s.id] || syncingSentences[s.id]}
                                                            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-xs font-medium ${mergingSentences[s.id]
                                                              ? 'bg-purple-900/50 border-purple-500/50 text-purple-400 cursor-not-allowed'
                                                              : isConverted
                                                                ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                                                : 'bg-purple-600/20 border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white hover:border-purple-500 hover:shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                                                              }`}
                                                          >
                                                            {mergingSentences[s.id] ? (
                                                              <div className="w-3.5 h-3.5 rounded-full border-2 border-purple-400 border-t-transparent animate-spin shrink-0" />
                                                            ) : isConverted ? (
                                                              <Check size={14} className="shrink-0" />
                                                            ) : (
                                                              <Wand2 size={14} className="shrink-0" />
                                                            )}
                                                            {mergingSentences[s.id] && conversionProgress[s.id] > 0
                                                              ? `Convert... ${conversionProgress[s.id]}%`
                                                              : mergingSentences[s.id]
                                                                ? 'Đang xử lý...'
                                                                : isConverted ? 'Đã convert' : 'Convert video'}
                                                          </button>
                                                        );
                                                      })()
                                                    )}
                                                    {(s.audioPath || s.status?.toLowerCase() === 'completed') && (row.videoURL || row.result || row.result_image || row.s3Key) && (
                                                      <button
                                                        onClick={() => handleSyncMergeVoice(row.id, s.id)}
                                                        disabled={mergingSentences[s.id] || syncingSentences[s.id]}
                                                        className={`px-3 py-1.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-xs font-medium ${syncingSentences[s.id]
                                                          ? 'bg-blue-900/50 border-blue-500/50 text-blue-400 cursor-not-allowed'
                                                          : 'bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                                                          }`}
                                                      >
                                                        {syncingSentences[s.id] ? (
                                                          <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
                                                        ) : (
                                                          <Volume2 size={14} className="shrink-0" />
                                                        )}
                                                        Ghép giọng
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>

                                              {/* RIGHT PANEL: TEXTAREA */}
                                              <div className="flex-1 flex flex-col gap-2">
                                                <textarea
                                                  value={s.text}
                                                  onChange={async (e) => {
                                                    const val = e.target.value;
                                                    setProjectSentences(prev => {
                                                      const sArr = Array.isArray(prev[projectName]) ? prev[projectName] : (prev[projectName]?.data && Array.isArray(prev[projectName].data) ? prev[projectName].data : []);
                                                      return { ...prev, [projectName]: sArr.map((x: any) => x.id === s.id ? { ...x, text: val } : x) };
                                                    });
                                                  }}
                                                  onBlur={async (e) => {
                                                    try {
                                                      const res = await api_tts.updateSentence(s.id, { text: e.target.value });
                                                      setProjectSentences(prev => {
                                                        const sArr = Array.isArray(prev[projectName]) ? prev[projectName] : (prev[projectName]?.data && Array.isArray(prev[projectName].data) ? prev[projectName].data : []);
                                                        return { ...prev, [projectName]: sArr.map((x: any) => x.id === s.id ? res.data : x) };
                                                      });
                                                    } catch (err) { }
                                                  }}
                                                  className="flex-1 bg-black/40 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-100 focus:border-indigo-500/50 outline-none resize-none scrollbar-hide min-h-[80px]"
                                                  placeholder="Nội dung câu thoại..."
                                                />
                                                <div className="flex items-center justify-end text-[10px] px-1 font-medium mt-1 h-4">
                                                  <div className="flex items-center gap-2">
                                                    {s.status?.toLowerCase() === 'failed' ? (
                                                      <span className="text-rose-400">Lỗi Render</span>
                                                    ) : (s.status?.toLowerCase() !== 'completed' && !s.audioPath) ? (
                                                      <span className="text-amber-400 animate-pulse animate-shake flex items-center gap-1">
                                                        <Loader2 size={10} className="animate-spin" />
                                                        Đang xử lý...
                                                      </span>
                                                    ) : null}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                ) : (
                                  (() => {
                                    const displayPrompt = cleanPromptForDisplay(row.prompt);
                                    return (
                                      <p className="max-w-[150px] truncate text-sm text-gray-300" title={displayPrompt}>{displayPrompt}</p>
                                    );
                                  })()
                                )}
                              </td>

                              {rowViewMode[row.id] !== 'audio' && (
                                <>
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
                                        {String(row.typeI2V || '').startsWith('frames') ? 'Frames to Video' : String(row.typeI2V || '').startsWith('ingredient') ? 'Ingredient to Video' : String(row.typeI2V || '').startsWith('text') ? 'Text to Video' : typeof row.typeI2V === 'string' ? row.typeI2V : ''}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-500 font-medium">N/A</span>
                                    )}
                                  </td>
                                </>
                              )}

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
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleRowAudioMode(row); }}
                                    className={`p-2 rounded-lg transition-colors ${rowViewMode[row.id] === 'audio' ? 'bg-fuchsia-600 text-white' : 'hover:bg-white/10 text-fuchsia-400'}`}
                                    title="Chế độ Audio / Giọng đọc"
                                  >
                                    <Mic size={16} />
                                  </button>

                                  <button onClick={() => handleRecreate(row.id)} className="p-2 hover:bg-white/10 rounded-lg text-purple-400 transition-colors" title="Tạo lại">
                                    <RotateCcw size={16} />
                                  </button>
                                  <button onClick={() => handleAddToGallery(row)} className="p-2 hover:bg-white/10 rounded-lg text-yellow-400 transition-colors" title="Thêm vào Kho Nhân Vật TTS">
                                    <Library size={16} />
                                  </button>
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
          <div className={`transition-all duration-300 transform ${showSuccessToast ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'}`}>
            <div className="bg-green-500/90 backdrop-blur-sm text-white px-5 py-3 rounded-lg shadow-lg border border-green-400/30 flex items-center space-x-3">
              <div className="bg-white/20 rounded-full p-1 shrink-0">
                <Check size={16} className="text-white" />
              </div>
              <span className="font-medium">{successToastMessage}</span>
            </div>
          </div>

          {/* Error Toast */}
          <div className={`transition-all duration-300 transform ${showErrorToast.show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'}`}>
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

      {/* Character Selection Modal */}
      {isCharacterModalOpen.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-5xl p-6 flex flex-col h-[85vh] shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-fuchsia-300 mb-4">Kho Ảnh Cá Nhân</h3>
                <div className="flex bg-black/30 w-fit p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setCharacterModalTab('character')}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${characterModalTab === 'character' ? 'bg-fuchsia-600/80 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <User size={16} />
                    Ảnh Nhân vật
                  </button>
                  <button
                    onClick={() => setCharacterModalTab('exterior')}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${characterModalTab === 'exterior' ? 'bg-indigo-600/80 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <ImageIcon size={16} />
                    Ảnh Ngoại cảnh
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCharacterModalOpen({ isOpen: false, storyIndex: -1 });
                  setCharacterModalTab('character');
                }}
                className="text-gray-400 hover:text-white transition-colors p-2 bg-black/20 hover:bg-red-500/80 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-fuchsia-500/30 scrollbar-track-transparent">
              {(() => {
                const filteredEntries = Object.entries(characterNames).filter(([url, name]) => {
                  if (!userImages.has(url)) return false;
                  const isExt = name.startsWith('[Ngoại cảnh]');
                  return characterModalTab === 'character' ? !isExt : isExt;
                });

                if (filteredEntries.length === 0) {
                  return (
                    <div className="col-span-full text-center flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center bg-black/20">
                        <ImageIcon className="text-gray-500" size={28} />
                      </div>
                      <p className="text-sm text-gray-400 px-4">
                        {characterModalTab === 'character' ? 'Chưa có ảnh Nhân vật nào trong kho.' : 'Chưa có ảnh Ngoại cảnh nào trong kho.'}
                      </p>
                    </div>
                  );
                }

                return filteredEntries.map(([url, name], idx) => {
                  const sbIdx = isCharacterModalOpen.storyIndex;
                  const isSelected = storyBoards[sbIdx]?.characters.includes(url);
                  const displayName = name.replace(/^\[Ngoại cảnh\]\s*/i, '');

                  return (
                    <div
                      key={idx}
                      className={`group relative bg-black/40 rounded-xl overflow-hidden border-2 ${isSelected ? 'border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'border-white/10'} cursor-pointer hover:border-fuchsia-400/50 transition-all aspect-[3/4]`}
                      onClick={() => {
                        const newSb = [...storyBoards];
                        if (!isSelected) {
                          newSb[sbIdx].characters.push(url);
                          setStoryBoards(newSb);
                        } else {
                          newSb[sbIdx].characters = newSb[sbIdx].characters.filter(u => u !== url);
                          setStoryBoards(newSb);
                        }
                        setIsCharacterModalOpen({ isOpen: false, storyIndex: -1 });
                        setCharacterModalTab('character');
                      }}
                    >
                      <img src={resolveImageUrl(url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={displayName} />
                      <div className="absolute top-2 right-2 shadow-sm z-10">
                        {isSelected && <div className="w-6 h-6 bg-fuchsia-600 rounded-full flex items-center justify-center text-white shadow-lg"><Check size={14} /></div>}
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-8 pb-3 px-3">
                        <div className="text-xs font-semibold text-center text-white truncate drop-shadow-md">
                          {displayName}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
