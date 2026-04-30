import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { BookOpen, FileText, LayoutTemplate, Video, Clapperboard, ChevronRight, Wand2, Loader2, ArrowRight, User, Users, MapPin, Clock, Edit3, Image as ImageIcon, Plus, Minus, Film, Globe, Check, Bot, RefreshCw, Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchWithAuth, API_URL, authService } from '../services/authService';
import { COUNTRY_MAP } from './NanoBananaProMode';
import NanoBananaProMode from './NanoBananaProMode';
import IngredientToVideoMode from './IngredientToVideoMode';
import AutoMergeVideoMode from './AutoMergeVideoMode';
import { TTSScriptsPage } from './TTSScriptsMode';
import { storySystemPrompt } from '../../constants';
import { api_tts } from '../services/api_tts';
import { cleanVoiceName } from '../utils/system_presets';
import { CharacterDetailModal } from './CharacterDetailModal';
import { GlobalAudioContext } from '../contexts/GlobalAudioContext';

type Step = 'story' | 'script' | 'storyboard' | 'video' | 'editor';
const stepsList = [
  { id: 'story', label: 'Story', icon: BookOpen },
  { id: 'script', label: 'Script', icon: FileText },
  { id: 'storyboard', label: 'Storyboard', icon: LayoutTemplate },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'editor', label: 'AI Editor', icon: Clapperboard },
];
const getStepIndex = (step: Step) => stepsList.findIndex(s => s.id === step);

