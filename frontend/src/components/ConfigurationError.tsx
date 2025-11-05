import { AlertCircle } from 'lucide-react';

export function ConfigurationError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Configuration Required</h1>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            The application is missing required environment variables. Please configure the following in your Vercel deployment settings:
          </p>
          
          <div className="bg-gray-50 rounded-md p-4 space-y-2">
            <div>
              <code className="text-sm font-mono text-gray-800">VITE_SUPABASE_URL</code>
              <p className="text-sm text-gray-600 mt-1">Your Supabase project URL</p>
            </div>
            <div>
              <code className="text-sm font-mono text-gray-800">VITE_SUPABASE_ANON_KEY</code>
              <p className="text-sm text-gray-600 mt-1">Your Supabase anonymous key</p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-900">
              <strong>How to fix:</strong>
            </p>
            <ol className="list-decimal list-inside text-sm text-blue-800 mt-2 space-y-1">
              <li>Go to your Vercel project settings</li>
              <li>Navigate to Environment Variables</li>
              <li>Add the two variables above</li>
              <li>Redeploy the application</li>
            </ol>
          </div>
          
          <div className="text-xs text-gray-500 mt-4">
            <p>If you need help, check the deployment documentation or contact support.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

