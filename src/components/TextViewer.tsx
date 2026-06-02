import { useEffect, useRef, useState } from 'react';
import { Type, ZoomIn, ZoomOut, Eye, RefreshCw, Check, Compass, BookOpen } from 'lucide-react';
import { ParsedDocument } from '../types';

interface TextViewerProps {
  document: ParsedDocument;
  currentIndex: number;
  onSentenceClick: (index: number) => void;
}

export default function TextViewer({ document, currentIndex, onSentenceClick }: TextViewerProps) {
  const [fontSize, setFontSize] = useState<number>(18); // default size in px
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('sans');
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  
  const activeLineRef = useRef<HTMLSpanElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll active block into focus center
  useEffect(() => {
    if (isAutoScrollEnabled && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentIndex, isAutoScrollEnabled]);

  const handleFontToggle = () => {
    setFontFamily(prev => (prev === 'serif' ? 'sans' : 'serif'));
  };

  const handleZoomIn = () => {
    setFontSize(prev => Math.min(prev + 2, 32));
  };

  const handleZoomOut = () => {
    setFontSize(prev => Math.max(prev - 2, 12));
  };

  const fontStyle = fontFamily === 'serif' 
    ? 'font-serif tracking-normal font-normal' 
    : 'font-sans tracking-tight font-light';

  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden flex flex-col h-[520px]">
      
      {/* Toolbar */}
      <div className="px-5 py-3.5 border-b border-stone-100 bg-stone-50/50 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <BookOpen className="h-5 w-5 text-stone-500" />
          <h4 id="viewer-document-title" className="text-sm font-semibold text-stone-800 truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
            {document.title || 'リーディングキャンバス'}
          </h4>
          <span className="text-[10px] font-mono bg-stone-200/60 text-stone-600 px-2 py-0.5 rounded-md font-medium">
            {document.sentences.length} 文
          </span>
        </div>

        {/* Adjust font parameters & display options */}
        <div className="flex items-center space-x-2">
          {/* Typography */}
          <button
            id="btn-toggle-font"
            onClick={handleFontToggle}
            className="p-1.5 hover:bg-stone-200 text-stone-600 rounded-md transition-colors cursor-pointer"
            title="フォント切り替え (明朝/ゴシック)"
          >
            <Type className="h-4 w-4" />
          </button>

          {/* Size Controls */}
          <div className="flex items-center bg-stone-200/50 rounded-lg p-0.5 border border-stone-200">
            <button
              id="btn-zoom-out"
              onClick={handleZoomOut}
              className="p-1 hover:bg-white text-stone-600 rounded-md transition-all cursor-pointer"
              title="文字を小さく"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-mono px-2 font-semibold text-stone-500">
              {fontSize}px
            </span>
            <button
              id="btn-zoom-in"
              onClick={handleZoomIn}
              className="p-1 hover:bg-white text-stone-600 rounded-md transition-all cursor-pointer"
              title="文字を大きく"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Centering checkbox */}
          <button
            id="btn-toggle-scroll"
            onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg border transition-all cursor-pointer ${
              isAutoScrollEnabled 
                ? 'bg-stone-900 border-stone-900 text-white' 
                : 'bg-white border-stone-200 text-stone-500'
            }`}
            title="自動追従のオンオフ"
          >
            <Eye className="h-3 w-3" />
            <span className="hidden sm:inline">追従: {isAutoScrollEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Reading Canvas */}
      <div 
        ref={scrollContainerRef}
        id="reader-scroll-canvas"
        className="flex-grow overflow-y-auto p-6 md:p-10 scrollbar-thin scrollbar-thumb-stone-200 bg-[#FAF9F5] select-text"
        style={{ fontSize: `${fontSize}px` }}
      >
        <div className={`max-w-2xl mx-auto leading-relaxed md:leading-loose text-stone-800 ${fontStyle}`}>
          {document.sentences.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-[320px] max-w-sm mx-auto space-y-4">
              <Compass className="h-10 w-10 text-stone-300 stroke-[1.5]" />
              <div>
                <p className="text-sm font-semibold text-stone-700">準備はすべて整いました。</p>
                <p className="text-xs text-stone-400 mt-1">上の「ドキュメント読み込み」または「ウェブページ」から文章を追加し、プレミアムな読み上げ体験を始めましょう。</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {document.sentences.map((sentence, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <span
                    key={sentence.id}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => onSentenceClick(idx)}
                    className={`inline px-1 py-0.5 rounded cursor-pointer transition-all duration-300 decoration-stone-200 decoration-1 hover:underline underline-offset-4 ${
                      isActive
                        ? 'bg-amber-100 text-stone-950 font-normal border-l-4 border-amber-400 pl-2 lg:pl-3 mr-1 bg-opacity-95 shadow-sm block'
                        : 'text-stone-700 hover:text-stone-900 mr-1'
                    }`}
                    style={{
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {sentence.text}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Simple Instruction Bar footer */}
      {document.sentences.length > 0 && (
        <div className="px-4 py-2 border-t border-stone-100 bg-stone-50 text-[10px] text-stone-400 text-center font-medium font-sans">
          💡 読みたい一文を<strong>ダブルタップ / タップ</strong>すると、その文章から直接読み上げを開始できます。
        </div>
      )}
    </div>
  );
}
