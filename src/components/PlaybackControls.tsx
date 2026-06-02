import { ChangeEvent } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Flame, RotateCcw } from 'lucide-react';
import { PlaybackState } from '../types';

interface PlaybackControlsProps {
  state: PlaybackState;
  totalSentences: number;
  rate: number;
  onRateChange: (rate: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (index: number) => void;
  activeSentenceText?: string;
}

export default function PlaybackControls({
  state,
  totalSentences,
  rate,
  onRateChange,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrevious,
  onSeek,
  activeSentenceText
}: PlaybackControlsProps) {
  const { isPlaying, isPaused, currentIndex } = state;
  const progressPercent = totalSentences > 1 ? Math.round((currentIndex / (totalSentences - 1)) * 100) : 0;

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0 && val < totalSentences) {
      onSeek(val);
    }
  };

  const speedPresets = [0.8, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="bg-stone-900 text-stone-100 rounded-3xl p-5 md:p-6 shadow-xl border border-stone-800 transition-all">
      <div className="space-y-4">
        
        {/* Sentence Text Ticker / Status Bar */}
        {totalSentences > 0 ? (
          <div className="bg-stone-950/60 rounded-2xl p-4 border border-stone-800/80 min-h-[58px] flex flex-col justify-center">
            {isPlaying || isPaused ? (
              <div className="space-y-1.5 animate-fadeIn">
                <div className="flex justify-between items-center text-[10px] font-mono text-stone-400">
                  <span>再生モジュール</span>
                  <span>{currentIndex + 1} / {totalSentences} 文</span>
                </div>
                <p id="player-sentence-text" className="text-xs text-stone-200 font-medium line-clamp-1 border-l-2 border-amber-400 pl-2 leading-relaxed">
                  {activeSentenceText || '読み上げデータを準備しています...'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-1 text-center">
                <p id="lbl-player-idle" className="text-xs font-medium text-stone-400">
                  インポートした文章はありません。再生ボタンで開始します。
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* Timeline Slider with Progress Markers */}
        {totalSentences > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-mono font-semibold text-stone-400 w-8 text-right">
                {String(currentIndex + 1).padStart(2, '0')}
              </span>
              <input
                id="playback-range-slider"
                type="range"
                min="0"
                max={Math.max(0, totalSentences - 1)}
                value={currentIndex}
                onChange={handleSliderChange}
                className="flex-grow accent-amber-400 cursor-pointer h-1.5 bg-stone-700 rounded-lg appearance-none"
              />
              <span className="text-[10px] font-mono font-semibold text-stone-400 w-8">
                {String(totalSentences).padStart(2, '0')}
              </span>
            </div>
            
            <div className="flex justify-between text-[10px] text-stone-400 px-8">
              <span>進捗状況</span>
              <span className="font-semibold text-amber-300 font-mono">{progressPercent}% 読了</span>
            </div>
          </div>
        )}

        {/* Media Buttons Control Box */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          {/* Quick speed controls */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold text-stone-400 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-stone-500" />
              <span>速度:</span>
            </span>
            <div className="flex items-center bg-stone-950/70 p-1.5 rounded-xl border border-stone-800">
              {speedPresets.map(preset => (
                <button
                  key={preset}
                  id={`btn-preset-${preset.toFixed(2).replace('.', '')}`}
                  onClick={() => onRateChange(preset)}
                  className={`px-2 py-1 text-[11px] font-semibold font-mono rounded-lg transition-colors cursor-pointer ${
                    rate === preset 
                      ? 'bg-amber-400 text-stone-950 shadow-sm' 
                      : 'text-stone-300 hover:text-white hover:bg-stone-800/50'
                  }`}
                >
                  {preset.toFixed(2)}x
                </button>
              ))}
            </div>
          </div>

          {/* Main playback states */}
          <div className="flex items-center space-x-3.5">
            <button
              id="btn-playback-prev"
              onClick={onPrevious}
              disabled={totalSentences === 0 || currentIndex === 0}
              className="p-3 bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 rounded-xl transition-all disabled:bg-stone-800/40 disabled:text-stone-600 disabled:pointer-events-none cursor-pointer"
              title="前の文章へ"
            >
              <SkipBack className="h-4.5 w-4.5" />
            </button>

            {isPlaying && !isPaused ? (
              <button
                id="btn-playback-pause"
                onClick={onPause}
                disabled={totalSentences === 0}
                className="p-4 bg-amber-400 text-stone-950 hover:bg-amber-300 rounded-2xl transition-all shadow-md active:scale-95 disabled:bg-stone-800 disabled:text-stone-600 font-bold shrink-0 cursor-pointer"
                title="一時停止"
              >
                <Pause className="h-5.5 w-5.5 stroke-[2.5]" />
              </button>
            ) : (
              <button
                id="btn-playback-play"
                onClick={onPlay}
                disabled={totalSentences === 0}
                className="p-4 bg-amber-400 text-stone-950 hover:bg-amber-300 rounded-2xl transition-all shadow-md active:scale-95 disabled:bg-stone-800 disabled:text-stone-600 font-bold shrink-0 cursor-pointer"
                title="再生開始"
              >
                <Play className="h-5.5 w-5.5 stroke-[2.5] fill-stone-950" />
              </button>
            )}

            <button
              id="btn-playback-next"
              onClick={onNext}
              disabled={totalSentences === 0 || currentIndex === totalSentences - 1}
              className="p-3 bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 rounded-xl transition-all disabled:bg-stone-800/40 disabled:text-stone-600 disabled:pointer-events-none cursor-pointer"
              title="次の文章へ"
            >
              <SkipForward className="h-4.5 w-4.5" />
            </button>

            <button
              id="btn-playback-stop"
              onClick={onStop}
              disabled={totalSentences === 0 || (!isPlaying && !isPaused)}
              className="p-3 bg-stone-850 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl border border-stone-800 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="停止・リセット"
            >
              <Square className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Reset playback setting */}
          {totalSentences > 0 && (isPlaying || isPaused) && (
            <button
              id="btn-playback-reset"
              onClick={() => onSeek(0)}
              className="flex items-center space-x-1 py-1.5 px-3 text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-all cursor-pointer border border-stone-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>最初に戻る</span>
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
