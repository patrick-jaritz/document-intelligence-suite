import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfigurationError } from './components/ConfigurationError';
import { Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';

// Lazy load routes for code splitting
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Admin = lazy(() => import('./pages/Admin').then(module => ({ default: module.Admin })));
const Health = lazy(() => import('./pages/Health'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return <ConfigurationError />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/health" element={<Health />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;