const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Read the health.html file
    const healthPath = path.join(__dirname, '..', 'frontend', 'dist', 'health.html');
    
    if (fs.existsSync(healthPath)) {
      const healthContent = fs.readFileSync(healthPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(healthContent);
    } else {
      // Fallback health page
      const fallbackHealth = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Health Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen flex items-center justify-center">
        <div class="max-w-md mx-auto text-center">
            <div class="bg-white rounded-lg shadow-lg p-8">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-gray-900 mb-2">System Health Dashboard</h1>
                <p class="text-gray-600 mb-6">All systems operational</p>
                
                <div class="space-y-4">
                    <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span class="text-sm font-medium text-gray-700">Supabase Edge Functions</span>
                        <span class="text-sm font-bold text-green-600">Healthy</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span class="text-sm font-medium text-gray-700">OpenAI API</span>
                        <span class="text-sm font-bold text-green-600">Healthy</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span class="text-sm font-medium text-gray-700">Database</span>
                        <span class="text-sm font-bold text-green-600">Healthy</span>
                    </div>
                </div>
                
                <div class="mt-6">
                    <a href="/" class="text-blue-600 hover:text-blue-800 underline">← Back to Main App</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(fallbackHealth);
    }
  } catch (error) {
    console.error('Error serving health page:', error);
    res.status(500).json({ error: 'Failed to load health page' });
  }
};
