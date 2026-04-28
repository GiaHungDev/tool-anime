import React, { useState, useEffect } from 'react';
import { X, Bot, Sparkles, Loader2, Check } from 'lucide-react';

export interface ExtractedCharacter {
  name: string;
  gender: 'woman' | 'man';
  age_group: 'young' | 'Senior / Elderly' | 'Middle-aged' | 'Adult' | 'Teen / Teenager / Adolescent' | 'Kid / Child';
  body_type: string;
  outfit: string;
  description: string;
}

interface ScriptAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (character: ExtractedCharacter) => void;
}

export default function ScriptAnalyzerModal({ isOpen, onClose, onSelectCharacter }: ScriptAnalyzerModalProps) {
  const [scriptText, setScriptText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [characters, setCharacters] = useState<ExtractedCharacter[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('tool_gemini_api_key') || localStorage.getItem('ai_api_key') || localStorage.getItem('gemini_api_key') || '';
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!apiKey.trim()) {
      setError('Vui lòng nhập API Key của Gemini!');
      return;
    }
    if (!scriptText.trim()) {
      setError('Vui lòng nhập nội dung kịch bản!');
      return;
    }

    setError('');
    setIsAnalyzing(true);
    setCharacters([]);

    const prompt = `Phân tích kịch bản sau và trích xuất danh sách các nhân vật xuất hiện.
Yêu cầu trả về định dạng JSON nghiêm ngặt. KHÔNG bọc JSON trong \`\`\`json.
Format:
{
  "characters": [
    {
      "name": "Tên nhân vật",
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

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error('Lỗi gọi API Gemini. Vui lòng kiểm tra lại Key.');
      }

      const data = await response.json();
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textOutput) {
        throw new Error('API không trả về dữ liệu hợp lệ.');
      }

      const parsedData = JSON.parse(textOutput);
      if (parsedData.characters && Array.isArray(parsedData.characters)) {
        setCharacters(parsedData.characters);
        setSuccessMsg(`Đã trích xuất thành công ${parsedData.characters.length} nhân vật!`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        throw new Error('Định dạng JSON trả về không đúng cấu trúc.');
      }

    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra trong quá trình phân tích. Đảm bảo bạn có đủ Quota cho API Key.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelect = (char: ExtractedCharacter) => {
    onSelectCharacter(char);
    // Removed onClose() to keep the modal open for multiple selections
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-fuchsia-500/30 rounded-2xl w-full max-w-6xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden shadow-fuchsia-900/20">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-2 text-fuchsia-300">
            <Sparkles size={20} />
            <h3 className="font-semibold text-lg">AI Trích xuất Nhân vật từ Kịch bản</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 flex flex-col md:flex-row gap-6">
          
          {/* Left Column: Input */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div className="flex-1 flex flex-col gap-1 min-h-[300px]">
              <label className="text-sm text-gray-400 font-medium flex justify-between">
                <span>Nội dung Kịch bản</span>
              </label>
              <textarea 
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Dán đoạn hội thoại, kịch bản hoặc truyện vào đây để AI tự động tìm kiếm nhân vật..."
                className="w-full flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-200 focus:border-fuchsia-500 focus:outline-none resize-none transition-colors"
              />
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !scriptText.trim()}
              className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(192,132,252,0.3)]"
            >
              {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
              {isAnalyzing ? 'Đang phân tích...' : 'Bắt đầu Phân tích'}
            </button>

            {error && <div className="text-red-400 text-sm bg-red-400/10 p-2 rounded border border-red-400/20">{error}</div>}
            {successMsg && <div className="text-green-400 text-sm bg-green-400/10 p-2 rounded border border-green-400/20">{successMsg}</div>}
          </div>

          {/* Right Column: Results */}
          <div className="w-full md:w-1/2 flex flex-col">
            <h4 className="text-sm text-gray-400 font-medium mb-3">Kết quả Trích xuất ({characters.length})</h4>
            
            <div className="flex-1 bg-black/30 border border-white/5 rounded-xl p-2 overflow-y-auto min-h-[300px]">
              {isAnalyzing ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
                  <Loader2 size={32} className="animate-spin text-fuchsia-500/50" />
                  <p className="text-sm animate-pulse">AI đang đọc kịch bản...</p>
                </div>
              ) : characters.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                  <Bot size={32} className="opacity-30" />
                  <p className="text-sm">Chưa có dữ liệu nhân vật.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {characters.map((char, idx) => (
                    <div key={idx} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-semibold text-fuchsia-300 text-base">{char.name}</h5>
                        <button 
                          onClick={() => handleSelect(char)}
                          className="px-3 py-1.5 bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-300 hover:text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 border border-fuchsia-500/30 group-hover:border-transparent"
                        >
                          <Check size={14} />
                          Dùng nhân vật này
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2 text-xs">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-300 rounded border border-blue-500/20">
                          {char.gender}
                        </span>
                        <span className="px-2 py-1 bg-green-500/10 text-green-300 rounded border border-green-500/20">
                          {char.age_group}
                        </span>
                        <span className="px-2 py-1 bg-yellow-500/10 text-yellow-300 rounded border border-yellow-500/20">
                          {char.body_type}
                        </span>
                      </div>
                      <p className="text-sm text-fuchsia-300 font-medium mb-1"><span className="text-gray-400">Trang phục:</span> {char.outfit}</p>
                      <p className="text-sm text-gray-400 italic">"{char.description}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
