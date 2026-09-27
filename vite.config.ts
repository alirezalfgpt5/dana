import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio to prevent WebSocket closed errors
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router-dom') || id.includes('zustand')) {
                return 'vendor-react';
              }
              if (id.includes('exceljs') || id.includes('docx') || id.includes('file-saver') || id.includes('papaparse')) {
                return 'vendor-office';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('date-fns') || id.includes('react-multi-date-picker') || id.includes('react-date-object')) {
                return 'vendor-date';
              }
              if (id.includes('fuse.js') || id.includes('axios') || id.includes('zod') || id.includes('react-hot-toast')) {
                return 'vendor-utils';
              }
              return 'vendor-libs';
            }
          },
        },
      },
    },
  };
});
