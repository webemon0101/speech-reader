import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, HelpCircle, Laptop, Smartphone, Sparkles, Volume2 } from 'lucide-react';
import { VoiceConfig, PlaybackState, ParsedDocument } from './types';
import { splitIntoSentences } from './utils/textParser';
import VoiceSelector from './components/VoiceSelector';
import DocumentReader from './components/DocumentReader';
import WebReader from './components/WebReader';
import PlaybackControls from './components/PlaybackControls';
import TextViewer from './components/TextViewer';

const DEFAULT_WELCOME_TEXT = `Speech Readerへようこそ！

このアプリは、ブラウザだけで完結する高機能な「音声読み上げ」ウェブリーダーです。
オフライン動作に対応（PWA）しており、スマートフォンのホーム画面に追加してアプリ感覚で利用可能です。

【主な特徴】
1. 多彩なメディアに対応：お手持ちの PDF・テキストファイル をドラッグ＆ドロップするだけで自動抽出します。
2. ウェブ上の記事自動認識：任意のブログやニュース記事の URL を入力すると、不要なメニューなどを排除して本文だけを自動抽出して読み上げます。
3. 高水準な声色カスタマイズ：お好みの男性・女性声や、1文字ごとのハイライト表示、読み上げ速度の微調整に対応しています。

【操作方法】
下部の再生ボタンをタップすると、このガイドを実際に音声で読み上げます。
読み上げ中の文章は自動的に画面の中央にスクロールされ、背景色がハイライトされます。また、任意の文章をタップすることで特定の箇所から直接読み始めることができます！`;