export default function ProjectWorkspace() {
  const { currentProject } = useProject();
  const [currentStep, setCurrentStep] = useState<Step>('story');
  const [maxReachedStepIndex, setMaxReachedStepIndex] = useState<number>(0);

  useEffect(() => {
    const idx = getStepIndex(currentStep);
    if (idx > maxReachedStepIndex) {
      setMaxReachedStepIndex(idx);
    }
  }, [currentStep, maxReachedStepIndex]);

  // -- Story Step State --
  const [scriptText, setScriptText] = useState('');
  const [countryStyle, setCountryStyle] = useState('Japan');
  const [genre, setGenre] = useState(COUNTRY_MAP['Japan']?.genres[0] || '');
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [episode, setEpisode] = useState('Tập 1');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // -- Script Step State --
  const [scenes, setScenes] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [extractedCharacters, setExtractedCharacters] = useState<any[]>([]);
  const [characterCreationState, setCharacterCreationState] = useState<{ [name: string]: { status: 'idle' | 'creating' | 'success', imageUrl?: string, voiceId?: number } }>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [selectedCharacterForModal, setSelectedCharacterForModal] = useState<any | null>(null);
  const [editingCharName, setEditingCharName] = useState<string>('');

  const audioContext = React.useContext(GlobalAudioContext);

  useEffect(() => {
    const storageKey = `project_workspace_draft_${currentProject?.id || 'default'}`;
    const saved = localStorage.getItem(storageKey) || localStorage.getItem('project_workspace_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.scriptText) setScriptText(parsed.scriptText);
        if (parsed.countryStyle) setCountryStyle(parsed.countryStyle);
        if (parsed.genre) setGenre(parsed.genre);
        if (parsed.durationMinutes !== undefined) setDurationMinutes(parsed.durationMinutes);
        if (parsed.durationSeconds !== undefined) setDurationSeconds(parsed.durationSeconds);
        if (parsed.episode !== undefined) setEpisode(parsed.episode);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.maxReachedStepIndex !== undefined) setMaxReachedStepIndex(parsed.maxReachedStepIndex);
        if (parsed.extractedCharacters) setExtractedCharacters(parsed.extractedCharacters);
        if (parsed.characterCreationState) setCharacterCreationState(parsed.characterCreationState);
      } catch (e) { }
    }
    setIsLoaded(true);
  }, [currentProject?.id]);

  // Cache Workspace State in localStorage
  useEffect(() => {
    if (!isLoaded) return;
    const data = { scriptText, countryStyle, genre, durationMinutes, durationSeconds, episode, currentStep, maxReachedStepIndex, extractedCharacters, characterCreationState };
    const storageKey = `project_workspace_draft_${currentProject?.id || 'default'}`;
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [scriptText, countryStyle, genre, durationMinutes, durationSeconds, episode, currentStep, maxReachedStepIndex, extractedCharacters, characterCreationState, currentProject?.id, isLoaded]);

  const loadProjectData = async () => {
    try {
      const [charRes, vidRes] = await Promise.all([
        fetchWithAuth(`${API_URL}/veo3/character`),
        fetchWithAuth(`${API_URL}/veo3/video/all`)
      ]);
      const charData = await charRes.json();
      const vidData = await vidRes.json();

      setCharacters(Array.isArray(charData) ? charData : []);
      const vids = Array.isArray(vidData) ? vidData : (vidData.data || []);
      // Lọc các draft của project hiện tại (hoặc những draft cũ chưa có projectId)
      let draftVids = vids.filter((v: any) => v.status === 'draft' && (!v.projectId || v.projectId === currentProject?.id));

      // Chỉ lấy batch mới nhất (cùng thời gian tạo chênh lệch dưới 10 giây)
      if (draftVids.length > 0) {
        draftVids.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const newestTime = new Date(draftVids[0].createdAt).getTime();
        draftVids = draftVids.filter((v: any) => newestTime - new Date(v.createdAt).getTime() < 10000);

        draftVids.sort((a: any, b: any) => {
          let metaA: any = {}, metaB: any = {};
          try { metaA = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata || {}; } catch (e) { }
          try { metaB = typeof b.metadata === 'string' ? JSON.parse(b.metadata) : b.metadata || {}; } catch (e) { }
          return (metaA.sceneNumber || 0) - (metaB.sceneNumber || 0);
        });
      }
      setScenes(draftVids);
    } catch (e) {
      console.error('Error loading project data:', e);
    }
  };

  useEffect(() => {
    if (currentStep === 'script') {
      loadProjectData();
    }
  }, [currentStep, currentProject?.id]);

  const handleAnalyzeStory = async () => {
    if (!scriptText.trim()) {
      toast.error('Vui lòng nhập nội dung kịch bản hoặc ý tưởng!');
      return;
    }

    setIsAnalyzing(true);
    const toastId = toast.loading('Đang phân tích kịch bản bằng AI...');

    try {
      const apiKey = localStorage.getItem('tool_gemini_api_key') || localStorage.getItem('ai_api_key') || localStorage.getItem('gemini_api_key') || '';
      if (!apiKey) {
        toast.error('Vui lòng cấu hình Gemini API Key trước!', { id: toastId });
        setIsAnalyzing(false);
        return;
      }

      const selectedCountry = COUNTRY_MAP[countryStyle as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan;
      const totalSeconds = durationMinutes * 60 + durationSeconds;
      const scenesCount = Math.max(3, Math.round(totalSeconds / 8));

      // Prompt 1: Character Extraction (Từ ScriptAnalyzerModal)
      const charPromptText = `Phân tích kịch bản sau và trích xuất danh sách các nhân vật xuất hiện.
Yêu cầu trả về định dạng JSON nghiêm ngặt. KHÔNG bọc JSON trong \`\`\`json.
LƯU Ý QUAN TRỌNG: Nếu kịch bản có ghi tên nhân vật kèm phát âm/phiên âm trong ngoặc đơn, ví dụ "俺 (Ore)" hoặc "Bố (Chichi)", bạn CHỈ được lấy tên chính bên ngoài, ví dụ "俺" hoặc "Bố". Tuyệt đối không bao gồm ngoặc đơn và chữ bên trong.
Format:
{
  "characters": [
    {
      "name": "Tên nhân vật (chỉ tên chính, không có ngoặc đơn)",
      "gender": "woman" hoặc "man",
      "age_group": "young" hoặc "Senior / Elderly" hoặc "Middle-aged" hoặc "Adult" hoặc "Teen / Teenager / Adolescent" hoặc "Kid / Child",
      "body_type": "mô tả dáng người ngắn gọn bằng tiếng Anh (ví dụ: slim, athletic, tall)",
      "outfit": "Mô tả TRANG PHỤC CỤ THỂ bằng tiếng Anh. QUAN TRỌNG: Phải tự suy luận dựa vào bối cảnh truyện và nghề nghiệp (vd: tài xế -> mặc black suit hoặc chauffeur uniform, chủ tịch -> mặc elegant business suit, học sinh -> mặc school uniform)",
      "description": "Mô tả ngắn gọn bằng tiếng Anh về tính cách, nghề nghiệp hoặc ngoại hình nổi bật để dùng cho prompt"
    }
  ]
}

Kịch bản:
${scriptText}`;

      const availableChars = characters.map(c => c.name).join(', ');

      // Prompt 2: Scene Extraction (Từ IngredientToVideoMode)
      const sceneUserPrompt = `Script/Story content:\n${scriptText}\n\nRequirements:\n- EXACTLY ${scenesCount} scenes total. DO NOT exceed ${scenesCount} scenes! You MUST summarize the story by cutting out less important dialogue and minor scenes while preserving the core narrative. DO NOT stuff too much dialogue into a single scene. Keep the STRICT limit of MAXIMUM 2 lines of dialogue per scene.\n- Animation style: ${selectedCountry?.countryStyle}\n- Genre: ${genre}\n- Style details: ${selectedCountry?.styleDesc?.trim()}\n\nCRITICAL INSTRUCTIONS:\n1. USE character names exactly as they appear in the Script/Story content, BUT REMOVE ANY TEXT IN PARENTHESES. For example, if the script says "俺 (Ore)", you MUST output "俺" as the character name.\n2. IF a character from the script matches one in this list: [${availableChars}], you MAY use the name from the list to help with mapping, but priority is keeping the story consistent.\n3. For any narrator text or unidentified speaker, ALWAYS use "Người kể chuyện". ABSOLUTELY DO NOT use "[None]" as a character name!\n4. NEVER invent new names like "Rena" or "Sayuri" if they are not in the provided script.\n5. DO NOT TRANSLATE DIALOGUE AND THOUGHT! You MUST copy the dialogue and thought EXACTLY in its original language (Japanese, Vietnamese, etc.). ONLY visual descriptions should be in English.\n6. DO NOT DESCRIBE CHARACTER APPEARANCE. Focus deeply on the environment, action, and situation instead.\n7. DO NOT CREATE EXTRA DIALOGUE. Only use dialogue strictly present in the provided script.\n8. FOR THOUGHT SCENES WITHOUT DIALOGUE, the character MUST NOT move their mouth. You MUST explicitly include "mouth closed, no lip movement, not speaking" in the ACTION_EMOTION field.\n9. Output STRICTLY as a valid JSON object with a "prompts" array containing exactly ${scenesCount} items.`;

      // Thực thi 2 API call song song
      const [charResponse, sceneResponse] = await Promise.all([
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: charPromptText }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
          })
        }),
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `SYSTEM_INSTRUCTION:\n${storySystemPrompt}\n\nUSER_CONTENT:\n${sceneUserPrompt}` }] }],
            generationConfig: { temperature: 1 }
          })
        })
      ]);

      if (!charResponse.ok || !sceneResponse.ok) throw new Error('API Error');

      const charData = await charResponse.json();
      const sceneData = await sceneResponse.json();

      const charOutput = charData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const sceneOutput = sceneData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      const parsedChars = JSON.parse(charOutput);

      const ownerId = authService.getCurrentUserId();

      const extracted = parsedChars.characters || [];
      setExtractedCharacters(extracted);

      // Auto-match characters with global gallery (or preserve current session state)
      try {
        // Fetch legacy characters (veo3/character) to get the perfect url/localPath JSON strings
        const [dbCharRes, dbVoiceRes] = await Promise.all([
          fetchWithAuth(`${API_URL}/veo3/character?projectId=${currentProject?.id || ''}`),
          api_tts.getVoices()
        ]);
        const globalChars = await dbCharRes.json();
        const globalVoices = dbVoiceRes.data || [];

        setCharacterCreationState(prevState => {
          const newState = { ...prevState };
          let stateUpdated = false;

          extracted.forEach((c: any) => {
            // Only auto-map if it's not already successful in this session
            if (newState[c.name]?.status !== 'success') {
              // Match from legacy characters by name
              const existingChar = Array.isArray(globalChars) ? globalChars.find((dbC: any) => dbC.name?.toLowerCase() === c.name.toLowerCase()) : null;
              if (existingChar) {
                let imgUrl = '';
                if (typeof existingChar.imageUrl === 'string') {
                  imgUrl = existingChar.imageUrl;
                } else if (existingChar.imageUrl) {
                  imgUrl = JSON.stringify(existingChar.imageUrl);
                }

                if (imgUrl) {
                  // Try to find matching voice
                  const existingVoice = globalVoices.find((v: any) => v.name?.toLowerCase() === c.name.toLowerCase() || (v.avatar_path && v.avatar_path === imgUrl));
                  newState[c.name] = {
                    status: 'success',
                    imageUrl: imgUrl,
                    voiceId: existingVoice ? existingVoice.id : undefined
                  };
                  stateUpdated = true;
                }
              }
            }
          });
          return stateUpdated ? newState : prevState;
        });
      } catch (e) {
        console.error('Lỗi khi auto-map characters:', e);
      }

      const extractDialogues = (text: string) => {
        const results: any[] = [];
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

      const blocks: any[] = [];
      try {
        let fixedText = sceneOutput.replace(/\[None\]/gi, '[Người kể chuyện]');
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
            const dialogues: any[] = [];
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
        const sceneBlocks = sceneOutput.split('[SCENE_START]').map((s: string) => s.trim()).filter(Boolean);
        if (sceneBlocks.length > 0) {
          const getField = (block: string, field: string): string => {
            const regex = new RegExp(`${field}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, 's');
            const match = block.match(regex);
            return match ? match[1].trim() : '';
          };
          for (const block of sceneBlocks) {
            const heading = getField(block, 'SCENE_HEADING');
            const character = getField(block, 'CHARACTER');
            const cinematography = getField(block, 'CINEMATOGRAPHY');
            const lighting = getField(block, 'LIGHTING');
            const environment = getField(block, 'ENVIRONMENT');
            const action = getField(block, 'ACTION_EMOTION');
            const dialogue = getField(block, 'DIALOGUE');
            const thought = getField(block, 'THOUGHT');
            const style = getField(block, 'STYLE');

            let sd = '[SCENE_START]\n\n';
            if (heading) sd += `SCENE_HEADING: ${heading}\n\n`;
            if (character) sd += `CHARACTER: ${character}\n\n`;
            if (cinematography) sd += `CINEMATOGRAPHY: ${cinematography}\n\n`;
            if (lighting) sd += `LIGHTING: ${lighting}\n\n`;
            if (environment) sd += `ENVIRONMENT: ${environment}\n\n`;
            if (action) sd += `ACTION_EMOTION: ${action}\n\n`;

            const dialogues: any[] = [];
            if (dialogue && dialogue.toLowerCase() !== 'none') {
              sd += `DIALOGUE: ${dialogue}\n\n`;
              dialogues.push(...extractDialogues(dialogue));
            }
            if (thought && thought.toLowerCase() !== 'none') {
              sd += `THOUGHT: ${thought}\n\n`;
              dialogues.push(...extractDialogues(thought));
            }
            if (style) sd += `STYLE: ${style}\n\n`;
            sd += '[SCENE_END]';
            blocks.push({ prompt: sd, dialogues });
          }
        }
      }

      const vidPromises = blocks.map((block: any, idx: number) => {
        return fetchWithAuth(`${API_URL}/veo3/video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: block.prompt,
            status: 'draft',
            typeI2V: durationMinutes === 0 ? 'text916-achernar' : 'text169-achernar',
            ownerID: ownerId,
            projectId: currentProject?.id,
            metadata: JSON.stringify({
              sceneNumber: idx + 1,
              genre: genre,
              countryStyle: selectedCountry?.label || countryStyle,
              duration: `${durationMinutes}m${durationSeconds}s`,
              dialogues: block.dialogues
            })
          })
        });
      });

      await Promise.all(vidPromises);

      toast.success('Phân tích hoàn tất! Vui lòng chọn lọc nhân vật cần dùng.', { id: toastId });
      setCurrentStep('script');

    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi phân tích. Đảm bảo API Key hợp lệ.', { id: toastId });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      const pollRes = await fetchWithAuth(`${API_URL}/veo3/image/all`);
      const allData = await pollRes.json();
      const list = Array.isArray(allData) ? allData : (allData.data || []);

      let updated = false;
      const newState = { ...characterCreationState };

      extractedCharacters.forEach(char => {
        if (newState[char.name]?.status === 'creating' || newState[char.name]?.status === 'idle') {
          const item = list.find((i: any) => i.metadata && i.metadata.includes(char.name) && i.metadata.includes('gemini_extracted') && (i.status === 'success' || i.status === 'completed'));
          if (item) {
            const imgUrl = item.s3Url || item.result_image || item.result || (typeof item.imageUrl === 'string' && item.imageUrl.startsWith('http') ? item.imageUrl : '');
            if (imgUrl) {
              newState[char.name] = { status: 'success', imageUrl: imgUrl };
              updated = true;
            }
          }
        }
      });
      if (updated) {
        setCharacterCreationState(newState);
        toast.success('Đã cập nhật trạng thái mới nhất!');
      } else {
        toast('Không có thay đổi trạng thái nào.', { icon: 'ℹ️' });
      }
    } catch (e) {
      toast.error('Lỗi khi làm mới trạng thái');
    }
  };

  const handleAddVoiceClick = async (char: any, imageUrl?: string) => {
    try {
      const state = characterCreationState[char.name];
      const savedVoiceId = state?.voiceId;

      const ttsRes = await api_tts.getVoices();
      let existing: any = null;

      if (savedVoiceId) {
        existing = ttsRes.data?.find((v: any) => Number(v.id) === Number(savedVoiceId));
      }

      if (!existing) {
        const createRes = await api_tts.createVoice(char.name, '', 'Vietnamese', 'unknown', false, null);
        existing = createRes.data;

        setCharacterCreationState(prev => ({
          ...prev,
          [char.name]: {
            ...(prev[char.name] || { status: 'success', imageUrl }),
            voiceId: existing.id
          }
        }));
      }

      if (existing && !existing.avatar_path && imageUrl) {
        existing.avatar_path = imageUrl;
      }

      setSelectedCharacterForModal(existing);
      setEditingCharName(char.name);
      setIsCharacterModalOpen(true);
    } catch (e) {
      toast.error("Lỗi khởi tạo nhân vật Voice");
    }
  };

  const handleReloadCharacterModal = async () => {
    if (!selectedCharacterForModal?.id) return;
    try {
      const ttsRes = await api_tts.getVoices();
      const updated = ttsRes.data?.find((v: any) => v.id === selectedCharacterForModal.id);
      if (updated) {
        // Keep the temporary imageUrl if avatar is not yet updated in DB
        if (!updated.avatar_path && selectedCharacterForModal.avatar_path) {
          updated.avatar_path = selectedCharacterForModal.avatar_path;
        }
        setSelectedCharacterForModal(updated);

        // Update UI name if changed
        if (editingCharName && updated.name !== editingCharName) {
          setExtractedCharacters(prev => prev.map(c => c.name === editingCharName ? { ...c, name: updated.name } : c));
          setCharacterCreationState(prev => {
            const newState = { ...prev };
            if (newState[editingCharName]) {
              newState[updated.name] = newState[editingCharName];
              delete newState[editingCharName];
            }
            return newState;
          });
          setEditingCharName(updated.name);
        }
      }
    } catch (e) {
      console.error("Lỗi reload character modal", e);
    }
  };

  const handleSelectCharacter = async (char: any) => {
    try {
      const ownerId = authService.getCurrentUserId();
      setCharacterCreationState(prev => ({ ...prev, [char.name]: { status: 'creating' } }));

      const config = COUNTRY_MAP[countryStyle as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan;
      const finalPrompt = `A professional character reference sheet, model sheet, turnaround sheet layout. Character: ${char.name}. Gender: ${char.gender}. Age: ${char.age_group}. Body type: ${char.body_type}. Outfit: ${char.outfit}. Description: ${char.description}. Style: ${config.countryStyle}, ${genre}. ${config.styleDesc}`;

      const payload: any = {
        prompt: finalPrompt,
        image: [],
        status: 'pending',
        typeI2V: 'ImagePro-169',
        ownerID: ownerId,
        metadata: JSON.stringify({
          name: char.name,
          gender: char.gender,
          age_group: char.age_group,
          source: 'gemini_extracted',
          outfit: char.outfit,
          description: char.description,
          body_type: char.body_type,
          projectName: episode || 'Chưa đặt tên'
        })
      };

      const res = await fetchWithAuth(`${API_URL}/veo3/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const createdId = data.id || data.data?.id;

        // Poll for success
        const pollInterval = setInterval(async () => {
          try {
            const pollRes = await fetchWithAuth(`${API_URL}/veo3/image/all`);
            const allData = await pollRes.json();
            const list = Array.isArray(allData) ? allData : (allData.data || []);

            // Try to match by ID if we got it, otherwise match by name in metadata
            const item = list.find((i: any) => {
              if (createdId && i.id === createdId) return true;
              if (!createdId && i.metadata && i.metadata.includes(char.name) && i.metadata.includes('gemini_extracted')) return true;
              return false;
            });

            if (item && (item.status === 'success' || item.status === 'completed')) {
              let finalImgJsonStr = '';
              let rawImage = item.image;
              if (typeof rawImage === 'string') {
                try { rawImage = JSON.parse(rawImage); } catch (e) { }
              }
              const imgData = Array.isArray(rawImage) && rawImage.length > 0 ? rawImage[0] : null;
              if (imgData && imgData.url && imgData.localPath) {
                finalImgJsonStr = JSON.stringify({ url: imgData.url, localPath: imgData.localPath });
              } else if (item.s3Key || item.imageURL) {
                finalImgJsonStr = JSON.stringify({ url: item.s3Key || item.imageURL, localPath: item.imageURL });
              }

              if (finalImgJsonStr) {
                const characterPayload = {
                  name: char.name,
                  prompt: char.description,
                  ownerID: ownerId,
                  isPublic: false,
                  imageUrl: finalImgJsonStr,
                  projectId: currentProject?.id
                };
                fetchWithAuth(`${API_URL}/veo3/character`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(characterPayload)
                }).catch(e => console.error('Lỗi lưu character legacy', e));

                setCharacterCreationState(prev => ({ ...prev, [char.name]: { status: 'success', imageUrl: finalImgJsonStr } }));
                clearInterval(pollInterval);
              }
            } else if (item && item.status === 'failed') {
              toast.error(`Tạo nhân vật ${char.name} thất bại!`);
              setCharacterCreationState(prev => ({ ...prev, [char.name]: { status: 'idle' } }));
              clearInterval(pollInterval);
            }
          } catch (e) { }
        }, 5000); // Check every 5s

      } else {
        toast.error('Lỗi khi bắt đầu tạo nhân vật');
        setCharacterCreationState(prev => ({ ...prev, [char.name]: { status: 'idle' } }));
      }
    } catch (e) {
      toast.error('Lỗi kết nối');
      setCharacterCreationState(prev => ({ ...prev, [char.name]: { status: 'idle' } }));
    }
  };

  const handleConfirmScript = async () => {
    if (extractedCharacters.length === 0) {
      toast.error('Vui lòng phân tích kịch bản và tạo nhân vật trước!');
      return;
    }
    const hasUnready = extractedCharacters.some(char => characterCreationState[char.name]?.status !== 'success');
    if (hasUnready) {
      toast.error('Vui lòng đợi hoặc tạo xong ảnh cho tất cả nhân vật trước!');
      return;
    }

    if (!scenes || scenes.length === 0) {
      toast.error('Chưa có phân cảnh nào! Vui lòng quay lại tab Story và bấm Phân tích kịch bản trước.');
      return;
    }

    const missingVoices = extractedCharacters.filter(char => char.name.toLowerCase() !== 'người kể chuyện' && !characterCreationState[char.name]?.voiceId);
    if (missingVoices.length > 0) {
      if (!window.confirm(`Các nhân vật sau chưa được gán Giọng đọc: ${missingVoices.map(c => c.name).join(', ')}.\nBạn vẫn muốn tiếp tục? (Các câu thoại của nhân vật này sẽ được đưa vào Kịch bản nhưng chưa có âm thanh)`)) {
        return;
      }
    }

    const loadToast = toast.loading('Đang gửi lệnh tạo hàng loạt video & audio...');
    try {
      const blocks = scenes.map((s: any) => {
        let meta = {} as any;
        try { meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata || {}; } catch (e) { }
        return {
          id: s.id,
          prompt: s.prompt,
          dialogues: meta.dialogues || [],
          metaObj: meta
        };
      });

      const pName = (currentProject?.name || 'Dự án mới') + (episode && episode.trim() !== '' ? ' - ' + episode.trim() : '');
      let ttsScriptId = '';
      try {
        const scriptsRes = await api_tts.getScripts();
        const scriptsArr = Array.isArray(scriptsRes.data) ? scriptsRes.data : ((scriptsRes.data as any)?.data && Array.isArray((scriptsRes.data as any).data) ? (scriptsRes.data as any).data : []);
        const existingScript = scriptsArr.find((s: any) => s.title === pName);
        if (existingScript) ttsScriptId = existingScript.id;
        else {
          const scriptRes = await api_tts.createScript(pName, "Vietnamese", 200, currentProject?.id);
          if (scriptRes?.data?.id) ttsScriptId = scriptRes.data.id;
        }
      } catch (e) { console.error('Lỗi lấy TTS script', e); }

      let successCount = 0;
      let orderCounter = 0;
      const tasks: Promise<any>[] = [];
      const ownerId = authService.getCurrentUserId();

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const sceneId = `Scene_${i + 1}`;
        const matchedImages: string[] = [];

        b.dialogues.forEach((dlg: any) => {
          const charData = extractedCharacters.find(c => c.name.toLowerCase() === dlg.characterName.toLowerCase());
          if (charData) {
            dlg.voiceId = characterCreationState[charData.name]?.voiceId;
            const img = characterCreationState[charData.name]?.imageUrl;
            if (img && !matchedImages.includes(img)) matchedImages.push(img);
          }
        });

        const charMatch = b.prompt.match(/CHARACTER:\s*(.+?)(?=\n|$)/i);
        if (charMatch) {
          charMatch[1].split(',').map((s: string) => s.trim()).forEach((cName: string) => {
            if (cName.toLowerCase() !== 'none' && !cName.includes('Người kể chuyện')) {
              const charData = extractedCharacters.find(c => c.name.toLowerCase() === cName.toLowerCase());
              if (charData && characterCreationState[charData.name]?.imageUrl) {
                const img = characterCreationState[charData.name].imageUrl;
                if (img && !matchedImages.includes(img)) matchedImages.push(img);
              }
            }
          });
        }

        if (matchedImages.length === 1 && b.dialogues.length > 0) {
          const imgUrl = matchedImages[0];
          const charData = extractedCharacters.find(c => characterCreationState[c.name]?.imageUrl === imgUrl);
          if (charData) {
            b.dialogues.forEach((dlg: any) => {
              if (dlg.characterName.toLowerCase() === 'người kể chuyện' || dlg.characterName.toLowerCase() === 'none') {
                dlg.characterName = charData.name;
                dlg.voiceId = characterCreationState[charData.name]?.voiceId;
              }
            });
          }
        }

        const base64Images = matchedImages.map(img => {
          if (img && img.startsWith('data:image')) return img;
          try {
            JSON.parse(img);
            return img; // Already JSON
          } catch (e) {
            return JSON.stringify({ url: img, localPath: img });
          }
        });

        const payload: any = {
          status: 'pending',
          typeI2V: 'ingredient169-achernar',
          metadata: JSON.stringify({
            ...b.metaObj,
            jobId: sceneId,
            sceneIndex: i,
            projectName: pName,
            episode: episode,
            sentenceStartIndex: orderCounter,
            sentenceCount: b.dialogues ? b.dialogues.length : 0
          })
        };
        if (base64Images[0]) payload.image1 = base64Images[0];
        if (base64Images[1]) payload.image2 = base64Images[1];
        if (base64Images[2]) payload.image3 = base64Images[2];



        if (b.id) {
          tasks.push(
            fetchWithAuth(`${API_URL}/veo3/video/${b.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).then(res => { if (res.ok) successCount++; })
          );
        } else {
          payload.prompt = b.prompt;
          payload.typeI2V = 'ingredient169-achernar';
          payload.ownerID = ownerId;
          tasks.push(
            fetchWithAuth(`${API_URL}/veo3/video`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).then(res => { if (res.ok) successCount++; })
          );
        }

        if (ttsScriptId && b.dialogues && b.dialogues.length > 0) {
          for (const dlg of b.dialogues) {
            tasks.push(
              api_tts.addSentence(
                ttsScriptId, 
                dlg.text, 
                dlg.voiceId ? String(dlg.voiceId) : undefined, 
                dlg.emotion, 
                `ultimate-scene-${i}`, 
                "", 
                1.0, 
                1.0, 
                orderCounter++, 
                dlg.characterName
              )
                .then(res => {
                  if (res.data?.id && dlg.voiceId) return api_tts.renderSentence(res.data.id);
                }).catch(e => console.error(e))
            );
            if (!dlg.voiceId) {
              console.warn('Không tìm thấy VoiceId cho nhân vật', dlg.characterName);
            }
          }
        }
      }

      await Promise.all(tasks);
      toast.success(`Đã tạo thành công ${successCount} tiến trình video và thoại!`, { id: loadToast });

      const nextIdx = getStepIndex('video');
      setMaxReachedStepIndex(Math.max(maxReachedStepIndex, nextIdx));
      setCurrentStep('video');

    } catch (e: any) {
      console.error(e);
      toast.error(`Lỗi: ${e.message}`, { id: loadToast });
    }
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="flex-1 flex flex-col h-full w-full max-w-screen-2xl mx-auto pt-8 p-6 overflow-hidden">

      {/* Top Stepper Navigation */}
      <div className="flex justify-center mb-8 shrink-0">
        <div className="flex items-center bg-black/40 border border-white/10 rounded-full p-1.5 shadow-2xl backdrop-blur-xl">
          {stepsList.map((step, idx) => {
            const isActive = currentStep === step.id;
            let isAccessible = idx <= maxReachedStepIndex;
            if (step.id === 'editor' && maxReachedStepIndex >= getStepIndex('video')) {
              isAccessible = true;
            }
            const isDone = idx < currentIndex;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => isAccessible && setCurrentStep(step.id as Step)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 relative group ${isActive ? 'bg-fuchsia-600/20 border border-fuchsia-500/50 shadow-[0_0_15px_rgba(192,132,252,0.2)]' : isAccessible ? 'hover:bg-white/5 cursor-pointer text-gray-300' : 'text-gray-500 cursor-not-allowed'}`}
                >
                  {isActive && <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 rounded-full animate-pulse" />}
                  <div className={`p-1.5 rounded-full relative z-10 ${isActive ? 'bg-fuchsia-500/30 text-fuchsia-300' : isDone ? 'bg-white/10 text-gray-300' : 'bg-transparent text-gray-500'}`}>
                    <Icon size={16} />
                  </div>
                  <span className={`font-semibold text-sm relative z-10 ${isActive ? 'text-fuchsia-300' : ''}`}>{step.label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse ml-1 relative z-10" />}
                </button>
                {idx < stepsList.length - 1 && (
                  <div className="w-8 h-[1px] bg-white/10 mx-1"></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">

        {/* STEP 1: STORY */}
        {currentStep === 'story' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">

              <div className="absolute -top-32 -right-32 w-64 h-64 bg-fuchsia-500/10 blur-[100px] rounded-full"></div>

              <div className="text-center mb-6 relative z-10">
                <h2 className="text-2xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Khởi Tạo Dự Án</h2>
                <p className="text-sm text-gray-400">Nhập ý tưởng hoặc kịch bản của bạn để AI tự động phân tích phân cảnh và nhân vật.</p>
              </div>

              <div className="space-y-6 relative z-10">
                <div>
                  <textarea
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    placeholder="Ngày xửa ngày xưa, tại một vương quốc nọ..."
                    className="w-full h-48 bg-black/30 border border-white/10 rounded-2xl p-5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 resize-none transition-all text-lg leading-relaxed shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {/* Quốc gia / Phong cách */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2"><Globe size={16} /> Phong cách:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(COUNTRY_MAP).map(([key, data]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setCountryStyle(key);
                            setGenre(data.genres[0] || '');
                          }}
                          className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${countryStyle === key
                            ? 'bg-fuchsia-600/90 border-fuchsia-500/60 text-white shadow-[0_0_10px_rgba(192,132,252,0.3)]'
                            : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                            }`}
                        >
                          {data.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thể loại phim */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2"><Film size={16} /> Thể loại phim:</label>
                    <div className="flex flex-wrap gap-2">
                      {COUNTRY_MAP[countryStyle as keyof typeof COUNTRY_MAP]?.genres.map((g) => (
                        <button
                          key={g}
                          onClick={() => setGenre(g)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${genre === g
                            ? 'bg-cyan-600/90 border-cyan-400/60 text-white shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                            : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                            }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tập phim & Thời lượng (Stack dọc) */}
                  <div className="flex flex-col gap-6 pt-2 md:pt-0">
                    {/* Tập phim */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-400 flex items-center gap-2"><BookOpen size={16} /> Tập phim (Episode):</label>
                      <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-3 h-[40px] hover:border-fuchsia-500/50 focus-within:border-fuchsia-500/50 transition-colors">
                        <input type="text" value={episode} onChange={(e) => setEpisode(e.target.value)} placeholder="VD: Tập 1" className="w-full bg-transparent font-bold text-white text-sm focus:outline-none" />
                      </div>
                    </div>

                    {/* Thời lượng video */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-400 flex items-center gap-2"><Clock size={16} /> Thời lượng mong muốn:</label>
                      <div className="flex gap-2">
                        <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-1.5 h-[40px] w-28 hover:border-fuchsia-500/50 focus-within:border-fuchsia-500/50 transition-colors">
                          <button onClick={() => setDurationMinutes(Math.max(0, durationMinutes - 1))} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Minus size={16} /></button>
                          <input type="number" min="0" max="60" value={durationMinutes === 0 ? '' : durationMinutes} placeholder="0" onChange={(e) => setDurationMinutes(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full bg-transparent text-center font-bold text-white text-base focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          <span className="text-gray-500 text-xs font-normal pr-1.5">phút</span>
                          <button onClick={() => setDurationMinutes(durationMinutes + 1)} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Plus size={16} /></button>
                        </div>
                        <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-1.5 h-[40px] w-28 hover:border-fuchsia-500/50 focus-within:border-fuchsia-500/50 transition-colors">
                          <button onClick={() => setDurationSeconds(Math.max(0, durationSeconds - 5))} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Minus size={16} /></button>
                          <input type="number" min="0" max="59" value={durationSeconds === 0 ? '' : durationSeconds} placeholder="0" onChange={(e) => setDurationSeconds(e.target.value === '' ? 0 : Math.min(59, Number(e.target.value)))} className="w-full bg-transparent text-center font-bold text-white text-base focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          <span className="text-gray-500 text-xs font-normal pr-1.5">giây</span>
                          <button onClick={() => setDurationSeconds(Math.min(59, durationSeconds + 5))} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Plus size={16} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center shrink-0">
              <button
                onClick={handleAnalyzeStory}
                disabled={isAnalyzing || !scriptText.trim()}
                className="group bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-lg px-10 py-4 rounded-full shadow-[0_0_20px_rgba(192,132,252,0.4)] transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-3"
              >
                {isAnalyzing ? <Loader2 size={24} className="animate-spin" /> : <Wand2 size={24} className="group-hover:rotate-12 transition-transform" />}
                Start Creating
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: SCRIPT (Breakdown & Assets) */}
        {currentStep === 'script' && (
          <div className="w-full h-full flex flex-col lg:flex-row gap-6 pb-6 overflow-hidden min-h-0">

            {/* Left Column: Script Breakdown */}
            <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md min-h-0">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <h3 className="font-bold text-lg text-white flex items-center gap-2"><FileText className="text-fuchsia-400" size={20} /> Script Breakdown</h3>
                <span className="text-xs font-medium bg-white/10 text-gray-300 px-3 py-1 rounded-full">{scenes.length} clips split</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0">
                {scenes.map((vid, idx) => {
                  let meta: any = {};
                  try { meta = typeof vid.metadata === 'string' ? JSON.parse(vid.metadata) : vid.metadata || {}; } catch (e) { }
                  const sceneNum = meta.sceneNumber || idx + 1;

                  const extractField = (text: string, field: string) => {
                    const match = text?.match(new RegExp(`${field}:\\s*(.+?)(?=\\n[A-Z_]+:|\\n\\[SCENE_END\\]|$)`, 's'));
                    return match ? match[1].trim() : '';
                  };

                  const sceneHeading = extractField(vid.prompt, 'SCENE_HEADING');
                  const character = extractField(vid.prompt, 'CHARACTER');
                  const dialogue = extractField(vid.prompt, 'DIALOGUE');
                  const thought = extractField(vid.prompt, 'THOUGHT');
                  const narration = dialogue || thought;
                  const action = extractField(vid.prompt, 'ACTION_EMOTION');
                  const cinematography = extractField(vid.prompt, 'CINEMATOGRAPHY');
                  const environment = extractField(vid.prompt, 'ENVIRONMENT');

                  // Fallback cho định dạng cũ
                  const oldActionMatch = vid.prompt?.match(/🎬 Hành động:\s*(.*?)(?=\n💬 Thoại:|$)/s);
                  const oldDialogueMatch = vid.prompt?.match(/💬 Thoại:\s*(.*?)(?=\n|$)/s);
                  const finalAction = action || (oldActionMatch ? oldActionMatch[1].trim() : '');
                  const finalNarration = narration || meta.narration || (oldDialogueMatch ? oldDialogueMatch[1].trim() : '');

                  return (
                    <div key={vid.id || idx} className="bg-black/30 border border-white/10 rounded-2xl p-5 hover:border-fuchsia-500/30 transition-colors group">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-2.5 py-1 bg-fuchsia-500/20 text-fuchsia-300 text-xs font-bold rounded-md">Scene {sceneNum}</span>
                        <span className="text-sm font-medium text-gray-400">{sceneHeading || meta.location || 'Chưa rõ'}</span>
                      </div>

                      {character && character !== 'None' && (
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded uppercase shrink-0">
                            Character
                          </span>
                          <span className="text-sm text-gray-300 font-medium">
                            {character}
                          </span>
                        </div>
                      )}

                      <div className="space-y-4">
                        {finalNarration && finalNarration !== "Không có" && finalNarration !== "None" && (() => {
                          const match = finalNarration.match(/^\[(.*?)\]\s*(.*)$/);
                          let charName = '';
                          let dlgText = finalNarration;
                          if (match) {
                            charName = match[1].trim();
                            dlgText = match[2].trim();
                          } else {
                            const colonMatch = finalNarration.match(/^([^:]+):\s*(.*)$/);
                            if (colonMatch) {
                              charName = colonMatch[1].trim();
                              dlgText = colonMatch[2].trim();
                            }
                          }

                          return (
                            <div className="flex items-start gap-3">
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded uppercase mt-1 shrink-0">
                                {dialogue ? 'Dialogue' : (thought ? 'Thought' : 'Narration')}
                              </span>
                              {charName && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[11px] font-bold rounded mt-1 shrink-0">
                                  {charName}
                                </span>
                              )}
                              <p className="text-gray-200 text-sm italic leading-relaxed mt-1">"{dlgText.replace(/^['"「『]+|['"」』]+$/g, '')}"</p>
                            </div>
                          );
                        })()}
                        {finalAction && (

                          <div className="flex items-start gap-3">
                            <span className="p-1 bg-gray-700/50 text-gray-400 rounded shrink-0 mt-0.5"><ImageIcon size={14} /></span>
                            <p className="text-gray-300 text-sm leading-relaxed">{finalAction}</p>
                          </div>
                        )}
                        {(cinematography || environment) && (
                          <div className="text-xs text-gray-500 mt-2 p-2 bg-black/20 rounded-lg">
                            {cinematography && <div><span className="font-semibold text-gray-400">Camera:</span> {cinematography}</div>}
                            {environment && <div className="mt-1"><span className="font-semibold text-gray-400">Env:</span> {environment}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Column: In-Scene Assets (Extracted Characters) */}
            <div className="w-full lg:w-[450px] flex flex-col gap-6 min-h-0">

              <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md min-h-0">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2"><Bot className="text-blue-400" size={20} /> AI Extracted Characters</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefreshStatus}
                      className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
                      title="Làm mới trạng thái"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <span className="text-xs font-medium bg-white/10 text-gray-300 px-3 py-1 rounded-full">{extractedCharacters.length} tìm thấy</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
                  {extractedCharacters.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-3">
                      <Users size={32} className="opacity-30" />
                      <p className="text-sm text-center">Hãy bấm Start Creating để AI<br />trích xuất nhân vật từ kịch bản nhé.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {extractedCharacters.map((char, idx) => {
                        const creationState = characterCreationState[char.name] || { status: 'idle' };
                        const isSuccess = creationState.status === 'success';

                        return (
                          <div key={idx} className="bg-black/40 hover:bg-black/60 border border-white/10 rounded-2xl p-4 transition-colors group relative overflow-hidden">
                            <div className="flex justify-between items-center mb-3 relative z-10 gap-3">
                              <div className="flex-1 min-w-0 overflow-hidden group/name" title={char.name}>
                                <h5 className="font-bold text-fuchsia-300 text-lg truncate group-hover/name:w-max group-hover/name:animate-marquee-placeholder">
                                  {char.name}
                                </h5>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                <button
                                  onClick={() => handleAddVoiceClick(char, creationState.imageUrl)}
                                  disabled={!isSuccess}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all ${isSuccess
                                    ? 'bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                                    : 'bg-white/5 text-gray-500 border-white/10 cursor-not-allowed opacity-50'
                                    }`}
                                >
                                  <Mic size={14} />
                                  Thêm Voice
                                </button>

                                {creationState.status === 'idle' && (
                                  <button
                                    onClick={() => handleSelectCharacter(char)}
                                    className="px-3 py-1.5 bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 hover:from-fuchsia-600 hover:to-purple-600 text-fuchsia-300 hover:text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 border border-fuchsia-500/30 shadow-[0_0_10px_rgba(192,132,252,0.1)]"
                                  >
                                    <Check size={14} />
                                    Dùng nhân vật này
                                  </button>
                                )}

                                {creationState.status === 'creating' && (
                                  <div className="px-3 py-1.5 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-lg border border-blue-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                                    <Loader2 size={14} className="animate-spin" />
                                    Đang tạo...
                                  </div>
                                )}

                                {creationState.status === 'success' && (
                                  <div className="px-3 py-1.5 bg-green-500/20 text-green-300 text-xs font-bold rounded-lg border border-green-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                    <Check size={14} />
                                    Thành công
                                  </div>
                                )}
                              </div>
                            </div>

                            {!isSuccess ? (
                              <>
                                <div className="flex flex-wrap gap-2 mb-3 text-[10px] uppercase font-bold relative z-10">
                                  <span className="px-2 py-1 bg-blue-500/10 text-blue-300 rounded-md border border-blue-500/20 tracking-wider">
                                    {char.gender}
                                  </span>
                                  <span className="px-2 py-1 bg-green-500/10 text-green-300 rounded-md border border-green-500/20 tracking-wider">
                                    {char.age_group}
                                  </span>
                                  <span className="px-2 py-1 bg-yellow-500/10 text-yellow-300 rounded-md border border-yellow-500/20 tracking-wider">
                                    {char.body_type}
                                  </span>
                                </div>
                                <div className="relative z-10 space-y-2">
                                  <p className="text-sm text-gray-200"><span className="text-fuchsia-400 font-semibold mr-1">Outfit:</span> {char.outfit}</p>
                                  <p className="text-sm text-gray-400 italic">"{char.description}"</p>
                                </div>
                              </>
                            ) : (
                              <div className="relative z-10 mt-3 rounded-xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
                                {creationState.imageUrl ? (() => {
                                  let displayUrl = creationState.imageUrl;
                                  try {
                                    const parsed = JSON.parse(displayUrl);
                                    displayUrl = parsed.url || parsed.localPath || displayUrl;
                                  } catch (e) { }

                                  if (!displayUrl.startsWith('http') && !displayUrl.startsWith('data:')) {
                                    if (/^[A-Za-z]:[\/]/.test(displayUrl) || displayUrl.startsWith('/')) {
                                      displayUrl = `${API_URL}/veo3/local-file?path=${encodeURIComponent(displayUrl)}`;
                                    } else {
                                      const cleanKey = displayUrl.startsWith('/') ? displayUrl.substring(1) : displayUrl;
                                      const baseUrl = import.meta.env.VITE_S3_BASE_URL;
                                      displayUrl = `${baseUrl}${cleanKey}`;
                                    }
                                  }

                                  return <img src={displayUrl} alt={char.name} className="w-full h-auto max-h-[300px] object-contain rounded-xl shadow-lg" />
                                })() : (
                                  <div className="w-full h-[200px] flex items-center justify-center">
                                    <span className="text-xs text-gray-500">Đang tải ảnh...</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Background decoration */}
                            <div className="absolute -bottom-6 -right-6 text-white/5 pointer-events-none">
                              <User size={100} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirmScript}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02] flex justify-center items-center gap-2 shrink-0"
              >
                Confirm and Start Drawing <ArrowRight size={20} />
              </button>
            </div>

          </div>
        )}

        {/* STEP 3: STORYBOARD (Render TTSScriptsPage for managing TTS Scripts) */}
        {currentStep === 'storyboard' && (
          <div className="w-full h-full animate-in fade-in zoom-in-95 duration-500 overflow-y-auto">
            <TTSScriptsPage defaultProjectName={currentProject?.name} defaultEpisode={episode} />
          </div>
        )}

        {/* STEP 4: VIDEO (IngredientToVideo) */}
        {currentStep === 'video' && (
          <div className="w-full h-full animate-in fade-in zoom-in-95 duration-500 overflow-y-auto">
            <IngredientToVideoMode />
          </div>
        )}

        {/* STEP 5: AI EDITOR (AutoMergeVideoMode) */}
        {currentStep === 'editor' && (
          <div className="w-full h-full animate-in fade-in zoom-in-95 duration-500 overflow-y-auto">
            <AutoMergeVideoMode />
          </div>
        )}

      </div>

      <CharacterDetailModal
        isOpen={isCharacterModalOpen}
        onClose={() => {
          setIsCharacterModalOpen(false);
          audioContext?.setGlobalPlayer(null);
        }}
        character={selectedCharacterForModal}
        reload={handleReloadCharacterModal}
      />
    </div>
  );
}
