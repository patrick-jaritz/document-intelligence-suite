// Simple test function for Vercel
export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Test function working!',
    method: req.method,
    timestamp: new Date().toISOString()
  });
}
