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
