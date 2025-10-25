# How to Create the github_analyses Table

## Option 1: Supabase SQL Editor (Recommended - 2 minutes)

1. Open your browser
2. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/editor
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Paste this SQL:

```sql
CREATE TABLE IF NOT EXISTS public.github_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    repository_url TEXT NOT NULL UNIQUE,
    repository_name TEXT NOT NULL,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_analyses_repository_url ON public.github_analyses(repository_url);

ALTER TABLE public.github_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view github analyses" ON public.github_analyses;
DROP POLICY IF EXISTS "Public can insert github analyses" ON public.github_analyses;
DROP POLICY IF EXISTS "Public can update github analyses" ON public.github_analyses;
DROP POLICY IF EXISTS "Public can delete github analyses" ON public.github_analyses;

CREATE POLICY "Public can view github analyses" ON public.github_analyses FOR SELECT USING (true);
CREATE POLICY "Public can insert github analyses" ON public.github_analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update github analyses" ON public.github_analyses FOR UPDATE USING (true);
CREATE POLICY "Public can delete github analyses" ON public.github_analyses FOR DELETE USING (true);
```

6. Click "Run" (or press Cmd+Enter)
7. Wait for "Success. No rows returned"
8. Done! ✅

## Option 2: Via Browser Console (If you prefer)

Open the browser console on your deployed site and run:

```javascript
fetch('https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/create-table', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + 'YOUR_SUPABASE_ANON_KEY',
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log)
```

## Verification

After creating the table, test the archive save feature in the GitHub Analyzer!
