import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; // 👈 プラグインをそのまま使用します
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/speech-reader/',
    plugins: [
      react(), 
      tailwindcss(), 
      VitePWA({ 
        registerType: 'autoUpdate',
        // 👇 ここからアプリ化（PWA）をブラウザに認識させるための必須設定を追加しました
        manifest: {
          name: 'Speech Reader',            // アプリの正式名称
          short_name: 'SpeechReader',      // ホーム画面などに表示される短い名前
          description: 'テキスト音声読み上げアプリ',
          theme_color: '#ffffff',          // アプリの上部バーなどの色
          background_color: '#ffffff',     // アプリ起動時の背景色
          display: 'standalone',           // ✨最重要：ブラウザのURLバーを隠して「アプリ」として起動させる設定
          start_url: '/speech-reader/',    // アプリが起動したときの最初の画面
          icons: [
            {
              src: 'icon-192x192.png',      // 📱 スマホ用アイコン（※後述）
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512x512.png',      // 💻 PC用アイコン（※後述）
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});