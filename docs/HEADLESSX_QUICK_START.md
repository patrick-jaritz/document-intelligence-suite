# HeadlessX Integration Quick Start

This guide will help you quickly set up and start using the HeadlessX web scraping integration in the Document Intelligence Suite.

## Prerequisites

- A running HeadlessX instance (self-hosted or provided)
- Node.js 18+ installed
- Document Intelligence Suite cloned and set up

## Step 1: Deploy HeadlessX Instance (Optional)

If you don't have a HeadlessX instance yet, deploy one:

### Option A: Docker (Recommended)

```bash
# Clone HeadlessX
git clone https://github.com/SaifyXPRO/HeadlessX.git
cd HeadlessX

# Configure environment
cp .env.example .env

# Edit .env file
nano .env

# Add your configuration:
# AUTH_TOKEN=your_secure_token_here
# DOMAIN=yourdomain.com
# SUBDOMAIN=headlessx

# Start with Docker
docker-compose up -d

# Check logs
docker-compose logs -f headlessx
```

### Option B: Node.js + PM2

```bash
# Clone and setup
git clone https://github.com/SaifyXPRO/HeadlessX.git
cd HeadlessX
cp .env.example .env

# Edit configuration
nano .env

# Install and build
npm install
cd website && npm install && npm run build && cd ..

# Start with PM2
npm install -g pm2
pm2 start src/server.js --name headlessx

# Check status
pm2 status
pm2 logs headlessx
```

Your HeadlessX instance will be available at:
- Local: `http://localhost:3000`
- Production: `https://your-subdomain.yourdomain.com`

## Step 2: Configure Document Intelligence Suite

### Update Environment Variables

1. Navigate to your frontend directory:
```bash
cd document-intelligence-suite/frontend
```

2. Create or update `.env` file:
```bash
# Add to your .env file
VITE_HEADLESSX_URL=https://your-headlessx-instance.com
VITE_HEADLESSX_TOKEN=your_auth_token_here
```

3. For the Supabase edge function, add to your Supabase project environment:
```bash
# In Supabase Dashboard > Settings > Edge Functions > Environment Variables
HEADLESSX_URL=https://your-headlessx-instance.com
HEADLESSX_TOKEN=your_auth_token_here
```

Or using Supabase CLI:
```bash
supabase secrets set HEADLESSX_URL=https://your-headlessx-instance.com
supabase secrets set HEADLESSX_TOKEN=your_auth_token_here
```

## Step 3: Deploy Edge Function

Deploy the HeadlessX proxy edge function:

```bash
cd document-intelligence-suite
supabase functions deploy headlessx-proxy
```

Verify deployment:
```bash
supabase functions list
```

## Step 4: Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Step 5: Build and Run

### Development Mode

```bash
npm run dev
```

The application will start at `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## Step 6: Access the Web Scraper

1. Open your browser and navigate to:
   - Development: `http://localhost:5173/scraper`
   - Production: `https://your-app.vercel.app/scraper`

2. You should see the HeadlessX Web Scraper interface

## Usage Examples

### Basic Text Extraction

1. Enter a URL: `https://example.com`
2. Select method: "Text"
3. Click "Scrape Content"

### Stealth Mode Scraping

1. Enter a URL that has bot protection
2. Enable "Stealth Mode" checkbox
3. Click "Scrape Content"

### Screenshot Capture

1. Enter any URL
2. Click "Screenshot" button
3. The screenshot will download automatically

### PDF Generation

1. Enter a URL
2. Click "PDF" button
3. The PDF will download automatically

## Troubleshooting

### "HeadlessX service not configured"

**Problem**: Environment variables not set

**Solution**:
1. Check your `.env` file has `VITE_HEADLESSX_URL`
2. Restart your dev server after adding environment variables
3. Make sure the URL is accessible

### "Authentication Failed"

**Problem**: Invalid or missing auth token

**Solution**:
1. Verify `VITE_HEADLESSX_TOKEN` matches your HeadlessX `AUTH_TOKEN`
2. Check HeadlessX instance is running
3. Test HeadlessX directly: `curl https://your-instance.com/api/health`

### "Connection Timeout"

**Problem**: Network or performance issues

**Solution**:
1. Check HeadlessX instance is running: `docker ps` or `pm2 status`
2. Check logs: `docker-compose logs headlessx` or `pm2 logs headlessx`
3. Verify network connectivity
4. Try increasing timeout in options

### "CORS Error"

**Problem**: Cross-origin request blocked

**Solution**:
1. Use the edge function proxy instead of direct calls
2. Ensure CORS is properly configured in HeadlessX
3. Check browser console for specific CORS error

### Rate Limit Errors

**Problem**: Too many requests

**Solution**:
1. Wait a minute and try again
2. Reduce request frequency
3. Check rate limit configuration in edge function

## Verification

Test your setup with these commands:

### Test HeadlessX Health

```bash
curl https://your-headlessx-instance.com/api/health
```

Expected output:
```json
{
  "status": "ok",
  "version": "1.3.0"
}
```

### Test Edge Function

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/headlessx-proxy' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "method": "health"
  }'
```

### Test Frontend Integration

1. Navigate to `/scraper` in your browser
2. Enter `https://example.com`
3. Click "Scrape Content"
4. Verify content is displayed

## Next Steps

Now that you have HeadlessX integrated, you can:

1. **Integrate with Document Processing**: Use scraped content in your RAG pipeline
2. **Automate Scraping**: Build scheduled scraping workflows
3. **Custom Profiles**: Configure device profiles for specific use cases
4. **Batch Processing**: Scrape multiple URLs in parallel
5. **Content Monitoring**: Track changes to websites over time

## Additional Resources

- HeadlessX Documentation: https://github.com/SaifyXPRO/HeadlessX
- Integration Guide: `docs/HEADLESSX_INTEGRATION.md`
- API Client Code: `frontend/src/services/headlessx/`
- UI Component: `frontend/src/components/headlessx/`

## Support

If you encounter issues:

1. Check HeadlessX logs
2. Check browser console for errors
3. Review Supabase edge function logs
4. Consult the troubleshooting section
5. Open an issue in the repository

## Security Notes

- **Never commit tokens**: Keep tokens in `.env` files (gitignored)
- **Use HTTPS**: Always use HTTPS in production
- **Rate Limiting**: Configure appropriate rate limits
- **URL Validation**: The integration validates URLs to prevent SSRF
- **Token Rotation**: Regularly rotate authentication tokens

Happy scraping! 🚀
