import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    
    // Gzip compression for production
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // Only compress files > 10KB
      algorithm: 'gzip',
      ext: '.gz',
    }),
    
    // Brotli compression for production (better compression than gzip)
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    
    // Bundle analyzer (run with npm run build to see stats.html)
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }) as any,
  ],
  resolve: {
    alias: {
      'tesseract.js': path.resolve(__dirname, 'node_modules/tesseract.js/dist/tesseract.esm.min.js'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Target modern browsers for smaller bundle
    target: 'es2020',
    
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
      },
      format: {
        comments: false, // Remove comments
      },
    },
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Sourcemap configuration (disable in production for smaller files)
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // Chunk size settings
    chunkSizeWarningLimit: 500, // Warn if chunks > 500KB
    
    rollupOptions: {
      output: {
        // Optimize chunk names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        
        // Manual chunks for better caching
        manualChunks: (id) => {
          // React core and router
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-router')) {
            return 'react-router';
          }
          
          // PDF libraries (large)
          if (id.includes('pdfjs-dist') || id.includes('pdf-lib')) {
            return 'pdf-vendor';
          }
          
          // Tesseract (very large)
          if (id.includes('tesseract.js')) {
            return 'tesseract-vendor';
          }
          
          // Supabase
          if (id.includes('@supabase')) {
            return 'supabase-vendor';
          }
          
          // UI libraries
          if (id.includes('lucide-react')) {
            return 'ui-vendor';
          }
          
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
      
      // Tree shaking configuration
      treeshake: {
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
    },
  },
  define: (() => {
    // Read environment variables at build time
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    // Log build-time variable detection (only in CI/build, not in production bundle)
    if (process.env.CI || process.env.VERCEL) {
      console.log('🔍 Build-time environment variable detection:');
      console.log('  VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✓ Found' : '✗ Missing');
      console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Found' : '✗ Missing');
      console.log('  VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✓ Found' : '✗ Missing');
      console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Found' : '✗ Missing');
      console.log('  Final URL:', supabaseUrl ? `✓ Set (${supabaseUrl.substring(0, 30)}...)` : '✗ Empty');
      console.log('  Final Key:', supabaseKey ? `✓ Set (${supabaseKey.substring(0, 20)}...)` : '✗ Empty');
    }
    
    return {
      // Embed environment variables at build time for Vercel
      // SECURITY: Do not hardcode API keys - use environment variables only
      // Support both VITE_ (preferred) and NEXT_PUBLIC_ (Supabase integration) prefixes
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      // Also expose as NEXT_PUBLIC_ for compatibility
      'import.meta.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      'import.meta.env.VITE_DISABLE_CLIENT_LOGS': JSON.stringify(
        process.env.VITE_DISABLE_CLIENT_LOGS || 'true'
      ),
    };
  })(),
});
