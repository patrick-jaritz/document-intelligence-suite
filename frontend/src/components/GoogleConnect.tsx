import React from 'react';

export function GoogleConnect({ userId }: { userId: string }) {
  const startUrl = import.meta.env.VITE_GOOGLE_OAUTH_START_URL || '/.netlify/functions/google-oauth-start';

  const handleConnect = () => {
    const url = `${startUrl}?user_id=${encodeURIComponent(userId)}`;
    // Open in a new tab so callback can close it after success
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleConnect}
        className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
      >
        Connect Google Drive
      </button>
      <span className="text-sm text-gray-600">Connect to search files from Google Drive</span>
    </div>
  );
}
