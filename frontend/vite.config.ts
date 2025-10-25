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
  define: {
    // Embed environment variables at build time for Vercel
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || 'https://joqnpibrfzqflyogrkht.supabase.co'
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk'
    ),
    'import.meta.env.VITE_DISABLE_CLIENT_LOGS': JSON.stringify(
      process.env.VITE_DISABLE_CLIENT_LOGS || 'true'
    ),
  },
});
