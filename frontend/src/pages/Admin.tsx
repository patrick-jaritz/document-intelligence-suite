import { useEffect, useState } from 'react';

interface HealthResponse {
  ok: boolean;
  dbOk: boolean;
  counts: Record<string, number>;
  providers: Record<string, boolean>;
  costs: Record<string, number>;
  recentErrors: Array<{ id: string; error_message?: string; updated_at?: string }>;
  timestamp: string;
}

export function Admin() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to fetch');
        setData(json);
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {loading && <div className="p-4 bg-white rounded-lg border">Loading...</div>}
        {error && <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">{error}</div>}

        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Database</p>
                <p className={`text-xl font-semibold ${data.dbOk ? 'text-green-600' : 'text-red-600'}`}>{data.dbOk ? 'OK' : 'DOWN'}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(data.timestamp).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Documents</p>
                <p className="text-xl font-semibold">{data.counts?.documents ?? 0}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Embeddings</p>
                <p className="text-xl font-semibold">{data.counts?.document_embeddings ?? 0}</p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <h2 className="text-lg font-semibold mb-3">External Providers</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(data.providers || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm text-gray-700">{k}</span>
                    <span className={`text-xs font-medium ${v ? 'text-green-600' : 'text-gray-400'}`}>{v ? 'configured' : 'missing'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <h2 className="text-lg font-semibold mb-3">Cost Calculator & API Usage</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(data.costs || {}).map(([k, v]) => (
                  <div key={k} className="p-3 rounded border bg-gradient-to-br from-blue-50 to-blue-100">
                    <p className="text-xs text-gray-700 font-medium">{k}</p>
                    <p className="text-lg font-bold text-blue-700">${v.toFixed(4)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded border">
                <p className="text-sm text-gray-600 mb-2">💡 Cost Calculation Includes:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• OCR API calls (Google Vision, OpenAI Vision, Mistral, etc.)</li>
                  <li>• Embedding generation (OpenAI, Mistral, Local)</li>
                  <li>• LLM processing (Markdown conversion, extraction)</li>
                  <li>• Web crawling & scraping operations</li>
                  <li>• Database operations & vector search</li>
                </ul>
              </div>
            </div>

            {data.recentErrors?.length > 0 && (
              <div className="p-4 bg-white rounded-lg border">
                <h2 className="text-lg font-semibold mb-3">Recent Errors</h2>
                <div className="space-y-2">
                  {data.recentErrors.map((e, i) => (
                    <div key={i} className="p-2 rounded border text-sm">
                      <p className="text-gray-800">{e.error_message || 'No message'}</p>
                      <p className="text-xs text-gray-500">{e.updated_at ? new Date(e.updated_at).toLocaleString() : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

