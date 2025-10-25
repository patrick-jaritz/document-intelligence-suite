-- Create github_analyses table
CREATE TABLE IF NOT EXISTS public.github_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    repository_url TEXT NOT NULL UNIQUE,
    repository_name TEXT NOT NULL,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on repository_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_github_analyses_repository_url ON public.github_analyses(repository_url);

-- Enable Row Level Security
ALTER TABLE public.github_analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view github analyses" ON public.github_analyses;
DROP POLICY IF EXISTS "Public can insert github analyses" ON public.github_analyses;
DROP POLICY IF EXISTS "Public can update github analyses" ON public.github_analyses;
DROP POLICY IF EXISTS "Public can delete github analyses" ON public.github_analyses;

-- Allow public read access
CREATE POLICY "Public can view github analyses" ON public.github_analyses
  FOR SELECT USING (true);

-- Allow public insert access
CREATE POLICY "Public can insert github analyses" ON public.github_analyses
  FOR INSERT WITH CHECK (true);

-- Allow public update access
CREATE POLICY "Public can update github analyses" ON public.github_analyses
  FOR UPDATE USING (true);

-- Allow public delete access
CREATE POLICY "Public can delete github analyses" ON public.github_analyses
  FOR DELETE USING (true);
