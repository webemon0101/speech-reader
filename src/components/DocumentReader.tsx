import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { extractTextFromPDF, splitIntoSentences } from '../utils/textParser';
import { ParsedDocument } from '../types';

interface DocumentReaderProps {
  onDocumentParsed: (doc: ParsedDocument) => void;
}

export default function DocumentReader({ onDocumentParsed }: DocumentReaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errMessage, setErrMessage] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState(0);
  const [successFile, setSuccessFile] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsParsing(true);
    setErrMessage(null);
    setParseProgress(0);
    setSuccessFile(null);

    const fileType = file.name.split('.').pop()?.toLowerCase();

    try {
      let extractedText = '';

      if (fileType === 'pdf') {
        extractedText = await extractTextFromPDF(file, (percent) => {
          setParseProgress(percent);
        });
      } else if (fileType === 'txt' || fileType === 'md' || fileType === 'json') {
        const text = await readFileAsText(file);
        if (fileType === 'json') {
          try {
            // Attempt clean JSON formatting if they upload JSON content
            const parsed = JSON.parse(text);
            extractedText = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
          } catch {
            extractedText = text;
          }
        } else {
          extractedText = text;
        }
      } else {
        throw new Error('非対応のファイル形式です。.txt, .md, .pdf, .json フォーマットに対応しています。');
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('ファイル内に読み取り可能なテキストが見つかりませんでした。');
      }

      const sentences = splitIntoSentences(extractedText);
      
      onDocumentParsed({
        title: file.name,
        sentences: sentences,
        rawText: extractedText,
        sourceType: 'file',
        sourceName: file.name,
      });

      setSuccessFile(file.name);
    } catch (err: any) {
      setErrMessage(err.message || 'ファイルの読み込み中にエラーが発生しました。');
    } finally {
      setIsParsing(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('テキストの抽出に失敗しました。'));
      reader.readAsText(file, 'utf-8');
    });
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h3 className="text-stone-800 font-semibold text-sm mb-3">ドキュメントを読み込む (PDF / テキスト)</h3>
      
      <div
        id="dropzone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className={`relative group flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer select-none min-h-[220px] ${
          isDragging 
            ? 'border-stone-800 bg-stone-100/70 scale-[1.01]' 
            : 'border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50/50'
        }`}
      >
        <input
          id="file-upload-input"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".txt,.md,.pdf,.json"
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {isParsing ? (
            <motion.div
              key="parsing"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="flex flex-col items-center space-y-4"
            >
              <div className="relative flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-stone-800 animate-spin" />
                <span className="absolute text-[10px] font-mono font-bold text-stone-900 mt-0.5">
                  {parseProgress}%
                </span>
              </div>
              <div>
                <p id="lbl-parsing-status" className="text-sm font-semibold text-stone-800">ファイルを読み込んでいます...</p>
                <p className="text-xs text-stone-500 mt-1">PDFテキストや段落レイアウトを最適化しています。</p>
              </div>
              <div className="w-48 bg-stone-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-stone-800 h-full transition-all duration-300" 
                  style={{ width: `${parseProgress}%` }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="flex flex-col items-center space-y-4"
            >
              <div className="p-4 bg-stone-100 group-hover:bg-stone-200 rounded-full text-stone-600 transition-colors">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-800">
                  ここにファイルをドラッグ＆ドロップ、またはタップして選択
                </p>
                <p className="text-xs text-stone-400 mt-1.5">
                  対応形式: PDF, TXT, Markdown (.md), JSON
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Message Banner */}
      {errMessage && (
        <div id="file-error-alert" className="mt-4 flex items-start space-x-3 bg-red-50 border border-red-100 p-4 rounded-xl text-red-800 text-xs">
          <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">読み込みエラー</span>
            <span>{errMessage}</span>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successFile && !isParsing && (
        <div id="file-success-alert" className="mt-4 flex items-center space-x-2 bg-stone-900 text-white p-3 rounded-xl text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 text-theme-cream mr-1 text-green-400" />
          <span>ファイル「{successFile}」のインポートに成功しました！下の再生ボタンで読み上げを開始できます。</span>
        </div>
      )}
    </div>
  );
}
