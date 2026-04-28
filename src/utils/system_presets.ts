// System Presets for RVC Pipeline and Audio Enhancement
export const SYSTEM_PRESETS = [
  {
    name: "🎤 Studio Pop (Sáng, Rõ, Sang)",
    data: {
      pitch_change: 0, index_rate: 0.65, filter_radius: 3, rms_mix_rate: 0.85, f0_method: 'rmvpe',
      crepe_hop_length: 128, protect: 0.33, main_gain: 0, backup_gain: 0, inst_gain: 0,
      reverb_rm_size: 0.2, reverb_wet: 0.2, reverb_dry: 0.8, reverb_damping: 0.7, output_format: 'mp3',
      enhancement_type: 'Full', eq_type: 'Vocal Boost', noise_reduction: 0, compression_ratio: 3,
      keep_files: false, convert_backup_vocal: false, inst_eq_carve: true, inst_eq_carve_db: -2.0, vocal_ducking_db: -2.5, ai_restoration_hd: false, vst_plugin: "",
      de_esser: true, analog_warmth: 0.1, stereo_width: 0.15, auto_mastering: true, vst_step4: "",

      pre_comp_threshold: -18.0, pre_comp_ratio: 3.5, pre_comp_attack: 2.0, pre_comp_release: 100.0,
      ng_threshold: -35.0, ng_ratio: 8.0, ng_attack: 1.0, ng_release: 50.0,
      pre_gain_db: -3.0, post_exciter_db: 2.0, de_esser_intensity: 4.0,

      vst_step1_dereverb_params: {}, vst_step1_params: {}, vst_step2_params: {},
      vst_step3_main_params: {}, vst_step3_backup_params: {}, vst_step3_inst_params: {}, vst_step4_params: {},
      vst_step3_mix: 0.8, vst_oversampling: 2, ai_air_tamer: true
    }
  },
  {
    name: "🎸 Acoustic / Ballad (Mộc mạc, Ấm)",
    data: {
      pitch_change: 0, index_rate: 0.65, filter_radius: 3, rms_mix_rate: 1.0, f0_method: 'rmvpe',
      crepe_hop_length: 128, protect: 0.33, main_gain: 0, backup_gain: 0, inst_gain: 0,
      reverb_rm_size: 0.3, reverb_wet: 0.25, reverb_dry: 0.8, reverb_damping: 0.6, output_format: 'mp3',
      enhancement_type: 'Light', eq_type: 'Balanced', noise_reduction: 0, compression_ratio: 2,
      keep_files: false, convert_backup_vocal: false, inst_eq_carve: true, inst_eq_carve_db: -1.5, vocal_ducking_db: -2.5, ai_restoration_hd: false, vst_plugin: "",
      de_esser: true, analog_warmth: 0.4, stereo_width: 0.05, auto_mastering: true, vst_step4: "",

      pre_comp_threshold: -15.0, pre_comp_ratio: 2.5, pre_comp_attack: 3.0, pre_comp_release: 150.0,
      ng_threshold: -40.0, ng_ratio: 4.0, ng_attack: 2.0, ng_release: 80.0,
      pre_gain_db: -2.0, post_exciter_db: 1.5, de_esser_intensity: 3.0,

      vst_step1_dereverb_params: {}, vst_step1_params: {}, vst_step2_params: {},
      vst_step3_main_params: {}, vst_step3_backup_params: {}, vst_step3_inst_params: {}, vst_step4_params: {},
      vst_step3_mix: 0.85, vst_oversampling: 2, ai_air_tamer: true
    }
  },
  {
    name: "🔥 Rap / Hiphop (Khô, Dày, Chắc)",
    data: {
      pitch_change: 0, index_rate: 0.65, filter_radius: 4, rms_mix_rate: 0.6, f0_method: 'rmvpe',
      crepe_hop_length: 128, protect: 0.33, main_gain: 0, backup_gain: 0, inst_gain: 0,
      reverb_rm_size: 0.1, reverb_wet: 0.1, reverb_dry: 0.9, reverb_damping: 0.9, output_format: 'mp3',
      enhancement_type: 'Custom', eq_type: 'Bass Boost', noise_reduction: 0, compression_ratio: 4,
      keep_files: false, convert_backup_vocal: false, inst_eq_carve: false, inst_eq_carve_db: -2.5, vocal_ducking_db: -2.5, ai_restoration_hd: false, vst_plugin: "",
      de_esser: true, analog_warmth: 0.5, stereo_width: 0.0, auto_mastering: true, vst_step4: "",

      pre_comp_threshold: -12.0, pre_comp_ratio: 6.0, pre_comp_attack: 1.5, pre_comp_release: 40.0,
      ng_threshold: -25.0, ng_ratio: 15.0, ng_attack: 1.0, ng_release: 40.0,
      pre_gain_db: -4.0, post_exciter_db: 3.0, de_esser_intensity: 6.0,

      vst_step1_dereverb_params: {}, vst_step1_params: {}, vst_step2_params: {},
      vst_step3_main_params: {}, vst_step3_backup_params: {}, vst_step3_inst_params: {}, vst_step4_params: {},
      vst_step3_mix: 0.75, vst_oversampling: 2, ai_air_tamer: false
    }
  },
  {
    name: "🌌 EDM / Cinematic (Siêu Ảo, Rộng)",
    data: {
      pitch_change: 0, index_rate: 0.7, filter_radius: 3, rms_mix_rate: 0.75, f0_method: 'rmvpe',
      crepe_hop_length: 128, protect: 0.33, main_gain: 0, backup_gain: 0, inst_gain: 0,
      reverb_rm_size: 0.5, reverb_wet: 0.35, reverb_dry: 0.65, reverb_damping: 0.5, output_format: 'mp3',
      enhancement_type: 'Aggressive', eq_type: 'Vocal Boost', noise_reduction: 10, compression_ratio: 4,
      keep_files: false, convert_backup_vocal: false, inst_eq_carve: true, inst_eq_carve_db: -3.0, vocal_ducking_db: -3.5, ai_restoration_hd: false, vst_plugin: "",
      de_esser: true, analog_warmth: 0.2, stereo_width: 0.4, auto_mastering: true, vst_step4: "",

      pre_comp_threshold: -20.0, pre_comp_ratio: 4.0, pre_comp_attack: 1.0, pre_comp_release: 80.0,
      ng_threshold: -30.0, ng_ratio: 10.0, ng_attack: 1.0, ng_release: 50.0,
      pre_gain_db: -3.0, post_exciter_db: 4.0, de_esser_intensity: 5.0,

      vst_step1_dereverb_params: {}, vst_step1_params: {}, vst_step2_params: {},
      vst_step3_main_params: {}, vst_step3_backup_params: {}, vst_step3_inst_params: {}, vst_step4_params: {},
      vst_step3_mix: 0.9, vst_oversampling: 2, ai_air_tamer: true
    }
  }
];

