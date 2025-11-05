import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'tesseract.js': path.resolve(__dirname, 'node_modules/tesseract.js/dist/tesseract.esm.min.js'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'pdf-vendor': ['pdfjs-dist', 'pdf-lib'],
          'tesseract-vendor': ['tesseract.js'],
          // Feature chunks
          'rag-components': [
            './src/components/RAGView.tsx',
            './src/components/RAGViewEnhanced.tsx',
          ],
          'github-components': [
            './src/components/GitHubAnalyzer.tsx',
          ],
        },
      },
    },
    // Increase chunk size warning limit since we're using manual chunks
    chunkSizeWarningLimit: 600,
  },
  define: {
    // Embed environment variables at build time for Vercel
    // SECURITY: Do not hardcode API keys - use environment variables only
    // Support both VITE_ (preferred) and NEXT_PUBLIC_ (Supabase integration) prefixes
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    ),
    // Also expose as NEXT_PUBLIC_ for compatibility
    'import.meta.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
    ),
    'import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    ),
    'import.meta.env.VITE_DISABLE_CLIENT_LOGS': JSON.stringify(
      process.env.VITE_DISABLE_CLIENT_LOGS || 'true'
    ),
  },
});
