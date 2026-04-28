import { useState, useMemo, useEffect, useRef } from 'react';
import { Trash2, RotateCcw, Download, Image as ImageIcon, Save, Check, Upload, X, Library, Sparkles } from 'lucide-react';
import { API_URL, authService, fetchWithAuth } from '../services/authService';
import { api_tts } from '../services/api_tts';
import toast from 'react-hot-toast';

const AutoResizingInput = ({ value, onChange, className }: { value: string, onChange: (val: string) => void, className?: string }) => {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (spanRef.current && spanRef.current.textContent !== value) {
      spanRef.current.textContent = value;
    }
  }, [value]);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <span
      ref={spanRef}
      contentEditable
      suppressContentEditableWarning
      onInput={e => onChange(e.currentTarget.textContent || '')}
      onPaste={handlePaste}
      className={`outline-none min-w-[2ch] inline cursor-text break-words empty:after:content-['\\200B'] ${className}`}
    />
  );
};

// export const COUNTRY_MAP = {
//   Japan: {
//     label: "Nhật Bản (Anime)",
//     ethnicity: "Japanese (anime interpretation, not realistic)",
//     countryStyle: "Japanese Anime",
//     styleDesc: "Japanese anime, 2D hand-drawn look",
//     inspiredBy: "Japanese anime (e.g. Dr. Stone style, NOT identical)",
//     genres: [
//       "Shounen (thiếu niên, hành động)",
//       "Seinen (người lớn, tâm lý, dark)",
//       "Isekai (chuyển sinh)",
//       "Romance (tình cảm, học đường)",
//       "Mecha (robot)",
//       "Slice of Life (nhẹ nhàng)",
//       "Fantasy / Adventure"
//     ]
//   },
//   China: {
//     label: "Trung Quốc (Donghua)",
//     ethnicity: "Chinese (donghua interpretation, not realistic)",
//     countryStyle: "Chinese Donghua",
//     styleDesc: "Chinese donghua, heavily stylized or 3D CGI",
//     inspiredBy: "Chinese 3D/2D donghua",
//     genres: [
//       "Tu tiên (Xianxia)",
//       "Võ hiệp (Wuxia)",
//       "Huyền huyễn / Fantasy",
//       "Phiêu lưu hành động",
//       "3D CGI anime"
//     ]
//   },
//   Korea: {
//     label: "Hàn Quốc (Manhwa)",
//     ethnicity: "Korean (webtoon/manhwa interpretation, not realistic)",
//     countryStyle: "Korean Webtoon",
//     styleDesc: "Korean webtoon, polished 2D manhwa style",
//     inspiredBy: "Solo Leveling or modern Korean webtoons",
//     genres: [
//       "Action fantasy (cày cấp, dungeon)",
//       "Học trường / drama",
//       "Siêu năng lực",
//       "Game / hệ thống (system)"
//     ]
//   },
//   USA: {
//     label: "Mỹ (Comic/3D)",
//     ethnicity: "American (comic/3D animation interpretation)",
//     countryStyle: "Western Animation",
//     styleDesc: "American comic book or 3D Pixar-like animation",
//     inspiredBy: "Marvel comics or Disney/Pixar 3D",
//     genres: [
//       "Superhero (siêu anh hùng)",
//       "Comedy (hài hước)",
//       "Sci-fi (khoa học viễn tưởng)",
//       "3D animation (Pixar style)"
//     ]
//   },
//   Europe: {
//     label: "Châu Âu (Indie/Art)",
//     ethnicity: "European (artistic/indie animation interpretation)",
//     countryStyle: "European Indie",
//     styleDesc: "European artistic animation, painterly or stylized",
//     inspiredBy: "French animation or indie stylized games",
//     genres: [
//       "Fantasy nghệ thuật",
//       "Cổ tích / huyền thoại",
//       "Animation indie (nghệ thuật cao)"
//     ]
//   },
//   Vietnam: {
//     label: "Việt Nam",
//     ethnicity: "Vietnamese (mythology/history interpretation, stylized)",
//     countryStyle: "Vietnamese Animation",
//     styleDesc: "Vietnamese folk tale or modern youth style",
//     inspiredBy: "Vietnamese mythology or local cultural art",
//     genres: [
//       "Truyền thuyết (Lạc Long Quân, Sơn Tinh)",
//       "Lịch sử Việt Nam",
//       "Hoạt hình thiếu nhi",
//       "Thử nghiệm anime style"
//     ]
//   }
// };

