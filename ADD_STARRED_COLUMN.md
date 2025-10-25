# Add Starred Column to github_analyses Table

## Run this SQL in your Supabase SQL Editor:

```sql
-- Add starred column if it doesn't exist
ALTER TABLE public.github_analyses 
ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT FALSE;

-- Create index for fast queries on starred items
CREATE INDEX IF NOT EXISTS idx_github_analyses_starred ON public.github_analyses(starred) WHERE starred = true;
```

## Steps:
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Paste the SQL above
4. Click "Run"
