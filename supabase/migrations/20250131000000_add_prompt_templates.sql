-- Migration: Add prompt_templates table for Structured Prompt Builder
-- Created: 2025-01-31

-- Create prompt_templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Structured prompt fields
  title TEXT,
  role TEXT,
  task TEXT,
  context TEXT,
  constraints JSONB DEFAULT '[]'::jsonb,
  examples JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  mode TEXT DEFAULT 'custom' CHECK (mode IN ('template', 'rag', 'custom')),
  associated_template_id UUID REFERENCES structure_templates(id) ON DELETE SET NULL,
  
  -- Preview formats (cached)
  json_preview TEXT,
  markdown_preview TEXT,
  plain_text_preview TEXT,
  
  -- Usage stats
  usage_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_prompt_templates_user_id 
  ON prompt_templates(user_id);

-- Add index for mode filtering
CREATE INDEX IF NOT EXISTS idx_prompt_templates_mode 
  ON prompt_templates(mode);

-- Add index for public prompts
CREATE INDEX IF NOT EXISTS idx_prompt_templates_public 
  ON prompt_templates(is_public) 
  WHERE is_public = true;

-- Add index for associated templates
CREATE INDEX IF NOT EXISTS idx_prompt_templates_template_id 
  ON prompt_templates(associated_template_id) 
  WHERE associated_template_id IS NOT NULL;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_prompt_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_templates_updated_at();

-- Add column to structure_templates for prompt linking (optional)
ALTER TABLE structure_templates 
ADD COLUMN IF NOT EXISTS prompt_template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL;

-- Create index for reverse lookup
CREATE INDEX IF NOT EXISTS idx_structure_templates_prompt_id 
  ON structure_templates(prompt_template_id) 
  WHERE prompt_template_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own prompts and public prompts
CREATE POLICY "Users can read own prompts"
  ON prompt_templates
  FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

-- Users can insert their own prompts
CREATE POLICY "Users can insert own prompts"
  ON prompt_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own prompts
CREATE POLICY "Users can update own prompts"
  ON prompt_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own prompts
CREATE POLICY "Users can delete own prompts"
  ON prompt_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON prompt_templates TO authenticated;
GRANT SELECT ON prompt_templates TO anon;

