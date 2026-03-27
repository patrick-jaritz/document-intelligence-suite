-- Create github_analyses table to store repository analysis results
CREATE TABLE IF NOT EXISTS github_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    repository_url TEXT NOT NULL,
    repository_name TEXT NOT NULL,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_github_analyses_repository_url ON github_analyses(repository_url);
CREATE INDEX IF NOT EXISTS idx_github_analyses_repository_name ON github_analyses(repository_name);
CREATE INDEX IF NOT EXISTS idx_github_analyses_created_at ON github_analyses(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_github_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_github_analyses_updated_at
    BEFORE UPDATE ON github_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_github_analyses_updated_at();

-- Enable Row Level Security
ALTER TABLE github_analyses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read analyses
CREATE POLICY "Allow authenticated users to read github analyses" ON github_analyses
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert analyses
CREATE POLICY "Allow authenticated users to insert github analyses" ON github_analyses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to update analyses
CREATE POLICY "Allow authenticated users to update github analyses" ON github_analyses
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to delete analyses
CREATE POLICY "Allow authenticated users to delete github analyses" ON github_analyses
    FOR DELETE USING (auth.role() = 'authenticated');
