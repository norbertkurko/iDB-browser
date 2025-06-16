import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'src/popup/popup.tsx',
        panel: 'src/panel/panel.tsx',
        background: 'src/background/background.ts',
        'content-script': 'src/content/content-script.ts'
      },
      output: {
        entryFileNames: '[name].js'
      }
    }
  }
});