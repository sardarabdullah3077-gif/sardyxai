import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Raise warning limit slightly; we've split properly below
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Core React runtime — tiny, cached aggressively
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            // Animation library
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
            // Icon library (large)
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-lucide';
            }
            // Markdown rendering pipeline
            if (
              id.includes('node_modules/react-markdown') ||
              id.includes('node_modules/remark') ||
              id.includes('node_modules/rehype') ||
              id.includes('node_modules/unified') ||
              id.includes('node_modules/mdast') ||
              id.includes('node_modules/hast') ||
              id.includes('node_modules/micromark') ||
              id.includes('node_modules/vfile') ||
              id.includes('node_modules/unist')
            ) {
              return 'vendor-markdown';
            }
            // Syntax highlighting (react-syntax-highlighter bundles Prism internally)
            if (
              id.includes('node_modules/highlight.js') ||
              id.includes('node_modules/prism') ||
              id.includes('node_modules/react-syntax-highlighter') ||
              id.includes('node_modules/refractor') ||
              id.includes('node_modules/@nicolo-ribaudo')
            ) {
              return 'vendor-highlight';
            }
            // Supabase client
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