// XTTS-v2 Native Supported Languages + User Priority
export const TTS_SUPPORTED_LANGUAGES = [
  { value: 'Vietnamese', name: 'Tiếng Việt' },
  { value: 'English', name: 'English' },
  { value: 'Spanish', name: 'Spanish' },
  { value: 'French', name: 'French' },
  { value: 'German', name: 'German' },
  { value: 'Italian', name: 'Italian' },
  { value: 'Portuguese', name: 'Portuguese' },
  { value: 'Polish', name: 'Polish' },
  { value: 'Turkish', name: 'Turkish' },
  { value: 'Russian', name: 'Russian' },
  { value: 'Dutch', name: 'Dutch' },
  { value: 'Czech', name: 'Czech' },
  { value: 'Arabic', name: 'Arabic' },
  { value: 'Chinese', name: 'Chinese' },
  { value: 'Japanese', name: 'Japanese' },
  { value: 'Hungarian', name: 'Hungarian' },
  { value: 'Korean', name: 'Korean' },
  { value: 'Hindi', name: 'Hindi' }
];

// Expanded language list used for RVC Voice Models Categorization
export const MODEL_LANGUAGES = [
  { value: 'Uncategorized', name: 'Uncategorized' },
  ...TTS_SUPPORTED_LANGUAGES,
  { value: 'Thai', name: 'Thai' }, { value: 'Indonesian', name: 'Indonesian' }, { value: 'Malay', name: 'Malay' }, 
  { value: 'Filipino', name: 'Filipino' }, { value: 'Ukrainian', name: 'Ukrainian' }, { value: 'Romanian', name: 'Romanian' }, 
  { value: 'Greek', name: 'Greek' }, { value: 'Swedish', name: 'Swedish' }, { value: 'Danish', name: 'Danish' }, 
  { value: 'Finnish', name: 'Finnish' }, { value: 'Norwegian', name: 'Norwegian' }, { value: 'Hebrew', name: 'Hebrew' }, 
  { value: 'Bengali', name: 'Bengali' }, { value: 'Urdu', name: 'Urdu' }, { value: 'Persian', name: 'Persian' }, 
  { value: 'Tamil', name: 'Tamil' }, { value: 'Telugu', name: 'Telugu' }, { value: 'Marathi', name: 'Marathi' }, 
  { value: 'Gujarati', name: 'Gujarati' }, { value: 'Kannada', name: 'Kannada' }, { value: 'Malayalam', name: 'Malayalam' }, 
  { value: 'Others', name: 'Khác' }
];

