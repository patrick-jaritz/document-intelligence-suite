# 🐛 Debug Mode

## Overview

The BRAITER Document Intelligence Suite includes a conditional debug logging system that can be enabled when troubleshooting issues.

## Enabling Debug Mode

To enable detailed console logging for all Edge Function calls:

1. Open your browser's Developer Console (F12 or Cmd+Option+I)
2. Go to the Console tab
3. Run the following command:

```javascript
localStorage.setItem('debug', 'true');
```

4. Refresh the page

## Disabling Debug Mode

To disable debug logging and return to production mode:

```javascript
localStorage.removeItem('debug');
```

Or:

```javascript
localStorage.setItem('debug', 'false');
```

Then refresh the page.

## What Debug Mode Shows

When enabled, debug mode logs:

### 🔵 Function Call Information
- Request ID (unique identifier for each request)
- Function name being called
- Full URL
- HTTP method (POST, GET, etc.)
- Request headers (Authorization, apikey, X-Request-Id)
- Payload preview (first 200 characters)

### ⏱️ Response Information
- Response time in milliseconds
- HTTP status code and text
- Response headers

### ✅ Success Information
- Success status (true/false)
- Response data summary

### ❌ Error Information
- Error messages
- Error response bodies
- Status codes

## Example Debug Output

```
🔵 [process-pdf-ocr_1760518364789_274fqm4lxui] Calling process-pdf-ocr
📍 URL: https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/process-pdf-ocr
📋 Method: POST
🔑 Headers: {Content-Type: 'application/json', Authorization: 'Bearer eyJhbGciOiJIUzI1...', ...}
📦 Payload: {"documentId":"f3256aac-1a45-4c23-9d3e-64480532d5b1","jobId":"0b39b3ea...
⏱️  Response in 13865ms
📊 Status: 200 OK
✅ Success: true
```

## Production Mode (Default)

When debug mode is **disabled** (the default state):
- Only critical errors are logged
- No detailed request/response information is shown
- Console output is minimal for better performance
- User experience is cleaner

## Use Cases

Enable debug mode when:
- 🔍 Investigating API errors
- 🐛 Troubleshooting authentication issues
- ⏱️ Measuring performance bottlenecks
- 🔐 Verifying headers are being sent correctly
- 📊 Analyzing request/response flow

## Privacy Note

Debug mode logs may contain:
- API keys (truncated for security)
- Request IDs
- Document metadata
- Response previews

**Do not share debug logs publicly** without redacting sensitive information.

## Technical Implementation

The debug mode is implemented in:
- **Frontend**: `/frontend/src/lib/supabase.ts`
  - `callEdgeFunction()` checks `localStorage.getItem('debug')`
  - Conditionally wraps logging in `if (debugMode) { ... }`
  
The system is designed to have **zero performance impact** when disabled, as all debug checks are simple boolean guards.

## Troubleshooting

If debug mode doesn't work:

1. **Check localStorage**:
   ```javascript
   console.log(localStorage.getItem('debug'));
   ```
   Should output: `"true"`

2. **Verify browser support**:
   - Debug mode requires localStorage API
   - Works in all modern browsers (Chrome, Firefox, Safari, Edge)

3. **Hard refresh after enabling**:
   - Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
   - This clears the cache and reloads scripts

4. **Check console filters**:
   - Ensure "Verbose" or "All levels" is selected in Console settings
   - Some logs might be hidden by default filters

---

**Last Updated**: 2025-01-15  
**Maintainer**: Patrick Jaritz

