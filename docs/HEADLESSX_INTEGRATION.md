# HeadlessX Integration

## Overview

This document describes the integration of HeadlessX (https://github.com/SaifyXPRO/HeadlessX) into the Document Intelligence Suite. HeadlessX is an advanced anti-detection web scraping API with comprehensive fingerprinting control, providing capabilities for:

- Advanced web scraping with stealth mode
- Canvas/WebGL/Audio fingerprinting control
- Human-like behavior simulation
- WAF bypass capabilities (Cloudflare, DataDome)
- Screenshot and PDF generation
- 50+ browser profiles (desktop/mobile/tablet)

## Architecture

### Components

1. **Frontend Service** (`frontend/src/services/headlessx/`)
   - `types.ts`: TypeScript type definitions
   - `client.ts`: HeadlessX API client implementation
   - `index.ts`: Main export

2. **UI Component** (`frontend/src/components/headlessx/`)
   - `HeadlessXScraper.tsx`: React component for web scraping interface
   - `index.ts`: Component export

3. **Backend Proxy** (`supabase/functions/headlessx-proxy/`)
   - Edge function to proxy requests to HeadlessX instance
   - Rate limiting and security controls
   - CORS handling

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# HeadlessX Configuration
VITE_HEADLESSX_URL=https://your-headlessx-instance.com
VITE_HEADLESSX_TOKEN=your_auth_token_here

# For Supabase Edge Function
HEADLESSX_URL=https://your-headlessx-instance.com
HEADLESSX_TOKEN=your_auth_token_here
```

### HeadlessX Instance Setup

To use this integration, you need a running HeadlessX instance. You can:

1. **Self-host HeadlessX**:
   ```bash
   git clone https://github.com/SaifyXPRO/HeadlessX.git
   cd HeadlessX
   cp .env.example .env
   # Edit .env with your configuration
   docker-compose up -d
   ```

2. **Use a deployed instance**: If you have an existing HeadlessX deployment, use its URL and token.

## Usage

### Using the UI Component

Import and use the HeadlessXScraper component in your application:

```typescript
import { HeadlessXScraper } from './components/headlessx';

function App() {
  return <HeadlessXScraper />;
}
```

### Using the API Client Directly

```typescript
import { createHeadlessXClient } from './services/headlessx';

const client = createHeadlessXClient(
  'https://your-headlessx-instance.com',
  'your_auth_token'
);

// Extract text from a webpage
const result = await client.getText('https://example.com');

// Extract HTML
const htmlResult = await client.getHtml('https://example.com');

// Render with stealth mode
const stealthResult = await client.renderStealth('https://example.com');

// Take a screenshot
const screenshot = await client.screenshot({
  url: 'https://example.com',
  fullPage: true
});

// Generate PDF
const pdf = await client.generatePdf({
  url: 'https://example.com',
  format: 'A4'
});
```

### Using the Proxy Edge Function

The edge function provides a secure proxy to your HeadlessX instance:

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/headlessx-proxy`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      method: 'text',
      url: 'https://example.com',
      options: {
        stealthMode: 'maximum',
        behaviorSimulation: true
      }
    })
  }
);
```

## Features

### 1. Content Extraction

- **Text Extraction**: Clean text content from web pages
- **HTML Extraction**: Full HTML with structure preserved
- **Markdown Conversion**: Structured markdown output
- **Full Rendering**: Complete page rendering with JavaScript execution

### 2. Stealth Mode

When enabled, HeadlessX uses:
- Canvas fingerprint spoofing
- WebGL vendor/renderer masking
- Audio context manipulation
- WebRTC leak prevention
- Human-like mouse movements (Bezier curves)
- Natural keyboard dynamics
- Realistic scroll patterns

### 3. WAF Bypass

Automatically handles:
- Cloudflare challenge solving
- DataDome evasion
- Incapsula/Akamai bypass
- HTTP/2 fingerprinting

### 4. Device Profiles

Support for 50+ pre-configured browser profiles:
- Desktop browsers (Chrome, Firefox, Safari)
- Mobile devices (iPhone, Android)
- Tablets (iPad, Android tablets)

### 5. Media Generation

- Full-page screenshots
- PDF generation with custom formats
- High-quality image capture

## Security Considerations

1. **Rate Limiting**: The proxy function includes rate limiting to prevent abuse
2. **URL Validation**: All URLs are validated to prevent SSRF attacks
3. **Token Authentication**: Secure token-based authentication with HeadlessX
4. **CORS Protection**: Proper CORS headers with origin validation
5. **Environment Isolation**: Credentials stored in environment variables

## Integration with Document Intelligence Suite

The HeadlessX integration enhances the Document Intelligence Suite by:

1. **Enhanced URL Processing**: Replace or supplement existing URL crawling with advanced scraping
2. **Document Generation**: Scrape web content and convert to documents for RAG processing
3. **Research Capabilities**: Gather information from protected or dynamic websites
4. **Archive Creation**: Generate PDF/screenshot archives of web content

## API Reference

### HeadlessXClient Methods

#### `checkHealth()`
Check if the HeadlessX service is available.

#### `getProfiles()`
Get list of available device profiles.

#### `render(options)`
Full page rendering with anti-detection.

#### `getHtml(url, options?)`
Extract HTML from a URL.

#### `getText(url, options?)`
Extract clean text from a URL.

#### `screenshot(options)`
Capture a screenshot.

#### `generatePdf(options)`
Generate a PDF from a URL.

#### `renderStealth(url, options?)`
Render with maximum stealth settings.

## Troubleshooting

### Common Issues

1. **"HeadlessX service not configured"**
   - Ensure `VITE_HEADLESSX_URL` is set in your environment
   - Check that the URL is accessible

2. **Authentication errors**
   - Verify `VITE_HEADLESSX_TOKEN` is correct
   - Check HeadlessX instance is configured with the same token

3. **Timeout errors**
   - Increase timeout in options
   - Check HeadlessX instance performance
   - Verify network connectivity

4. **Rate limit errors**
   - Reduce request frequency
   - Configure rate limits in edge function

## Future Enhancements

Potential improvements for this integration:

1. **Batch Processing**: Support for multiple URLs in parallel
2. **Scheduled Scraping**: Automated periodic scraping
3. **Content Comparison**: Track changes over time
4. **Advanced Filtering**: Custom content extraction rules
5. **Profile Management**: UI for selecting and managing device profiles
6. **Result Storage**: Automatic storage in Supabase
7. **RAG Integration**: Direct pipeline to document processing

## Resources

- **HeadlessX Repository**: https://github.com/SaifyXPRO/HeadlessX
- **HeadlessX Documentation**: See repository docs folder
- **API Reference**: Available in HeadlessX README

## License

This integration follows the MIT license of both the Document Intelligence Suite and HeadlessX.