export const VOICEVOX_JP_TO_ROMAJI: Record<string, string> = {
  "春日部つむぎ": "Kasukabe Tsumugi",
  "雨晴はう": "Amahare Hau",
  "波音リツ": "Namine Ritsu",
  "玄野武宏": "Kurono Takehiro",
  "白上虎太郎": "Shirakami Kotarou",
  "青山龍星": "Aoyama Ryusei",
  "冥鳴ひまり": "Meimei Himari",
  "九州そら": "Kyushu Sora",
  "もち子さん": "Mochiko-san",
  "剣崎雌雄": "Kenzaki Shiyuu",
  "WhiteCUL": "WhiteCUL",
  "後鬼": "Goki",
  "No.7": "No.7",
  "ちび式じい": "Chibi Shikijii",
  "櫻歌ミコ": "Ouka Miko",
  "小夜/SAYO": "Sayo",
  "ナースロボ＿タイプＴ": "Nurse Robot Type T",
  "†聖騎士 紅桜†": "Holy Knight Benizakura",
  "雀松朱司": "Suzumatsu Akashi",
  "麒ヶ島宗麟": "Kigashima Sourin",
  "四国めたん": "Shikoku Metan",
  "ずんだもん": "Zundamon",
  "春音アリス": "Harune Alice",
  "春歌ナナ": "Haruka Nana",
  "猫使アル": "Nekotsukai Aru",
  "猫使ビィ": "Nekotsukai Bii",
  "中国うさぎ": "Chugoku Usagi",
  "栗田まろん": "Kurita Maron",
  "あいえるたん": "Aierutan",
  "満別花丸": "Manbetsu Hanamaru",
  "琴詠ニア": "Kotoyomi Nia",
  "満別花まつり": "Manbetsu Hanamatsuri"
};

export const cleanVoiceName = (name: string) => {
  if (!name) return '';
  let clean = name.replace(/\[(Voicevox|VoiceVox|Base TTS)\]\s*/ig, '').trim();
  if (VOICEVOX_JP_TO_ROMAJI[clean]) {
      clean = `${clean} (${VOICEVOX_JP_TO_ROMAJI[clean]})`;
  }
  return clean;
};

export const cleanVoiceDescription = (desc: string) => {
  if (!desc) return '';
  return desc.replace(/Voicevox/ig, '').replace(/\s\s+/g, ' ').trim();
};
