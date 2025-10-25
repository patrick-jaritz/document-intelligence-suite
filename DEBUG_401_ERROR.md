# Debugging 401 Unauthorized Error - Guide

**Deployment URL**: https://frontend-j610u9ubw-patricks-projects-1d377b2c.vercel.app  
**Issue**: 401 Unauthorized on `generate-structured-output` Edge Function

---

## Changes Applied

### Frontend Logging (Client-Side)
Added comprehensive console logging in `frontend/src/lib/supabase.ts`:

```typescript
console.group(`🔵 [${requestId}] Calling ${functionName}`);
console.log('📍 URL:', functionUrl);
console.log('📋 Method:', method);
console.log('🔑 Headers:', { ... });
console.log('📦 Payload:', ...);
console.log('⏱️  Response in ${durationMs}ms');
console.log('📊 Status:', response.status, response.statusText);
console.log('📄 Response Headers:', ...);
console.log('❌ Error Response Body:', errorText);
console.groupEnd();
```

### Backend Logging (Edge Function)
Added logging in `supabase/functions/generate-structured-output/index.ts`:

```typescript
console.log(`🔵 [${requestId}] Incoming ${req.method} request`);
console.log(`📋 Headers:`, { ... });
console.log(`🔐 [${requestId}] Supabase config:`, { ... });
```

---

## How to Debug

### Step 1: Open Browser DevTools
1. Navigate to: https://frontend-j610u9ubw-patricks-projects-1d377b2c.vercel.app
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to **Console** tab
4. Clear console

### Step 2: Trigger the Error
1. Upload a PDF file
2. Select **OpenAI Vision** as OCR provider
3. Select a template (or use default)
4. Click **Process Document**
5. Wait for the error to occur

### Step 3: Examine Client-Side Logs
Look for the **blue circle emoji** 🔵 in console output. You should see:

```
🔵 [generate-structured-output_<timestamp>_<random>] Calling generate-structured-output
📍 URL: https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/generate-structured-output
📋 Method: POST
🔑 Headers: {
  Content-Type: "application/json",
  Authorization: "Bearer eyJhbGciOiJIUzI1NiIs...",
  apikey: "eyJhbGciOiJIUzI1NiIs...",
  X-Request-Id: "generate-structured-output_..."
}
📦 Payload: {"jobId":"...","extractedText":"...","structureTemplate":{...},"llmProvider":"openai"}
⏱️  Response in XXXms
📊 Status: 401 Unauthorized
📄 Response Headers: { ... }
❌ Error Response Body: <actual error message>
```

**Key Things to Check:**
- ✅ Is the Authorization header present?
- ✅ Is the apikey header present?
- ✅ What is the **Error Response Body**? (This is critical!)

### Step 4: Examine Server-Side Logs
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/functions
2. Click on **generate-structured-output** function
3. Click **Logs** tab
4. Look for logs with the same `requestId` from step 3

**Expected logs:**
```
🔵 [<requestId>] Incoming POST request to generate-structured-output
📋 Headers: {
  authorization: "Bearer eyJhbGciOiJIUzI1NiIs...",
  apikey: "eyJhbGciOiJIUzI1NiIs...",
  x-request-id: "<requestId>",
  content-type: "application/json"
}
🔐 [<requestId>] Supabase config: {
  url: "https://joqnpibrfzqflyogrkht.supabase.co",
  hasKey: true,
  keyPrefix: "eyJhbGciOiJIUzI1NiIs..."
}
```

**If you DON'T see these logs**, it means:
- The request is being rejected **before** it reaches the Edge Function
- This indicates a **Supabase Gateway/Kong** level rejection

### Step 5: Check for Common Issues

#### Issue 1: JWT Verification Still Enabled
**Symptom**: Function logs don't appear at all  
**Check**: Verify `config.toml` has:
```toml
[function.generate-structured-output]
verify_jwt = false
```

**Verify deployment**:
```bash
cd /Users/patrickjaritz/CODE/document-intelligence-suite
supabase functions deploy generate-structured-output --project-ref joqnpibrfzqflyogrkht
```

#### Issue 2: CORS Preflight Failing
**Symptom**: Error on OPTIONS request before POST  
**Check**: Browser Network tab → Look for OPTIONS request with 401

#### Issue 3: API Key Mismatch
**Symptom**: "Invalid API key" in error response body  
**Check**: Verify anon key in frontend matches Supabase project settings:
1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/settings/api
2. Compare **anon public** key with `frontend/src/lib/supabase.ts` line 7

#### Issue 4: Function Not Deployed
**Symptom**: 404 error instead of 401  
**Verify**: Function exists in Supabase dashboard

#### Issue 5: RLS Policies Blocking Request
**Symptom**: 401 with "permission denied" message  
**Check**: Since we disabled JWT, RLS should not apply to Edge Functions

---

## Expected Error Messages

### If JWT Verification is Still On:
```
JWT verification failed
```

### If API Key is Wrong:
```
Invalid API key
```

### If Function Returns 401 (our code):
```json
{
  "success": false,
  "error": "<actual error message>",
  "requestId": "<requestId>"
}
```

---

## Copy This Information

When reporting the issue, please provide:

1. **Client-side error log** (from browser console, the entire 🔵 group)
2. **Error Response Body** (the actual text returned by the server)
3. **Server-side logs** (from Supabase dashboard, if any)
4. **Request ID** (for correlation)
5. **Screenshot** of the Network tab showing:
   - Request headers
   - Response headers
   - Response body

---

## Quick Test: Manual cURL

Test the function directly to isolate frontend issues:

```bash
curl -X POST https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/generate-structured-output \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk" \
  -d '{"jobId":"test-job-id","extractedText":"This is a test.","structureTemplate":{"type":"object"},"llmProvider":"openai"}'
```

**If this works** → Frontend issue  
**If this fails with 401** → Backend/configuration issue

---

## Next Steps Based on Findings

### If you see server logs (🔵 appears in Supabase):
→ The request is reaching the function  
→ Check for errors in the function code or API key configuration

### If you DON'T see server logs:
→ Request blocked at gateway level  
→ Check JWT verification, CORS, or API key validity

### If cURL works but frontend doesn't:
→ Issue with frontend request headers or CORS  
→ Check browser console for additional errors

---

**Last Updated**: October 15, 2025, 22:30 UTC  
**Deployment**: https://frontend-j610u9ubw-patricks-projects-1d377b2c.vercel.app  
**Supabase Project**: joqnpibrfzqflyogrkht

