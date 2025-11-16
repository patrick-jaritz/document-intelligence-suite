# Check Why Archive Doesn't Show in New Deployment

## The Issue
- Table exists with data in Supabase
- New Vercel deployment shows empty Archive
- This means the new deployment isn't connecting to the right database

## Check These:

### 1. Environment Variables in New Vercel Project

1. Go to: Vercel Dashboard → Your New Project → Settings → Environment Variables
2. Check if these are set:
   - `VITE_SUPABASE_URL` = Should match your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Should match your Supabase anon key

3. **Important:** Make sure they match the OLD project's values (same Supabase project)

### 2. Edge Function Environment Variables

The `get-repository-archive` function needs:
- `SUPABASE_URL` (in Supabase Edge Function settings)
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`

Check:
1. Go to: Supabase Dashboard → Edge Functions → `get-repository-archive`
2. Check Environment Variables section
3. Make sure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### 3. Test the Function Directly

Test if the function works:

```bash
curl "https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/get-repository-archive?limit=10" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Replace `YOUR_ANON_KEY` with your actual anon key.

### 4. Check Browser Console

1. Open your deployed app
2. Open browser DevTools (F12)
3. Go to Console tab
4. Click "Archive" in the GitHub Analyzer
5. Look for errors - they'll tell you what's wrong

### 5. Verify Function is Deployed

Make sure the Edge Function is deployed:

```bash
cd /workspace
npx supabase functions deploy get-repository-archive
```

## Most Likely Issue

**The new Vercel project is using different Supabase environment variables.**

Make sure the new Vercel project has the SAME Supabase URL and keys as the old one.
