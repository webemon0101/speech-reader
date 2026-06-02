import { useEffect, useState, ChangeEvent } from 'react';
import { VoiceConfig } from '../types';
import { Volume2, Settings, MessageSquare, Headphones, Sliders, Globe } from 'lucide-react';

interface VoiceSelectorProps {
  config: VoiceConfig;
  onConfigChange: (newConfig: VoiceConfig) => void;
}

export default function VoiceSelector({ config, onConfigChange }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [copiedVoices, setCopiedVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [langFilter, setLangFilter] = useState<string>('ja'); // Default to Japanese (ja)
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
      setCopiedVoices(allVoices);
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Heuristically detect gender of a voice based on name
  const getHeuristicGender = (voice: SpeechSynthesisVoice): 'male' | 'female' | 'unknown' => {
    const name = voice.name.toLowerCase();
    
    const maleNames = [
      'male', 'david', 'guy', 'ichiro', 'george', 'ravi', 'sean', 'danny', 
      'microsoft ichiro', 'keita', 'shigenori', 'mizuki', 'daniel', 'greg', 
      'matt', 'thomas', 'oliver', 'liam', 'ryan'
    ];
    const femaleNames = [
      'female', 'zira', 'haruka', 'heather', 'hazel', 'susan', 'elsa', 'karen', 
      'catherine', 'nanami', 'aoi', 'ayumi', 'haruka', 'siri female', 'google-female',
      'heather', 'ayumi', 'mayu', 'fiona', 'moira', 'tessa', 'samantha', 'vera'
    ];

    if (maleNames.some(m => name.includes(m))) return 'male';
    if (femaleNames.some(f => name.includes(f))) return 'female';
    
    // Default fallback heuristics depending on systems
    return 'unknown';
  };

  // Unique languages found in system voices
  const uniqueLangs = Array.from(new Set(voices.map(v => v.lang.split('-')[0]))).sort();

  // Filter voices
  const filteredVoices = voices.filter(voice => {
    const vLang = voice.lang.toLowerCase();
    const hasLangMatch = langFilter === 'all' || vLang.startsWith(langFilter.toLowerCase());
    
    const determinedGender = getHeuristicGender(voice);
    const hasGenderMatch = 
      genderFilter === 'all' || 
      (genderFilter === 'male' && determinedGender === 'male') ||
      (genderFilter === 'female' && determinedGender === 'female') ||
      (genderFilter === 'male' && determinedGender === 'unknown' && voice.name.toLowerCase().includes('ichiro')) || // specific fallback
      (genderFilter === 'female' && determinedGender === 'unknown' && !voice.name.toLowerCase().includes('ichiro')); // typical fallback if no other info

    const hasSearchMatch = 
      voice.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      voice.lang.toLowerCase().includes(searchQuery.toLowerCase());

    return hasLangMatch && hasGenderMatch && hasSearchMatch;
  });

  const handleVoiceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onConfigChange({
      ...config,
      voiceName: e.target.value,
    });
  };

  const selectedVoice = voices.find(v => v.name === config.voiceName) || voices.find(v => v.lang.startsWith('ja')) || voices[0];

  const testVoice = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !selectedVoice) return;
    
    // Cancel of ongoing utterance
    window.speechSynthesis.cancel();

    const sampleText = selectedVoice.lang.startsWith('ja') 
      ? '音声のテストを起動しました。聞き取りやすいですか？' 
      : 'Hello! This is a test of the customized speech engine. How does it sound?';

    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.voice = selectedVoice;
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm transition-all hover:shadow-md">
      {/* Header with expand control */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-stone-100 text-stone-700 rounded-xl">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <h2 id="voice-settings-title" className="text-sm font-semibold text-stone-800">音声アシスタント設定</h2>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              {selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : '標準音声'}
            </p>
          </div>
        </div>
        <button
          id="btn-toggle-settings"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <Settings className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
          <span>{isOpen ? '閉じる' : '詳細設定'}</span>
        </button>
      </div>

      {/* Settings Panel Body */}
      <div className={`transition-all duration-300 overflow-hidden ${isOpen ? 'mt-5 opacity-100 max-h-[800px]' : 'max-h-0 opacity-0'}`}>
        <div className="pt-4 border-t border-stone-100 space-y-4">
          
          {/* Quick Voice Selector & Test Button */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <label htmlFor="voice-select-dropdown" className="block text-xs font-medium text-stone-600 mb-1.5">システム音声</label>
              <select
                id="voice-select-dropdown"
                value={config.voiceName}
                onChange={handleVoiceChange}
                className="w-full shrink-0 text-sm px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all cursor-pointer"
              >
                {voices.length === 0 ? (
                  <option id="opt-loading-voices" value="">音声が利用できません（システム読み込み中）</option>
                ) : (
                  voices.map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang}) [{getHeuristicGender(voice) === 'male' ? '男性' : getHeuristicGender(voice) === 'female' ? '女性' : '標準'}]
                    </option>
                  ))
                )}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                id="btn-test-voice"
                onClick={testVoice}
                disabled={!selectedVoice}
                className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-stone-900 text-stone-100 text-sm font-medium rounded-xl hover:bg-stone-800 focus:ring-2 focus:ring-stone-400 disabled:bg-stone-200 disabled:text-stone-400 transition-all cursor-pointer h-[42px]"
              >
                <Headphones className="h-4 w-4" />
                <span>テスト再生</span>
              </button>
            </div>
          </div>

          {/* Advanced Filtering Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50 rounded-xl p-4 border border-stone-100">
            {/* Lang filter */}
            <div>
              <span className="flex items-center space-x-1 text-xs font-semibold text-stone-700 mb-2">
                <Globe className="h-3.5 w-3.5" />
                <span>言語フィルター</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { value: 'ja', label: '日本語' },
                  { value: 'en', label: 'English' },
                  { value: 'all', label: 'すべて' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    id={`btn-lang-${opt.value}`}
                    onClick={() => {
                      setLangFilter(opt.value);
                      // Auto-select first matching voice
                      const firstMatch = voices.find(v => opt.value === 'all' || v.lang.toLowerCase().startsWith(opt.value));
                      if (firstMatch) {
                        onConfigChange({ ...config, voiceName: firstMatch.name, lang: firstMatch.lang });
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      langFilter === opt.value
                        ? 'bg-stone-900 border-stone-900 text-white'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender filter */}
            <div>
              <span className="flex items-center space-x-1 text-xs font-semibold text-stone-700 mb-2">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>声色 (男声 / 女声)</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { value: 'all', label: 'すべて' },
                  { value: 'female', label: '女性声' },
                  { value: 'male', label: '男性声' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    id={`btn-gender-${opt.value}`}
                    onClick={() => {
                      setGenderFilter(opt.value as any);
                      // Auto-select first matching voice in new gender set if current does not match
                      const firstMatch = voices.find(v => {
                        const gender = getHeuristicGender(v);
                        const isGenderMatched = opt.value === 'all' || 
                          (opt.value === 'male' && gender === 'male') || 
                          (opt.value === 'female' && gender === 'female');
                        return isGenderMatched && (langFilter === 'all' || v.lang.toLowerCase().startsWith(langFilter));
                      });
                      if (firstMatch) {
                        onConfigChange({ ...config, voiceName: firstMatch.name, lang: firstMatch.lang });
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      genderFilter === opt.value
                        ? 'bg-stone-900 border-stone-900 text-white'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search filter */}
            <div>
              <label htmlFor="voice-search-input" className="block text-xs font-semibold text-stone-700 mb-1.5">キーワード検索</label>
              <input
                id="voice-search-input"
                type="text"
                placeholder="例: Google, Haruka, Siri"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-700 placeholder-stone-400 focus:outline-none focus:border-stone-400"
              />
            </div>
          </div>

          {/* Speed & Pitch Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Speed slider */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center space-x-1.5 text-xs font-semibold text-stone-700">
                  <Sliders className="h-3.5 w-3.5" />
                  <span>読み上げ速度 (Rate)</span>
                </span>
                <span className="text-xs font-mono font-medium text-stone-700 bg-stone-200/60 px-2 py-0.5 rounded">
                  {config.rate.toFixed(2)}x
                </span>
              </div>
              <input
                id="rate-slider"
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={config.rate}
                onChange={(e) => onConfigChange({ ...config, rate: parseFloat(e.target.value) })}
                className="w-full accent-stone-700 cursor-pointer h-1.5 bg-stone-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between mt-1.5 text-[10px] text-stone-400 font-medium">
                <span>0.5x (ゆっくり)</span>
                <span>1.0x (標準)</span>
                <span>2.5x (高速)</span>
              </div>
            </div>

            {/* Pitch slider */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center space-x-1.5 text-xs font-semibold text-stone-700">
                  <Sliders className="h-3.5 w-3.5" />
                  <span>声のピッチ (Pitch)</span>
                </span>
                <span className="text-xs font-mono font-medium text-stone-700 bg-stone-200/60 px-2 py-0.5 rounded">
                  {config.pitch.toFixed(2)}
                </span>
              </div>
              <input
                id="pitch-slider"
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={config.pitch}
                onChange={(e) => onConfigChange({ ...config, pitch: parseFloat(e.target.value) })}
                className="w-full accent-stone-700 cursor-pointer h-1.5 bg-stone-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between mt-1.5 text-[10px] text-stone-400 font-medium">
                <span>0.5 (低い声)</span>
                <span>1.0 (標準)</span>
                <span>1.5 (高い声)</span>
              </div>
            </div>
          </div>

          {/* Quick Info text */}
          <p className="text-[11px] text-stone-400 font-medium bg-stone-50/50 p-2.5 rounded-lg border border-dashed border-stone-200/80 leading-relaxed text-center">
            💡 iOS/Safariや一部のAndroid端末では、最初にユーザーが開始ボタンをタップした後にのみ音声が有効になります。また、お使いの端末で利用可能な音声のみが表示されます。
          </p>

        </div>
      </div>
    </div>
  );
}