export const COUNTRY_MAP = {
  Japan: {
    label: "Nhật Bản (Anime)",
    ethnicity: "Japanese (anime interpretation, not realistic)",
    countryStyle: "Japanese Anime",
    engine: "2D_ANIME",

    styleDesc: `
Japanese anime, 2D hand-drawn
clean lineart, cel shading
large expressive eyes, stylized face
dynamic hair shapes
`,

    renderRule: `
strict 2D anime rendering, clean outlines, no realistic lighting
`,

    negative: `
no 3D rendering, no realistic skin, no western comic style
`,

    inspiredBy: "modern Japanese anime (NOT identical)",

    genres: [
      "Shounen (action, power growth)",
      "Seinen (mature, psychological)",
      "Isekai (fantasy world)",
      "Romance (emotional, soft)",
      "Mecha (robots)",
      "Slice of Life (calm daily life)",
      "Fantasy / Adventure"
    ]
  },

  China: {
    label: "Trung Quốc (Donghua)",
    ethnicity: "Chinese (donghua interpretation, not realistic)",
    countryStyle: "Chinese Donghua",
    engine: "3D_DONGHUA",

    styleDesc: `
Chinese donghua, high-quality 3D CGI
cinematic lighting, realistic shadows
detailed hair strands, fabric simulation
refined facial features, less exaggerated than anime
elegant posture, calm expression
`,

    renderRule: `
strict 3D CGI rendering, NO lineart, cinematic lighting, realistic materials
`,

    negative: `
no 2D anime lineart, no Japanese anime face, no chibi
`,

    inspiredBy: "modern Chinese 3D donghua (NOT anime)",

    genres: [
      "Xianxia (tu tiên)",
      "Wuxia (võ hiệp)",
      "Fantasy",
      "Action",
      "3D CGI"
    ]
  },

  Korea: {
    label: "Hàn Quốc (Manhwa)",
    ethnicity: "Korean (webtoon/manhwa interpretation, not realistic)",
    countryStyle: "Korean Webtoon",
    engine: "WEBTOON",

    styleDesc: `
Korean webtoon style
clean sharp lineart, soft gradient shading
modern fashion, tall proportions
semi-realistic faces
`,

    renderRule: `
vertical webtoon shading, soft gradients, clean lighting
`,

    negative: `
avoid exaggerated anime eyes, avoid chibi
`,

    inspiredBy: "modern Korean webtoons (NOT anime)",

    genres: [
      "Action fantasy (dungeon)",
      "School drama",
      "Superpower",
      "System / leveling"
    ]
  },

  USA: {
    label: "Mỹ (Comic/3D)",
    ethnicity: "American (comic/3D interpretation)",
    countryStyle: "Western Comic / 3D",
    engine: "COMIC_3D",

    styleDesc: `
American comic or Pixar-style
bold shapes, strong jawlines
dynamic poses, heroic proportions
dramatic lighting
`,

    renderRule: `
bold outlines OR full 3D rendering, strong lighting contrast
`,

    negative: `
no anime style, no manga face
`,

    inspiredBy: "Marvel / Pixar (NOT anime)",

    genres: [
      "Superhero",
      "Comedy",
      "Sci-fi",
      "3D animation"
    ]
  },

  Europe: {
    label: "Châu Âu (Indie/Art)",
    ethnicity: "European (artistic/indie interpretation)",
    countryStyle: "European Art",
    engine: "ART",

    styleDesc: `
European artistic animation
painterly textures, stylized proportions
creative composition, indie feel
`,

    renderRule: `
painterly shading, artistic brush strokes
`,

    negative: `
avoid anime style
`,

    inspiredBy: "French / indie animation",

    genres: [
      "Art fantasy",
      "Mythology",
      "Indie animation"
    ]
  },

  Vietnam: {
    label: "Việt Nam",
    ethnicity: "Vietnamese (stylized cultural interpretation)",
    countryStyle: "Vietnamese Hybrid",
    engine: "HYBRID",

    styleDesc: `
Vietnamese-inspired modern anime hybrid
balanced stylization
subtle cultural elements
`,

    renderRule: `
mix anime + local cultural styling
`,

    negative: `
avoid strong Japanese stereotype
`,

    inspiredBy: "Vietnamese culture + modern anime",

    genres: [
      "Folklore",
      "Historical",
      "Modern youth",
      "Fantasy"
    ]
  }
};

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
import ScriptAnalyzerModal from './ScriptAnalyzerModal';
import type { ExtractedCharacter } from './ScriptAnalyzerModal';

