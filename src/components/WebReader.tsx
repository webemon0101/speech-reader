import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Globe, ArrowRight, Loader2, AlertCircle, Copy, FileText } from 'lucide-react';
import { extractReadableContent, splitIntoSentences } from '../utils/textParser';
import { ParsedDocument } from '../types';

interface WebReaderProps {
  onDocumentParsed: (doc: ParsedDocument) => void;
}

export default function WebReader({ onDocumentParsed }: WebReaderProps) {
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'paste'>('url');
  const [isLoading, setIsLoading] = useState(false);
  const [errMessage, setErrMessage] = useState<string | null>(null);

  const handleFetchUrl = async (e: FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setErrMessage(null);

    // Ensure URL has protocol
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      // CORS Proxy using allorigins.win
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('ウェブページの読み込みに失敗しました。CORSポリシーまたはサーバーエラーにより保護されている可能性があります。');
      }

      const html = await response.text();
      const parsed = extractReadableContent(html, targetUrl);

      if (!parsed.content || parsed.content.trim().length === 0) {
        throw new Error('ウェブページから有効な本文テキストを抽出できませんでした。手動でのコピー＆ペーストをお試しください。');
      }

      const sentences = splitIntoSentences(parsed.content);

      onDocumentParsed({
        title: parsed.title,
        sentences: sentences,
        rawText: parsed.content,
        sourceType: 'web',
        sourceName: targetUrl,
      });

    } catch (err: any) {
      setErrMessage(err.message || 'ページの取得中に予期せぬエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportPastedText = (e: FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    const documentTitle = pastedTitle.trim() || 'コピペした文章 ' + new Date().toLocaleTimeString();
    const sentences = splitIntoSentences(pastedText);

    onDocumentParsed({
      title: documentTitle,
      sentences: sentences,
      rawText: pastedText,
      sourceType: 'text',
      sourceName: '手動入力',
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Selector Tabs */}
      <div className="flex border-b border-stone-200 mb-5 relative">
        <button
          id="tab-web-url"
          onClick={() => { setActiveTab('url'); setErrMessage(null); }}
          className={`flex items-center space-x-2 pb-2.5 px-4 text-xs font-semibold transition-colors relative cursor-pointer ${
            activeTab === 'url' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>WebサイトのURL</span>
          {activeTab === 'url' && (
            <motion.div layoutId="activeWebTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900" />
          )}
        </button>

        <button
          id="tab-web-paste"
          onClick={() => { setActiveTab('paste'); setErrMessage(null); }}
          className={`flex items-center space-x-2 pb-2.5 px-4 text-xs font-semibold transition-colors relative cursor-pointer ${
            activeTab === 'paste' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <Copy className="h-4 w-4" />
          <span>テキスト直接コピペ</span>
          {activeTab === 'paste' && (
            <motion.div layoutId="activeWebTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900" />
          )}
        </button>
      </div>

      {activeTab === 'url' ? (
        <form onSubmit={handleFetchUrl} className="space-y-4">
          <div>
            <label htmlFor="url-scraper-input" className="block text-xs font-medium text-stone-600 mb-2">読み上げたいウェブページのURL</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-grow">
                <input
                  id="url-scraper-input"
                  type="text"
                  placeholder="https://example.com/article..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full text-sm px-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-500 shadow-sm transition-all"
                  disabled={isLoading}
                />
              </div>
              <button
                id="btn-fetch-url"
                type="submit"
                disabled={isLoading || !url}
                className="flex items-center justify-center space-x-1 px-5 py-3 bg-stone-900 text-stone-100 text-sm font-semibold rounded-xl hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 transition-all cursor-pointer shadow-sm shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>読み込み中...</span>
                  </>
                ) : (
                  <>
                    <span>記事を取得</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-stone-400 bg-stone-50 p-3.5 rounded-xl border border-stone-100 leading-relaxed font-normal">
            💡 <strong>CORS制限について:</strong> 本アプリはブラウザだけで完結する構成のため、CORSポリシーで暗号化された外部サイトのデータ取得には無料の公開CORSプロキシを経由しています。万が一取得できない場合は「テキスト直接コピペ」タブをご利用ください。
          </div>
        </form>
      ) : (
        <form onSubmit={handleImportPastedText} className="space-y-4">
          <div>
            <label htmlFor="paste-title-input" className="block text-xs font-medium text-stone-600 mb-2">タイトル（任意）</label>
            <input
              id="paste-title-input"
              type="text"
              placeholder="例: 会議の文字起こし、ニュース記事など"
              value={pastedTitle}
              onChange={(e) => setPastedTitle(e.target.value)}
              className="w-full text-sm px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-500 shadow-sm transition-all mb-3.5"
            />

            <label htmlFor="paste-textarea" className="block text-xs font-medium text-stone-600 mb-2">本文テキスト</label>
            <textarea
              id="paste-textarea"
              placeholder="ここに読み上げたい日本語や英語の文章を貼り付け、または入力してください..."
              rows={6}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full text-sm p-4 bg-white border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-500 shadow-sm transition-all resize-y min-h-[140px]"
            />
          </div>

          <div className="flex justify-end">
            <button
              id="btn-import-paste-text"
              type="submit"
              disabled={!pastedText.trim()}
              className="flex items-center space-x-1.5 px-5 py-3 bg-stone-900 text-stone-100 text-sm font-semibold rounded-xl hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 transition-all cursor-pointer shadow-sm"
            >
              <FileText className="h-4.5 w-4.5" />
              <span>文章をインポートする</span>
            </button>
          </div>
        </form>
      )}

      {/* Error Message Box */}
      {errMessage && (
        <div id="web-error-alert" className="mt-4 flex items-start space-x-3 bg-red-50 border border-red-100 p-4 rounded-xl text-red-800 text-xs shadow-sm">
          <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">取得エラー</span>
            <span>{errMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
