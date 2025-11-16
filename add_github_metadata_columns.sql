-- Add metadata columns to github_analyses table
-- These columns are used for organizing and filtering archived repositories

-- Add starred column
ALTER TABLE public.github_analyses 
ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT FALSE;

-- Add pinned column
ALTER TABLE public.github_analyses 
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;

-- Add tags column (array of text)
ALTER TABLE public.github_analyses 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add collections column (array of text)
ALTER TABLE public.github_analyses 
ADD COLUMN IF NOT EXISTS collections TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add notes column (optional text field)
ALTER TABLE public.github_analyses 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_github_analyses_starred ON public.github_analyses(starred) WHERE starred = true;
CREATE INDEX IF NOT EXISTS idx_github_analyses_pinned ON public.github_analyses(pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_github_analyses_tags ON public.github_analyses USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_github_analyses_collections ON public.github_analyses USING GIN(collections);

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'github_analyses' 
ORDER BY ordinal_position;
