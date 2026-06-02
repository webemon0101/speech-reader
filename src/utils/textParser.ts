import { TextSentence } from '../types';

/**
 * Splits text into logical sentences based on Japanese and English/Western punctuation.
 * This ensures granular playback, easy skipping, and robust state on mobile browsers.
 */
export function splitIntoSentences(text: string): TextSentence[] {
  if (!text) return [];

  // Match: 。、！、？、\n、. , ! , ? followed by optional whitespace or brackets
  // We want to keep the punctuation attached to the sentence.
  // Using a regex with lookbehind or capturing groups:
  // We can match patterns and split while keeping matches, or use structured looping.
  const regex = /([^。！？.!?\n]+(?:[。！？.!?\n]+|$))/g;
  const matches = text.match(regex) || [text];

  const sentences: TextSentence[] = [];
  let currentId = 0;
  let charIndex = 0;

  for (const rawMatch of matches) {
    const trimmed = rawMatch.trim();
    if (trimmed.length > 0) {
      sentences.push({
        id: currentId++,
        text: trimmed,
        startIndex: charIndex,
        endIndex: charIndex + rawMatch.length,
      });
    }
    charIndex += rawMatch.length;
  }

  // Fallback if no sentences parsed
  if (sentences.length === 0 && text.trim().length > 0) {
    sentences.push({
      id: 0,
      text: text.trim(),
      startIndex: 0,
      endIndex: text.length,
    });
  }

  return sentences;
}

/**
 * Cleans extracted HTML to get only readable main content
 */
export function extractReadableContent(htmlString: string, url: string): { title: string; content: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Strip scripts, styles, forms, iframes, footers, headers, nav elements
  const selectorsToRemove = [
    'script', 'style', 'noscript', 'iframe', 'header', 'footer', 'nav', 
    'aside', 'form', '.footer', '.header', '.nav', '.sidebar', '#sidebar', 
    '#footer', '#header', '#nav', '.comments', '#comments', '.ad', '.ads', 
    'meta', 'link'
  ];
  selectorsToRemove.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  });

  // Get Title
  let title = '';
  const titleEl = doc.querySelector('title') || doc.querySelector('h1');
  if (titleEl) {
    title = titleEl.textContent?.trim() || '';
  }
  if (!title) {
    try {
      title = new URL(url).hostname;
    } catch {
      title = 'ウェブページ';
    }
  }

  // Extract text from main content candidates, or fall back to body paragraphs
  const mainCandidates = [doc.querySelector('article'), doc.querySelector('main'), doc.querySelector('#content'), doc.querySelector('.content')];
  const container = mainCandidates.find(c => c && c.textContent && c.textContent.trim().length > 200) || doc.body;

  // Compile headings and paragraphs in order
  const elements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre');
  const textBlocks: string[] = [];

  elements.forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length > 0) {
      const tagName = el.tagName.toLowerCase();
      if (tagName.startsWith('h')) {
        // Add divider formatting or spacing for headings
        textBlocks.push(`\n${text}\n`);
      } else {
        textBlocks.push(text);
      }
    }
  });

  let content = textBlocks.join('\n');
  if (!content.trim()) {
    // Ultimate fallback: raw textContent of stripped document
    content = container.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  // Clean successive empty lines or duplicates
  content = content.replace(/\n\s*\n\s*\n+/g, '\n\n').trim();

  return { title, content };
}

/**
 * Dynamically loads the official pre-compiled PDF.js script and extracts text.
 * We load it via CDN to avoid bundler conflicts and workers overhead in Vite.
 */
export async function extractTextFromPDF(file: File, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const typedArray = new Uint8Array(reader.result as ArrayBuffer);

        // Ensure PDF.js is loaded
        if (!(window as any).pdfjsLib) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const pdfjsLib = (window as any).pdfjsLib;
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        const numPages = pdf.numPages;
        let fullText = '';

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n\n';

          if (onProgress) {
            onProgress(Math.round((i / numPages) * 100));
          }
        }

        resolve(fullText.trim());
      } catch (err) {
        reject(new Error('PDFの解析に失敗しました。ファイルが破損しているか、非対応の形式です。'));
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました。'));
    reader.readAsArrayBuffer(file);
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}
