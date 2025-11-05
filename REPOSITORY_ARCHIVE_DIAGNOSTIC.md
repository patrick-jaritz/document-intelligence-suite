# 🔍 Repository Archive Diagnostic Guide

## Current Issue
Repository Archive shows empty even though data exists in Supabase `github_analyses` table.

---

## 🔍 Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Navigate to the Repository Archive page
4. Look for these log messages:

**Expected logs:**
- `📊 Repository archive response: {...}`
- `✅ Loaded X repository analyses from database`
- OR `⚠️ No repository analyses found in database`

**Error logs to look for:**
- `❌ Failed to fetch analyses:`
- `❌ Error fetching analyses:`
- CORS errors
- Network errors

---

## 🔍 Step 2: Check Network Tab

1. Open Developer Tools → **Network** tab
2. Filter by: `get-repository-archive`
3. Click on the request
4. Check:
   - **Status Code**: Should be `200`
   - **Response**: Should show JSON with `success: true` and `data: [...]`

**If status is not 200:**
- Check the error message in the response
- Look for CORS errors
- Check if the Edge Function is deployed

---

## 🔍 Step 3: Verify Edge Function is Deployed

1. Go to Supabase Dashboard → Edge Functions
2. Check if `get-repository-archive` is listed
3. Check the latest deployment timestamp
4. View function logs for recent invocations

**To manually deploy:**
```bash
supabase functions deploy get-repository-archive
```

---

## 🔍 Step 4: Test Edge Function Directly

Test the Edge Function directly via curl or Postman:

```bash
curl -X GET \
  "https://YOUR_PROJECT.supabase.co/functions/v1/get-repository-archive" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY"
```

**Expected response:**
```json
{
  "success": true,
  "data": [...],
  "total": X,
  "pagination": {...}
}
```

---

## 🔍 Step 5: Check Supabase Table

1. Go to Supabase Dashboard → Table Editor
2. Select `github_analyses` table
3. Verify:
   - Table has rows
   - Data structure matches expected format
   - RLS policies are set correctly

**Check RLS policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'github_analyses';
```

**Should show:**
- `"Public can view github analyses"` policy with `USING (true)`

---

## 🔧 Common Issues & Fixes

### Issue 1: Edge Function Not Deployed
**Fix:** Deploy the function:
```bash
supabase functions deploy get-repository-archive
```

### Issue 2: RLS Blocking Access
**Fix:** The Edge Function now uses service role key to bypass RLS. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Supabase Edge Function secrets.

### Issue 3: CORS Error
**Fix:** Check that your Vercel deployment URL is in the `ALLOWED_ORIGINS` list in `supabase/functions/_shared/cors.ts`

### Issue 4: Wrong Response Format
**Fix:** Check browser console logs - the component expects `result.success && result.data`

---

## 📋 Diagnostic Checklist

- [ ] Browser console shows API response logs
- [ ] Network tab shows successful request (200 status)
- [ ] Edge Function is deployed in Supabase
- [ ] Edge Function logs show successful query
- [ ] Supabase table has data
- [ ] RLS policies allow public read access
- [ ] Service role key is set in Edge Function secrets

---

**Next Step:** Share the console logs and network response so we can diagnose further.