export default function NanoBananaProMode() {
  const [modeSelect, setModeSelect] = useState('nanobananapro');
  const [editMode, setEditMode] = useState<'template' | 'full'>('template');
  const [aspectRatio, setAspectRatio] = useState('16:9');

  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);

  const [referenceImages, setReferenceImages] = useState<(File | string)[]>([]);
  const [activeUploadTab, setActiveUploadTab] = useState<'upload' | 'gallery'>('upload');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const fetchGallery = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/veo3/character`);
      if (response.ok) {
        const data = await response.json();
        const urls: string[] = [];
        data.forEach((c: any) => {
          if (c.imageUrl && !urls.includes(c.imageUrl)) urls.push(c.imageUrl);
          if (c.exteriorUrl && !urls.includes(c.exteriorUrl)) urls.push(c.exteriorUrl);
        });
        setGalleryImages(urls);
      }
    } catch (e) { }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const addToGallery = async (row: any) => {
    const fallbackId = row.id ? row.id.toString() : Math.floor(Math.random() * 10000).toString();
    const characterName = row.character || `Nhân vật ${fallbackId.substring(0, 4)}`;

    try {
      // Validate if character exists in TTS voices
      const voicesRes = await api_tts.getVoices();
      if (voicesRes && voicesRes.data) {
        if (voicesRes.data.some((v: any) => v.name.toLowerCase() === characterName.toLowerCase())) {
          toast.error(`Nhân vật "${characterName}" đã tồn tại trong kho TTS!`);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to fetch voices for validation", e);
    }

    const resultData = row.s3Url || row.result_image || row.s3Key || row.result;
    if (!resultData) {
      toast.error('Không có ảnh để thêm vào kho!');
      return;
    }

    let resultImages: string[] = [];
    const extractUrl = (item: any) => {
      const val = typeof item === 'object' && item !== null ? (item.url || item.s3Key || item) : item;
      return typeof val === 'string' ? resolveImageUrl(val) : '';
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

    const validUrls = resultImages.filter(u => u);
    if (validUrls.length === 0) {
      toast.error('Không tìm thấy ảnh hợp lệ!');
      return;
    }

    const imgUrl = validUrls[0];

    try {
      const loadToast = toast.loading('Đang tải ảnh và tạo nhân vật AI...', { id: 'add_gallery' });

      const proxyUrl = `${API_URL}/veo3/download-proxy?url=${encodeURIComponent(imgUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Không thể tải ảnh");

      const blob = await response.blob();
      const file = new File([blob], "avatar.png", { type: blob.type });

      await api_tts.createVoice(characterName, "Thêm từ Nano Banana Mode", "Vietnamese", "unknown", false, file);

      // Save to old character database
      await fetchWithAuth(`${API_URL}/veo3/character`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: imgUrl,
          name: characterName,
          source: 'generate',
          ownerID: authService.getCurrentUserId()
        })
      });

      toast.success(`Đã thêm nhân vật AI: ${characterName}`, { id: loadToast });

      setGalleryImages([imgUrl, ...galleryImages]);
    } catch (e: any) {
      toast.error('Lỗi khi thêm nhân vật: ' + (e.response?.data?.detail || e.message), { id: 'add_gallery' });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setReferenceImages(prev => {
        const newImages = [...prev, ...files].slice(0, 10);
        return newImages;
      });
    }
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  // Template variables
  const [vars, setVars] = useState({
    country_style: 'Japan',
    genre_style: 'Shounen (thiếu niên, hành động)',
    age_group: 'young',
    gender: 'woman',
    height_cm: '160-170',
    weight_kg: '40-50',
    body_type: 'slim',
    waist_description: 'small waist',
    measurements: '100-60-100',
    proportion_style: 'balanced, realistic',
    figure_style: 'natural, not exaggerated',
    outfit: 'casual clothes'
  });

  const pendingAutoSaveRef = useRef(false);

  useEffect(() => {
    if (pendingAutoSaveRef.current) {
      const timer = setTimeout(() => {
        pendingAutoSaveRef.current = false;
        handleSave();
      }, 600);
      return () => clearTimeout(timer);
    }
  });

  const handleApplyCharacter = (char: ExtractedCharacter) => {
    setVars(prev => {
      let next = { ...prev };

      // Map basic fields
      next.gender = char.gender === 'man' || char.gender === 'woman' ? char.gender : prev.gender;
      next.age_group = ['young', 'Senior / Elderly', 'Middle-aged', 'Adult', 'Teen / Teenager / Adolescent', 'Kid / Child'].includes(char.age_group)
        ? char.age_group
        : prev.age_group;

      if (char.body_type) {
        next.body_type = char.body_type;
      }

      if (char.outfit) {
        next.outfit = char.outfit;
      }

      // Auto adjust height/weight roughly based on age & gender
      if (next.age_group === 'Kid / Child') {
        next.height_cm = '120-130';
        next.weight_kg = '30-40';
      } else {
        if (next.gender === 'man') {
          next.height_cm = '170-180';
          next.weight_kg = '70-80';
        } else {
          next.height_cm = '160-170';
          next.weight_kg = '40-50';
        }
      }

      return next;
    });

    // Switch to template mode if not already
    setEditMode('template');
    pendingAutoSaveRef.current = true;
  };

  useEffect(() => {
    setVars(prev => {
      const countryConfig = COUNTRY_MAP[prev.country_style as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan;
      return {
        ...prev,
        genre_style: countryConfig.genres[0]
      };
    });
  }, [vars.country_style]);

  // Full prompt override
  const [customFullPrompt, setCustomFullPrompt] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [successToasts, setSuccessToasts] = useState<{ id: number, msg: string }[]>([]);
  const [showErrorToast, setShowErrorToast] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const handleSelectAll = () => {
    if (selectedIds.size === tableData.length && tableData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tableData.map(row => row.id)));
    }
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
        fetchWithAuth(`${API_URL}/veo3/image/${id}/recreate`, { method: 'POST' })
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
        fetchWithAuth(`${API_URL}/veo3/image/${id}`, { method: 'DELETE' })
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  //   const compiledPrompt = useMemo(() => {
  //     const config = COUNTRY_MAP[vars.country_style as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan;

  //     return `A professional anime character reference sheet, model sheet, turnaround sheet layout.

  // [Subject Identity]
  // - An original "${vars.age_group}" anime character
  // - Gender: "${vars.gender}"
  // - Ethnicity inspiration: ${config.ethnicity}

  // [Body Basics]
  // - Height: "${vars.height_cm}" cm
  // - Weight: "${vars.weight_kg}" kg

  // [Body Shape]
  // - Body type: "${vars.body_type}"
  // - Stylized waist: "${vars.waist_description}"

  // [Body Proportions]
  // ${vars.gender === 'man' ? '' : `- Stylized body measurements: approximately ${vars.measurements} cm (bust-waist-hips)\n`}- Proportions: "${vars.proportion_style}" (anime stylization, slightly exaggerated)

  // [Face & Expression]
  // - Large expressive anime eyes
  // - Small nose, clean jawline
  // - Unique hairstyle (spiky / flowing / stylized strands)
  // - Distinct silhouette, easily recognizable
  // - Emotion: neutral, calm expression

  // [Style Constraints]
  // - Country Style: ${config.countryStyle}
  // - Genre Style: ${vars.genre_style}
  // - Style: ${config.styleDesc}
  // - Inspired by modern ${config.inspiredBy}
  // - Clean lineart, sharp edges, controlled line weight
  // - Cel shading with soft gradients
  // - Vibrant but natural color palette

  // Layout:

  // - A VERY LARGE, DOMINANT upper-body anime portrait placed on the FAR LEFT EDGE
  // - Occupies ~40–45% width
  // - Close-up anime face, expressive eyes clearly visible
  // - Hair details and linework emphasized

  // - STRICT CROP: chest to top of head
  // - Anime portrait framing (not realistic photo)

  // - Arms partially visible near shoulders

  // - On the RIGHT SIDE: EXACTLY three full-body anime figures:
  //   1. Front view
  //   2. Back view
  //   3. Right side view

  // - Smaller scale than portrait
  // - Clean spacing, no overlap
  // - Clear silhouette readability

  // IMPORTANT:
  // - Strong anime character design
  // - Face must be stylized (NOT realistic)
  // - Distinct hair shape and outfit design
  // - Clear visual hierarchy: portrait >> full-body

  // Style:
  // - anime production sheet style
  // - clean white background
  // - studio lighting (flat anime lighting)
  // - ultra clean lineart
  // - high detail, 4k anime illustration

  // Negative:
  // - photorealistic
  // - realistic skin texture
  // - western cartoon
  // - chibi
  // - 3D render
  // - blurry
  // - messy lineart
  // - bad anatomy
  // - duplicate body
  // - copyrighted characters
  // - Doraemon, Nobita, Shizuka
  // - exact Dr. Stone copy`;
  //   }, [vars]);


  const compiledPrompt = useMemo(() => {
    const config = COUNTRY_MAP[vars.country_style as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan;

    return `A professional character reference sheet, model sheet, turnaround sheet layout.

[Subject Identity]
- An original "${vars.age_group}" character
- Gender: "${vars.gender}"
- Ethnicity inspiration: ${config.ethnicity}
- Country origin style: ${config.countryStyle}

[Body Basics]
- Height: "${vars.height_cm}" cm
- Weight: "${vars.weight_kg}" kg

[Body Shape]
- Body type: "${vars.body_type}"
- Stylized waist: "${vars.waist_description}"

[Body Proportions]
${vars.gender === 'man' ? '' : `- Stylized body measurements: approximately ${vars.measurements} cm (bust-waist-hips)\n`}- Proportions: "${vars.proportion_style}"

[Clothing & Outfit]
- Outfit details: "${vars.outfit}"

[Face & Expression]
- Clear silhouette
- Expression: neutral, calm

[Style Engine]
- ${config.engine}

[Style Constraints]
${config.styleDesc}

[Genre Influence]
- ${vars.genre_style}

[Rendering Rules]
${config.renderRule}
- STRICTLY follow ${config.engine} style
- DO NOT mix styles from other countries

Layout:

- LEFT: very large portrait (40–45%)
- RIGHT: 3 views (front, back, side)
- Clean spacing, no overlap

IMPORTANT:
- Strong design identity
- Clear hierarchy
- No duplicate body

Style:
- production sheet layout
- clean white background
- high detail

Negative:
${config.negative}
- blurry
- bad anatomy
- duplicate body
- copyrighted characters
`;
  }, [vars]);

  // Handle mode switches
  useEffect(() => {
    if (editMode === 'template') {
      setAspectRatio('16:9');
    }
    // Intentionally left empty for 'full' mode customization
  }, [editMode]);

  // Adjust height/weight limits when selecting Kid / Child
  useEffect(() => {
    const isKid = vars.age_group === 'Kid / Child';
    const isKidWeight = ['10-20', '20-30', '30-40'].includes(vars.weight_kg);
    const isKidHeight = ['80-90', '90-100', '100-110', '110-120', '120-130', '130-140', '140-150', '150-160'].includes(vars.height_cm);

    setVars(prev => {
      let next = { ...prev };

      if (isKid && !isKidWeight) next.weight_kg = '30-40';
      else if (!isKid && isKidWeight) next.weight_kg = '40-50';

      if (isKid && !isKidHeight) next.height_cm = '120-130';
      else if (!isKid && ['80-90', '90-100', '100-110', '110-120', '120-130', '130-140'].includes(prev.height_cm)) {
        next.height_cm = '160-170';
      }

      if (next.weight_kg !== prev.weight_kg || next.height_cm !== prev.height_cm) {
        return next;
      }
      return prev;
    });
  }, [vars.age_group, vars.weight_kg, vars.height_cm]);

  const handleVarChange = (key: keyof typeof vars, value: string) => {
    setVars(prev => ({ ...prev, [key]: value }));
  };

  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  const currentTableData = tableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [tableData, currentPage, totalPages]);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/veo3/image/all`);
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

  const handleSave = async () => {
    if (editMode === 'full' && !customFullPrompt.trim()) {
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
      return;
    }

    setIsSaving(true);
    try {
      const base64Promises = referenceImages.map(fileOrUrl => {
        if (typeof fileOrUrl === 'string') return Promise.resolve(fileOrUrl);

        // Thử lấy path qua ipcRenderer (Chuẩn nhất cho Electron 41)
        let electronPath = '';
        if ((window as any).ipcRenderer && (window as any).ipcRenderer.getFilePath) {
          electronPath = (window as any).ipcRenderer.getFilePath(fileOrUrl);
        } else {
          electronPath = (fileOrUrl as any).path;
        }

        if (electronPath) return Promise.resolve(electronPath);

        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(fileOrUrl);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      });

      const base64Images = await Promise.all(base64Promises);
      const finalPrompt = editMode === 'full' ? customFullPrompt : compiledPrompt;
      const aspectStr = aspectRatio.replace(':', '');
      const typeI2V = modeSelect === 'nanobananapro' ? `ImagePro-${aspectStr}` : `Image2-${aspectStr}`;

      const ownerId = authService.getCurrentUserId();

      // Log để debug trong Electron Console (Ctrl+Shift+I)
      console.log('Reference Images:', referenceImages);

      const originalPaths = referenceImages.map(f => {
        if (typeof f === 'string') return f;

        let path = '';
        if ((window as any).ipcRenderer && (window as any).ipcRenderer.getFilePath) {
          path = (window as any).ipcRenderer.getFilePath(f);
        } else {
          path = (f as any).path;
        }

        console.log('File Name:', f.name, 'Detected Path:', path);
        return path;
      }).filter(Boolean);

      const payload: any = {
        prompt: finalPrompt,
        image: base64Images,
        status: 'pending',
        typeI2V: typeI2V,
        ownerID: ownerId,
        metadata: JSON.stringify({
          originalPaths: originalPaths
        })
      };

      const response = await fetchWithAuth(`${API_URL}/veo3/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsSaved(true);
        const toastId = Date.now() + Math.random();
        setSuccessToasts(prev => [...prev, { id: toastId, msg: 'Yêu cầu tạo ảnh thành công' }]);
        setTimeout(() => setIsSaved(false), 2000);
        setTimeout(() => {
          setSuccessToasts(prev => prev.filter(t => t.id !== toastId));
        }, 3000);

        fetchImages();
        setReferenceImages([]);
      } else {
        const contentType = response.headers.get("content-type");
        let errorData = response.statusText;
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const json = await response.json();
          errorData = json.message || JSON.stringify(json);
        } else {
          errorData = await response.text();
        }
        console.error('Failed to save prompt:', response.status, errorData);
        alert(`Lỗi API: ${response.status} - ${errorData}`);
      }
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      alert(`Có lỗi xảy ra: ${error.message || 'Không thể kết nối đến server'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục này không?')) return;
    try {
      const response = await fetchWithAuth(`${API_URL}/veo3/image/${id}`, {
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

  const handleRecreate = async (id: string | number) => {
    if (!window.confirm('Bạn có chắc chắn muốn TẠO LẠI mục này không? Dữ liệu cũ sẽ bị xóa vĩnh viễn.')) return;
    try {
      const response = await fetchWithAuth(`${API_URL}/veo3/image/${id}/recreate`, {
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
    const resultData = row.s3Url || row.result_image || row.s3Key || row.result;
    if (!resultData) {
      alert('Không có ảnh kết quả để tải xuống!');
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
      try {
        const proxyUrl = `${API_URL}/veo3/download-proxy?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Proxy fetch failed');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `result_${row.id}_${i + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error('Lỗi tải ảnh qua proxy, thử mở trực tiếp:', err);
        window.open(url, '_blank');
      }
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 text-gray-200">

      {/* Top 50% - Editor */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6 shrink-0 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

        {/* Left Side: General Settings */}
        <div className="w-full md:w-1/3 space-y-5 z-10">
          <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-fuchsia-300 mb-4">Cài đặt Cơ bản</h2>

          <div className="space-y-1.5">
            <label className="text-sm text-purple-200/70 font-medium">Type</label>
            <input
              type="text"
              value="Image"
              disabled
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-purple-200/70 font-medium">Chế độ</label>
            <div className="relative flex p-1 bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
              <div
                className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] bg-gradient-to-r from-fuchsia-600/80 to-purple-600/80 rounded-lg shadow-[0_0_15px_rgba(192,132,252,0.3)] transition-all duration-300 ease-out border border-white/10"
                style={{ transform: modeSelect === 'nanobananapro' ? 'translateX(0)' : 'translateX(100%)' }}
              />
              <button
                onClick={() => setModeSelect('nanobananapro')}
                className={`relative z-10 flex-1 py-2.5 text-sm font-medium cursor-pointer transition-colors ${modeSelect === 'nanobananapro' ? 'text-white drop-shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Nano Banana Pro
              </button>
              <button
                onClick={() => setModeSelect('nanobanana2')}
                className={`relative z-10 flex-1 py-2.5 text-sm font-medium cursor-pointer transition-colors ${modeSelect === 'nanobanana2' ? 'text-white drop-shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Nano Banana 2
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-purple-200/70 font-medium">Khổ (Aspect Ratio)</label>
            <div className="flex gap-2">
              {['16:9', '4:3', '1:1', '3:4', '9:16'].map(ratio => {
                const isDisabled = editMode === 'template' && ratio !== '16:9';
                return (
                  <button
                    key={ratio}
                    onClick={() => !isDisabled && setAspectRatio(ratio)}
                    disabled={isDisabled}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${isDisabled ? 'opacity-40 cursor-not-allowed bg-black/40 border-white/5 text-gray-500' : 'cursor-pointer'
                      } ${aspectRatio === ratio
                        ? 'bg-gradient-to-r from-fuchsia-600/80 to-purple-600/80 border-fuchsia-400/50 text-white shadow-[0_0_10px_rgba(192,132,252,0.3)]'
                        : !isDisabled ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200' : ''
                      }`}
                  >
                    {ratio}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-purple-200/70 font-medium">Ảnh tham chiếu</label>
              <div className="flex space-x-1 bg-black/40 rounded-lg p-1">
                <button
                  onClick={() => setActiveUploadTab('upload')}
                  className={`px-3 py-1 text-xs rounded-md cursor-pointer transition-colors ${activeUploadTab === 'upload' ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  Tải lên
                </button>
                <button
                  onClick={() => setActiveUploadTab('gallery')}
                  className={`px-3 py-1 text-xs rounded-md cursor-pointer transition-colors ${activeUploadTab === 'gallery' ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  Kho ảnh
                </button>
              </div>
            </div>

            {activeUploadTab === 'upload' ? (
              <div className="relative group flex flex-col items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-xl hover:bg-white/10 hover:border-fuchsia-400/50 transition-all cursor-pointer overflow-hidden py-6">
                <Upload className="text-gray-500 group-hover:text-fuchsia-400 mb-2 transition-colors" size={24} />
                <span className="text-sm text-gray-500 group-hover:text-fuchsia-400 transition-colors">Nhấn để tải lên (Nhiều ảnh)</span>
                <input
                  type="file"
                  multiple
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
            ) : (
              <div className="bg-black/30 border border-white/10 rounded-xl p-3 h-[104px] overflow-y-auto">
                {galleryImages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-500 italic">
                    Kho ảnh trống. Hãy thêm từ kết quả ảnh.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {galleryImages.map((gUrl, idx) => {
                      const selectedIndex = referenceImages.findIndex(img => img === gUrl);
                      const isSelected = selectedIndex !== -1;
                      return (
                        <div key={idx} className={`relative group/gallery aspect-square rounded-lg overflow-hidden border ${isSelected ? 'border-fuchsia-500' : 'border-white/10'} bg-black/40 cursor-pointer`} onClick={() => {
                          if (isSelected) {
                            setReferenceImages(prev => prev.filter(img => img !== gUrl));
                          } else if (referenceImages.length >= 10) {
                            alert('Tối đa 10 ảnh tham chiếu!');
                          } else {
                            setReferenceImages(prev => [...prev, gUrl]);
                          }
                        }}>
                          <img src={resolveImageUrl(gUrl)} className="w-full h-full object-cover hover:scale-110 transition-transform" title={isSelected ? "Bỏ chọn" : "Chọn ảnh"} />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-fuchsia-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md z-10 pointer-events-none">
                              {selectedIndex + 1}
                            </div>
                          )}
                          <button onClick={(e) => {
                            e.stopPropagation();
                            if (isSelected) {
                              setReferenceImages(prev => prev.filter(img => img !== gUrl));
                            }
                            const newGallery = galleryImages.filter(u => u !== gUrl);
                            setGalleryImages(newGallery);
                            const ownerId = authService.getCurrentUserId();
                            localStorage.setItem(`tool_user_gallery_${ownerId || 'default'}`, JSON.stringify(newGallery));
                          }} className="absolute top-1 left-1 p-1 bg-red-500/80 rounded-md text-white opacity-0 group-hover/gallery:opacity-100 transition-opacity z-10 cursor-pointer" title="Xóa khỏi kho">
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {referenceImages.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-3">
                {referenceImages.map((file, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-fuchsia-500/50 group/img">
                    <img
                      src={typeof file === 'string' ? resolveImageUrl(file) : URL.createObjectURL(file)}
                      alt={`Reference ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 w-4 h-4 bg-fuchsia-600/90 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-sm pointer-events-none">
                      {idx + 1}
                    </div>
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500/80 rounded-md text-white opacity-0 group-hover/img:opacity-100 transition-opacity z-10 cursor-pointer"
                      title="Bỏ chọn ảnh"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Prompt Editor */}
        <div className="w-full md:w-2/3 flex flex-col z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-orange-300 to-fuchsia-300">Cấu hình Prompt</h2>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`${isSaving ? 'bg-fuchsia-600/50 cursor-not-allowed' : 'bg-fuchsia-600 hover:bg-fuchsia-500 cursor-pointer'} text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-[0_0_15px_rgba(192,132,252,0.4)]`}
            >
              {isSaved ? <Check size={16} /> : (isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={16} />)}
              <span>{isSaved ? 'Đã lưu' : (isSaving ? 'Đang lưu...' : 'Lưu Prompt')}</span>
            </button>
          </div>

          {/* Toggle Modes */}
          <div className="flex items-center justify-between mb-4 bg-black/20 p-1.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 pl-2">
              <span className="text-sm font-medium text-purple-200/80">Mô tả cơ thể:</span>
              <button
                onClick={() => setIsScriptModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-600/20 hover:bg-fuchsia-600 border border-fuchsia-500/30 text-fuchsia-300 hover:text-white rounded-lg text-xs font-medium transition-all group"
              >
                <Sparkles size={14} className="group-hover:animate-pulse" />
                Trích xuất từ Kịch bản
              </button>
            </div>

            <div className="relative flex p-1 bg-black/40 border border-white/10 rounded-lg overflow-hidden backdrop-blur-md w-72">
              <div
                className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] bg-gradient-to-r from-fuchsia-600/80 to-purple-600/80 rounded-md shadow-[0_0_10px_rgba(192,132,252,0.3)] transition-all duration-300 ease-out border border-white/10"
                style={{ transform: editMode === 'template' ? 'translateX(0)' : 'translateX(100%)' }}
              />
              <button
                onClick={() => setEditMode('template')}
                className={`relative z-10 flex-1 py-1.5 text-xs font-medium cursor-pointer transition-colors ${editMode === 'template' ? 'text-white drop-shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Mẫu Có Sẵn
              </button>
              <button
                onClick={() => setEditMode('full')}
                className={`relative z-10 flex-1 py-1.5 text-xs font-medium cursor-pointer transition-colors ${editMode === 'full' ? 'text-white drop-shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Tự Nhập Prompt
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className={`flex-1 bg-black/30 border border-white/10 rounded-xl shadow-inner font-mono text-sm leading-relaxed h-[350px] max-h-[350px] ${editMode === 'full' ? 'overflow-hidden' : 'p-4 overflow-y-auto'}`}>
            {editMode === 'full' ? (
              <textarea
                className="w-full h-full p-4 bg-transparent resize-none outline-none text-gray-200"
                value={customFullPrompt}
                onChange={(e) => setCustomFullPrompt(e.target.value)}
                placeholder="Nhập prompt tùy chỉnh tại đây..."
              />
            ) : (
              <div className="space-y-4">
                <div className="hidden text-gray-300 mb-2">
                  A professional anime character reference sheet, model sheet, turnaround sheet layout.
                </div>
                <div>
                  <span className="text-gray-400">[Subject Identity]</span><br />
                  - An original "<select value={vars.age_group} onChange={e => handleVarChange('age_group', e.target.value)} className="bg-fuchsia-900/30 text-fuchsia-300 border-b border-fuchsia-500/50 focus:outline-none focus:border-fuchsia-400 px-1 w-auto text-center mx-1 appearance-none cursor-pointer">
                    <option value="young" className="bg-gray-900 text-fuchsia-300">young</option>
                    <option value="Senior / Elderly" className="bg-gray-900 text-fuchsia-300">Senior / Elderly</option>
                    <option value="Middle-aged" className="bg-gray-900 text-fuchsia-300">Middle-aged</option>
                    <option value="Adult" className="bg-gray-900 text-fuchsia-300">Adult</option>
                    <option value="Teen / Teenager / Adolescent" className="bg-gray-900 text-fuchsia-300">Teen / Teenager / Adolescent</option>
                    <option value="Kid / Child" className="bg-gray-900 text-fuchsia-300">Kid / Child</option>
                  </select>" anime character<br />
                  - Gender: "<select value={vars.gender} onChange={e => handleVarChange('gender', e.target.value)} className="bg-fuchsia-900/30 text-fuchsia-300 border-b border-fuchsia-500/50 focus:outline-none focus:border-fuchsia-400 px-1 w-auto text-center mx-1 appearance-none cursor-pointer">
                    <option value="woman" className="bg-gray-900 text-fuchsia-300">woman</option>
                    <option value="man" className="bg-gray-900 text-fuchsia-300">man</option>
                  </select>"<br />
                  - Ethnicity inspiration: {(COUNTRY_MAP[vars.country_style as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan).ethnicity}
                </div>

                <div>
                  <span className="text-gray-400">[Body Basics]</span><br />
                  - Height: "<select value={vars.height_cm} onChange={e => handleVarChange('height_cm', e.target.value)} className="bg-fuchsia-900/30 text-fuchsia-300 border-b border-fuchsia-500/50 focus:outline-none focus:border-fuchsia-400 px-1 w-auto text-center mx-1 appearance-none cursor-pointer">
                    {vars.age_group === 'Kid / Child' ? (
                      <>
                        <option value="80-90" className="bg-gray-900 text-fuchsia-300">80-90</option>
                        <option value="90-100" className="bg-gray-900 text-fuchsia-300">90-100</option>
                        <option value="100-110" className="bg-gray-900 text-fuchsia-300">100-110</option>
                        <option value="110-120" className="bg-gray-900 text-fuchsia-300">110-120</option>
                        <option value="120-130" className="bg-gray-900 text-fuchsia-300">120-130</option>
                        <option value="130-140" className="bg-gray-900 text-fuchsia-300">130-140</option>
                        <option value="140-150" className="bg-gray-900 text-fuchsia-300">140-150</option>
                        <option value="150-160" className="bg-gray-900 text-fuchsia-300">150-160</option>
                      </>
                    ) : (
                      <>
                        <option value="140-150" className="bg-gray-900 text-fuchsia-300">140-150</option>
                        <option value="150-160" className="bg-gray-900 text-fuchsia-300">150-160</option>
                        <option value="160-170" className="bg-gray-900 text-fuchsia-300">160-170</option>
                        <option value="170-180" className="bg-gray-900 text-fuchsia-300">170-180</option>
                        <option value="180-190" className="bg-gray-900 text-fuchsia-300">180-190</option>
                      </>
                    )}
                  </select>" cm<br />
                  - Weight: "<select value={vars.weight_kg} onChange={e => handleVarChange('weight_kg', e.target.value)} className="bg-fuchsia-900/30 text-fuchsia-300 border-b border-fuchsia-500/50 focus:outline-none focus:border-fuchsia-400 px-1 w-auto text-center mx-1 appearance-none cursor-pointer">
                    {vars.age_group === 'Kid / Child' ? (
                      <>
                        <option value="10-20" className="bg-gray-900 text-fuchsia-300">10-20</option>
                        <option value="20-30" className="bg-gray-900 text-fuchsia-300">20-30</option>
                        <option value="30-40" className="bg-gray-900 text-fuchsia-300">30-40</option>
                      </>
                    ) : (
                      <>
                        <option value="40-50" className="bg-gray-900 text-fuchsia-300">40-50</option>
                        <option value="50-60" className="bg-gray-900 text-fuchsia-300">50-60</option>
                        <option value="60-70" className="bg-gray-900 text-fuchsia-300">60-70</option>
                        <option value="70-80" className="bg-gray-900 text-fuchsia-300">70-80</option>
                        <option value="80-90" className="bg-gray-900 text-fuchsia-300">80-90</option>
                        <option value="90-100" className="bg-gray-900 text-fuchsia-300">90-100</option>
                      </>
                    )}
                  </select>" kg
                </div>

                <div>
                  <span className="text-gray-400">[Body Shape]</span><br />
                  - Body type: "<AutoResizingInput value={vars.body_type} onChange={val => handleVarChange('body_type', val)} className="bg-fuchsia-900/30 text-fuchsia-300 border-b border-fuchsia-500/50 focus:border-fuchsia-400 px-1 mx-1" />"<br />
                  - Stylized waist: "<AutoResizingInput value={vars.waist_description} onChange={val => handleVarChange('waist_description', val)} className="bg-fuchsia-900/30 text-fuchsia-300 border-b border-fuchsia-500/50 focus:border-fuchsia-400 px-1 mx-1" />"
                </div>

                <div>
                  <span className="text-gray-400">[Body Proportions]</span><br />
                  {vars.gender !== 'man' && (
                    <>
                      - Stylized body measurements: approximately <AutoResizingInput value={vars.measurements} onChange={val => handleVarChange('measurements', val)} className="bg-fuchsia-900/30 text-fuchsia-300 border-b border-fuchsia-500/50 focus:border-fuchsia-400 px-1 mx-1" /> cm (bust-waist-hips)<br />
                    </>
                  )}
                  - Proportions: "<AutoResizingInput value={vars.proportion_style} onChange={val => handleVarChange('proportion_style', val)} className="bg-fuchsia-900/30 text-fuchsia-300 border-b border-fuchsia-500/50 focus:border-fuchsia-400 px-1 mx-1" />" (anime stylization, slightly exaggerated)
                </div>

                <div>
                  <span className="text-gray-400">[Face & Expression]</span><br />
                  - Large expressive anime eyes<br />
                  - Small nose, clean jawline<br />
                  - Unique hairstyle (spiky / flowing / stylized strands)<br />
                  - Distinct silhouette, easily recognizable<br />
                  - Emotion: neutral, calm expression
                </div>

                <div>
                  <span className="text-gray-400">[Clothing & Outfit]</span><br />
                  - Outfit details: "<AutoResizingInput value={vars.outfit} onChange={val => handleVarChange('outfit', val)} className="bg-fuchsia-900/30 text-fuchsia-300 border-b border-fuchsia-500/50 focus:border-fuchsia-400 px-1 mx-1" />"
                </div>

                <div>
                  <span className="text-gray-400">[Style Constraints]</span><br />
                  - Country Style: "<select value={vars.country_style} onChange={e => handleVarChange('country_style', e.target.value)} className="bg-fuchsia-900/30 text-fuchsia-300 border-b border-fuchsia-500/50 focus:outline-none focus:border-fuchsia-400 px-1 w-auto mx-1 appearance-none cursor-pointer">
                    {Object.entries(COUNTRY_MAP).map(([key, config]) => (
                      <option key={key} value={key} className="bg-gray-900 text-fuchsia-300">{config.label}</option>
                    ))}
                  </select>"<br />
                  - Genre Style: "<select value={vars.genre_style} onChange={e => handleVarChange('genre_style', e.target.value)} className="bg-fuchsia-900/30 text-fuchsia-300 border-b border-fuchsia-500/50 focus:outline-none focus:border-fuchsia-400 px-1 w-auto mx-1 appearance-none cursor-pointer">
                    {(COUNTRY_MAP[vars.country_style as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan).genres.map(genre => (
                      <option key={genre} value={genre} className="bg-gray-900 text-fuchsia-300">{genre}</option>
                    ))}
                  </select>"<br />
                  - Style: {(COUNTRY_MAP[vars.country_style as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan).styleDesc}<br />
                  - Inspired by modern {(COUNTRY_MAP[vars.country_style as keyof typeof COUNTRY_MAP] || COUNTRY_MAP.Japan).inspiredBy}<br />
                  - Clean lineart, sharp edges, controlled line weight<br />
                  - Cel shading with soft gradients<br />
                  - Vibrant but natural color palette
                </div>

                <div className="hidden text-gray-500 whitespace-pre-wrap mt-4">
                  {`Layout:

- A VERY LARGE, DOMINANT upper-body anime portrait placed on the FAR LEFT EDGE
- Occupies ~40–45% width
- Close-up anime face, expressive eyes clearly visible
- Hair details and linework emphasized

- STRICT CROP: chest to top of head
- Anime portrait framing (not realistic photo)

- Arms partially visible near shoulders

- On the RIGHT SIDE: EXACTLY three full-body anime figures:
  1. Front view
  2. Back view
  3. Right side view

- Smaller scale than portrait
- Clean spacing, no overlap
- Clear silhouette readability

IMPORTANT:
- Strong anime character design
- Face must be stylized (NOT realistic)
- Distinct hair shape and outfit design
- Clear visual hierarchy: portrait >> full-body

Style:
- anime production sheet style
- clean white background
- studio lighting (flat anime lighting)
- ultra clean lineart
- high detail, 4k anime illustration

Negative:
- photorealistic
- realistic skin texture
- western cartoon
- chibi
- 3D render
- blurry
- messy lineart
- bad anatomy
- duplicate body
- copyrighted characters
- Doraemon, Nobita, Shizuka
- exact Dr. Stone copy`}
                </div>
              </div>
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
            className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-purple-200/70 hover:text-purple-200 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <RotateCcw size={14} className={isLoading ? 'animate-spin text-fuchsia-400' : ''} />
            <span>{isLoading ? 'Đang tải...' : 'Tải lại'}</span>
          </button>
        </div>

        <div className="relative overflow-auto flex-1 pb-2">
          {isLoading && tableData.length > 0 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-xl">
              <div className="flex items-center space-x-3 bg-black/80 px-5 py-3 rounded-xl border border-white/10 shadow-2xl">
                <div className="w-5 h-5 border-2 border-fuchsia-400/30 border-t-fuchsia-400 rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-fuchsia-300">Đang đồng bộ...</span>
              </div>
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-purple-200/70 text-sm">
                <th className="py-3 px-4 font-medium w-12">
                  <input type="checkbox" className="rounded bg-black/40 border-white/20 text-fuchsia-500 focus:ring-fuchsia-500/50 cursor-pointer"
                    checked={selectedIds.size === tableData.length && tableData.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="py-3 px-4 font-medium w-16">ID</th>
                <th className="py-3 px-4 font-medium">Ảnh tham chiếu</th>
                <th className="py-3 px-4 font-medium min-w-[200px]">Prompt</th>
                <th className="py-3 px-4 font-medium">Trạng thái</th>
                <th className="py-3 px-4 font-medium">Thể loại</th>
                <th className="py-3 px-4 font-medium">Kết quả</th>
                <th className="py-3 px-4 font-medium text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-white/5 transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {currentTableData.length === 0 && isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">Đang tải dữ liệu...</td>
                </tr>
              ) : currentTableData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">Chưa có dữ liệu</td>
                </tr>
              ) : currentTableData.map((row, index) => (
                <tr key={row.id || index} className={`hover:bg-white/[0.02] transition-colors group ${selectedIds.has(row.id) ? 'bg-fuchsia-500/10' : ''}`}>
                  <td className="py-4 px-4">
                    <input type="checkbox" className="rounded bg-black/40 border-white/20 text-fuchsia-500 focus:ring-fuchsia-500/50 cursor-pointer"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                    />
                  </td>
                  <td className="py-4 px-4 text-gray-400">{row.id || index + 1}</td>

                  <td className="py-4 px-4">
                    <div className="flex -space-x-2">
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

                        if (images.length > 0) {
                          return (
                            <>
                              {images.slice(0, 3).map((imgUrl, i) => (
                                <div key={i} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-gray-900 bg-white/5 shadow-sm cursor-pointer" onClick={() => setPreviewImage(imgUrl)}>
                                  <img src={imgUrl} alt="Ref" className="w-full h-full object-cover" />
                                </div>
                              ))}
                              {images.length > 3 && (
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-fuchsia-900/80 border-2 border-gray-900 text-xs font-medium text-fuchsia-300 z-10">
                                  +{images.length - 3}
                                </div>
                              )}
                            </>
                          );
                        }

                        return (
                          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                            <ImageIcon className="text-gray-500" size={16} />
                          </div>
                        );
                      })()}
                    </div>
                  </td>
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
                    {(row.status === 'failed' || row.status === 'uncompleted' || row.status === 'Uncompleted') && <span className="px-2 py-1.5 bg-red-500/10 text-red-400 text-xs rounded-md border border-red-500/20 font-medium whitespace-nowrap">Thất bại</span>}
                    {(!row.status || !['completed', 'processing', 'Generating', 'pending', 'failed', 'uncompleted', 'Uncompleted'].includes(row.status)) && <span className="px-2 py-1.5 bg-gray-500/10 text-gray-400 text-xs rounded-md border border-gray-500/20 font-medium whitespace-nowrap">{row.status || 'Chờ xử lý'}</span>}
                  </td>
                  <td className="py-4 px-4">
                    {row.typeI2V ? (
                      <span className="px-2 py-1.5 bg-purple-500/10 text-white text-xs rounded-md border border-purple-500/20 font-medium whitespace-nowrap">
                        {row.typeI2V?.startsWith('ImagePro') || row.typeI2V?.startsWith('Image2') ? 'Image' : row.typeI2V}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500 font-medium">N/A</span>
                    )}
                  </td>

                  <td className="py-4 px-4 border-l border-white/5 bg-black/10">
                    <div className="flex gap-3 flex-wrap items-center justify-start">
                      {(() => {
                        const isUploadFailed = String(row.upload_status || row.uploadStatus || '').toLowerCase() === 'failed';
                        const resultData = isUploadFailed
                          ? (row.result || row.result_image || row.s3Url || row.videoURL || row.s3Key)
                          : (row.s3Url || row.videoURL || row.result || row.result_image || row.s3Key);
                        if (!resultData) {
                          return (
                            <div className="w-24 h-24 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 opacity-70">
                              <ImageIcon className="text-fuchsia-500/30" size={32} />
                            </div>
                          );
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

                        return (
                          <>
                            {resultImages.slice(0, 3).map((imgUrl, i) => (
                              <div key={i} className="h-20 w-fit rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black/40 group-hover:shadow-[0_0_15px_rgba(192,132,252,0.15)] transition-all">
                                <img src={imgUrl} alt="Result" className="h-full w-auto object-cover hover:scale-[1.03] transition-transform duration-300 cursor-pointer" onClick={() => setPreviewImage(imgUrl)} />
                              </div>
                            ))}
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
                      {/* <button className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors cursor-pointer" title="Sửa">
                        <Edit size={16} />
                      </button> */}
                      <button onClick={() => handleRecreate(row.id)} className="p-2 hover:bg-white/10 rounded-lg text-purple-400 transition-colors cursor-pointer" title="Tạo lại">
                        <RotateCcw size={16} />
                      </button>
                      <button onClick={() => addToGallery(row)} className="p-2 hover:bg-white/10 rounded-lg text-yellow-400 transition-colors cursor-pointer" title="Thêm vào kho ảnh">
                        <Library size={16} />
                      </button>
                      <button onClick={() => handleDownload(row)} className="p-2 hover:bg-white/10 rounded-lg text-green-400 transition-colors cursor-pointer" title="Lưu ảnh">
                        <Download size={16} />
                      </button>
                      <button onClick={() => handleDelete(row.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors cursor-pointer" title="Xóa">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-4 space-x-2 border-t border-white/10 pt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                    onClick={() => setCurrentPage(page)}
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg disabled:opacity-50 transition-colors text-sm font-medium text-gray-300"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* Bulk Action Floating Bar */}
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
      </div>

      {/* Success Toast Notifications */}
      <div className="fixed top-24 right-8 z-[100] flex flex-col gap-2 pointer-events-none">
        {successToasts.map(toast => (
          <div key={toast.id} className="bg-green-500/90 backdrop-blur-sm text-white px-5 py-3 rounded-lg shadow-lg border border-green-400/30 flex items-center space-x-3 transition-all duration-300 transform translate-y-0 opacity-100">
            <div className="bg-white/20 rounded-full p-1">
              <Check size={16} className="text-white" />
            </div>
            <span className="font-medium">{toast.msg}</span>
          </div>
        ))}
      </div>

      {/* Error Toast Notification */}
      <div className={`fixed top-24 right-8 z-[100] transition-all duration-300 transform ${showErrorToast ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
        <div className="bg-red-500/90 backdrop-blur-sm text-white px-5 py-3 rounded-lg shadow-lg border border-red-400/30 flex items-center space-x-3">
          <div className="bg-white/20 rounded-full p-1">
            <X size={16} className="text-white" />
          </div>
          <span className="font-medium">Vui lòng nhập Prompt, không được để trống!</span>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-7xl max-h-[95vh] w-full flex items-center justify-center">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all cursor-pointer"
              onClick={() => setPreviewImage(null)}
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      <ScriptAnalyzerModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        onSelectCharacter={handleApplyCharacter}
      />
    </div>
  );
}
