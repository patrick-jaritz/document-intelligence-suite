# Fix: No Repos Showing in Archive

## The Problem

The `get-repository-archive` function is trying to query columns (`tags`, `collections`, `starred`, `pinned`) that don't exist in the `github_analyses` table.

## Solution: Add Missing Columns

### Step 1: Run SQL Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Run this SQL:

```sql
-- Add metadata columns to github_analyses table
ALTER TABLE public.github_analyses 
ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT FALSE;

ALTER TABLE public.github_analyses 
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;

ALTER TABLE public.github_analyses 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.github_analyses 
ADD COLUMN IF NOT EXISTS collections TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.github_analyses 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_github_analyses_starred ON public.github_analyses(starred) WHERE starred = true;
CREATE INDEX IF NOT EXISTS idx_github_analyses_pinned ON public.github_analyses(pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_github_analyses_tags ON public.github_analyses USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_github_analyses_collections ON public.github_analyses USING GIN(collections);
```

### Step 2: Check if Data Exists

After adding columns, check if you have any data:

```sql
-- Check how many repos are in the archive
SELECT COUNT(*) FROM public.github_analyses;

-- See sample data
SELECT repository_name, repository_url, created_at 
FROM public.github_analyses 
ORDER BY created_at DESC 
LIMIT 10;
```

### Step 3: Deploy Updated Function

The function code has been updated to handle missing columns gracefully. Deploy it:

```bash
cd /workspace
npx supabase functions deploy get-repository-archive
```

## If No Data Exists

If the table is empty, you need to analyze some repositories first:

1. Go to your app's GitHub Analyzer page
2. Enter a GitHub repository URL (e.g., `https://github.com/vercel/next.js`)
3. Click "Analyze"
4. After analysis completes, click "Save to Archive"
5. The repo should now appear in the Archive

## Quick Test

After adding columns, test the function:

```bash
curl "https://your-project.supabase.co/functions/v1/get-repository-archive?limit=10" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

This should return any repos in the database.