export default function App() {
  const [activeDoc, setActiveDoc] = useState<ParsedDocument>({
    title: 'チュートリアル.txt',
    sentences: splitIntoSentences(DEFAULT_WELCOME_TEXT),
    rawText: DEFAULT_WELCOME_TEXT,
    sourceType: 'text',
    sourceName: '使い方ガイド',
  });

  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    voiceName: '',
    lang: 'ja',
    rate: 1.0,
    pitch: 1.0,
    gender: 'all',
  });

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentIndex: 0,
  });

  const [activeTab, setActiveTab] = useState<'info' | 'file' | 'web'>('info');
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Local state references to prevent closing bindings in SpeechSynthesis loop
  const stateRef = useRef({ playbackState, activeDoc, voiceConfig });
  useEffect(() => {
    stateRef.current = { playbackState, activeDoc, voiceConfig };
  }, [playbackState, activeDoc, voiceConfig]);

  // Load and configure default system voice
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      setSystemVoices(voices);

      // Try finding preferred Japanese voice if none selected
      if (!stateRef.current.voiceConfig.voiceName && voices.length > 0) {
        const jaVoice = voices.find(v => v.lang.startsWith('ja')) || voices[0];
        setVoiceConfig(prev => ({
          ...prev,
          voiceName: jaVoice.name,
          lang: jaVoice.lang,
        }));
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Cleanup speech engine on component unmount
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text playback core routine
  const speakCurrentSentence = (index: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Halt other browser synthesize tasks
    window.speechSynthesis.cancel();

    const { activeDoc: doc, voiceConfig: config } = stateRef.current;
    if (!doc || doc.sentences.length === 0 || index < 0 || index >= doc.sentences.length) {
      setPlaybackState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
      return;
    }

    const sentence = doc.sentences[index];
    const utterance = new SpeechSynthesisUtterance(sentence.text);

    // Bind correct voice matching selections
    const systemVoice = systemVoices.find(v => v.name === config.voiceName);
    if (systemVoice) {
      utterance.voice = systemVoice;
    }

    utterance.rate = config.rate;
    utterance.pitch = config.pitch;

    // Handle end of sentence -> sequentially trigger next sentence speaker callback
    utterance.onend = () => {
      const nextIndex = index + 1;
      const updatedDoc = stateRef.current.activeDoc;

      if (nextIndex < updatedDoc.sentences.length) {
        setPlaybackState(prev => {
          // If stopped while in transaction, exit early
          if (!stateRef.current.playbackState.isPlaying) return prev;
          
          speakCurrentSentence(nextIndex);
          return { ...prev, currentIndex: nextIndex };
        });
      } else {
        // Reading parsed content completion
        setPlaybackState({ isPlaying: false, isPaused: false, currentIndex: 0 });
      }
    };

    utterance.onerror = (e) => {
      // Ensure we don't block interface if browser cancels intermediate requests
      if (e.error !== 'interrupted') {
        console.error('SpeechSynthesis error event:', e);
        setPlaybackState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Playback Control Handlers
  const handlePlay = () => {
    if (playbackState.isPlaying && playbackState.isPaused) {
      // Resume playback
      setPlaybackState(prev => ({ ...prev, isPaused: false }));
      speakCurrentSentence(playbackState.currentIndex);
    } else {
      // Starts fresh from current index
      setPlaybackState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
      speakCurrentSentence(playbackState.currentIndex);
    }
  };

  const handlePause = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlaybackState(prev => ({ ...prev, isPaused: true }));
  };

  const handleStop = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlaybackState({ isPlaying: false, isPaused: false, currentIndex: 0 });
  };

  const handleNext = () => {
    const nextIdx = Math.min(playbackState.currentIndex + 1, activeDoc.sentences.length - 1);
    setPlaybackState(prev => ({ ...prev, currentIndex: nextIdx }));
    if (playbackState.isPlaying && !playbackState.isPaused) {
      speakCurrentSentence(nextIdx);
    }
  };

  const handlePrevious = () => {
    const prevIdx = Math.max(playbackState.currentIndex - 1, 0);
    setPlaybackState(prev => ({ ...prev, currentIndex: prevIdx }));
    if (playbackState.isPlaying && !playbackState.isPaused) {
      speakCurrentSentence(prevIdx);
    }
  };

  const handleSeek = (index: number) => {
    setPlaybackState(prev => ({ ...prev, currentIndex: index }));
    if (playbackState.isPlaying && !playbackState.isPaused) {
      speakCurrentSentence(index);
    }
  };

  const handleSentenceTap = (index: number) => {
    setPlaybackState(prev => ({ 
      ...prev, 
      currentIndex: index, 
      isPlaying: true, 
      isPaused: false 
    }));
    speakCurrentSentence(index);
  };

  const handleNewDocumentImported = (doc: ParsedDocument) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveDoc(doc);
    setPlaybackState({ isPlaying: false, isPaused: false, currentIndex: 0 });
    // Switch to read mode
    setActiveTab('info');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-28 md:pb-24">
      {/* Upper Navigation Bar */}
      <header className="sticky top-0 z-40 bg-stone-50/90 backdrop-blur-md border-b border-stone-200/80 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-stone-900 p-2 rounded-xl text-stone-100 shadow-sm flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-1.5">
                <span>Speech Reader</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium sm:block hidden">
                  PWA オフライン対応
                </span>
              </h1>
            </div>
          </div>
          
          {/* OS layout indicator bar */}
          <div className="flex items-center space-x-1 text-[11px] text-stone-400 font-mono font-medium">
            <span className="bg-stone-200/50 px-2 py-0.5 rounded">All OS (Windows / iOS / Android) Support</span>
          </div>
        </div>
      </header>

      {/* Primary Layout Engine */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left panel layout column: Controller widgets and Import */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Control Config Panel */}
            <VoiceSelector 
              config={voiceConfig} 
              onConfigChange={(newConfig) => setVoiceConfig(newConfig)} 
            />

            {/* Input Selection Card */}
            <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
              <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-stone-100">
                <Sparkles className="h-4.5 w-4.5 text-stone-600" />
                <h2 className="text-sm font-semibold text-stone-800">文書インポートパネル</h2>
              </div>

              {/* Tabs list inside panels card */}
              <div className="grid grid-cols-3 gap-1.5 bg-stone-100 p-1 rounded-xl mb-5">
                {[
                  { value: 'info', label: 'ガイド文章' },
                  { value: 'file', label: 'PDF / ファイル' },
                  { value: 'web', label: 'ウェブサイト' }
                ].map(tab => (
                  <button
                    key={tab.value}
                    id={`btn-tab-panel-${tab.value}`}
                    onClick={() => setActiveTab(tab.value as any)}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activeTab === tab.value 
                        ? 'bg-white text-stone-900 shadow-sm' 
                        : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Display Screens */}
              <div className="pt-1">
                {activeTab === 'info' && (
                  <div className="space-y-4 text-xs text-stone-600 leading-relaxed font-normal">
                    <p>
                      現在読み込んでいるのは<strong>「使い方ガイド」</strong>です（下部ペインでいつでも確認可能）。
                    </p>
                    <p>
                      別の文章を読みたい場合は、上部のタブから<strong>「PDF / ファイル」</strong>または<strong>「ウェブサイト」</strong>を選択してインポートしてください。
                    </p>
                    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/60 flex items-start space-x-2.5">
                      <HelpCircle className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-stone-800 block mb-0.5">音声が出ない場合：</span>
                        <span>一部端末ではブラウザの音声制限がかかっているため、まずは下部の「再生ボタン」を押して再生をお試しください。</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'file' && (
                  <DocumentReader onDocumentParsed={handleNewDocumentImported} />
                )}

                {activeTab === 'web' && (
                  <WebReader onDocumentParsed={handleNewDocumentImported} />
                )}
              </div>
            </div>

          </div>

          {/* Right panel layout column: E-Reader reading viewport */}
          <div className="lg:col-span-7">
            <TextViewer 
              document={activeDoc} 
              currentIndex={playbackState.currentIndex} 
              onSentenceClick={handleSentenceTap} 
            />
          </div>

        </div>
      </main>

      {/* Premium Fully Sticky Audio Player HUD for both platforms */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-stone-950/90 backdrop-blur-md border-t border-stone-800/80 px-4 py-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <PlaybackControls 
            state={playbackState} 
            totalSentences={activeDoc.sentences.length} 
            rate={voiceConfig.rate}
            onRateChange={(rate) => setVoiceConfig(p => ({ ...p, rate }))}
            onPlay={handlePlay} 
            onPause={handlePause} 
            onStop={handleStop} 
            onNext={handleNext} 
            onPrevious={handlePrevious} 
            onSeek={handleSeek}
            activeSentenceText={activeDoc.sentences[playbackState.currentIndex]?.text}
          />
        </div>
      </footer>
    </div>
  );
}