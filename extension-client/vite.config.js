import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        service_worker: resolve(__dirname, 'src/background/service_worker.js'),
        inject: resolve(__dirname, 'src/content/inject.js'),
        interceptor: resolve(__dirname, 'src/content/interceptor.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service_worker' || chunkInfo.name === 'inject' || chunkInfo.name === 'interceptor') {
            return '[name].js'; // No hashing for Manifest V3 extension scripts
          }
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
});
