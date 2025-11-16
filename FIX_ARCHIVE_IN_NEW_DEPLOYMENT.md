# Fix Archive Not Showing in New Deployment

## The Problem
- Table exists with data ✅
- New Vercel deployment shows empty Archive ❌
- Edge Function might not be deployed or has wrong env vars

## Solution

### Step 1: Deploy the Edge Function

The Edge Function needs to be deployed to Supabase:

```bash
cd /workspace
npx supabase functions deploy get-repository-archive
```

### Step 2: Set Edge Function Environment Variables

The Edge Function uses its own environment variables (different from Vercel):

1. Go to: Supabase Dashboard → Edge Functions → `get-repository-archive`
2. Click **"Manage"** or **"Settings"**
3. Go to **"Secrets"** or **"Environment Variables"**
4. Set:
   - `SUPABASE_URL` = Your Supabase project URL (e.g., `https://joqnpibrfzqflyogrkht.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY` = Your service role key (get from Settings → API → service_role key)

### Step 3: Verify Vercel Environment Variables

In your NEW Vercel project:

1. Go to: Vercel Dashboard → Your New Project → Settings → Environment Variables
2. Make sure these match your Supabase project:
   - `VITE_SUPABASE_URL` = `https://joqnpibrfzqflyogrkht.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = Your anon key

### Step 4: Test the Function

Test if the function works:

```bash
curl "https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/get-repository-archive?limit=10" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Replace `YOUR_ANON_KEY` with your actual anon key.

If this returns data, the function works. If it returns empty, check the Edge Function logs.

### Step 5: Check Edge Function Logs

1. Go to: Supabase Dashboard → Edge Functions → `get-repository-archive`
2. Click **"Logs"**
3. Look for errors when you try to load the Archive
4. The logs will show if there are database connection issues

## Quick Fix Checklist

- [ ] Edge Function deployed: `npx supabase functions deploy get-repository-archive`
- [ ] Edge Function has `SUPABASE_URL` secret set
- [ ] Edge Function has `SUPABASE_SERVICE_ROLE_KEY` secret set
- [ ] Vercel has `VITE_SUPABASE_URL` env var (matches Supabase project)
- [ ] Vercel has `VITE_SUPABASE_ANON_KEY` env var (matches Supabase project)
- [ ] Test function directly with curl

## Most Likely Issue

**Edge Function environment variables aren't set** - The function can't connect to your database without `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets.
