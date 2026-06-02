export interface VoiceConfig {
  voiceName: string;
  lang: string;
  rate: number;
  pitch: number;
  gender: 'all' | 'male' | 'female';
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentIndex: number;
}

export interface TextSentence {
  id: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface ParsedDocument {
  title: string;
  sentences: TextSentence[];
  rawText: string;
  sourceType: 'file' | 'web' | 'text';
  sourceName: string;
}
