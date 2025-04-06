import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: true,
    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  // Bypass TypeScript checking for production builds - useful for Vercel deployment
  // when there are non-critical TypeScript errors
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
  // Prevent full reload on component changes
  server: {
    hmr: {
      overlay: true,
    },
  },
}); 