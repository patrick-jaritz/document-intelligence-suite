-- PromptForge Document Integration
-- Links prompts to documents for context-aware prompt building

-- Link prompts to documents
CREATE TABLE IF NOT EXISTS prompt_documents (
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  document_id UUID, -- References documents table (if exists) or generic UUID
  relationship_type TEXT DEFAULT 'context' CHECK (relationship_type IN ('context', 'example', 'reference', 'target')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (prompt_id, document_id)
);

-- Store document excerpts used in prompts
CREATE TABLE IF NOT EXISTS prompt_document_excerpts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  document_id UUID,
  excerpt_text TEXT NOT NULL,
  page_number INTEGER,
  start_char INTEGER,
  end_char INTEGER,
  used_in_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add document_id to executions for document-aware execution
ALTER TABLE executions 
  ADD COLUMN IF NOT EXISTS document_id UUID,
  ADD COLUMN IF NOT EXISTS document_context TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prompt_documents_prompt ON prompt_documents(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_documents_document ON prompt_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_prompt_document_excerpts_prompt ON prompt_document_excerpts(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_document_excerpts_document ON prompt_document_excerpts(document_id);
CREATE INDEX IF NOT EXISTS idx_executions_document ON executions(document_id);

-- RLS Policies
ALTER TABLE prompt_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_document_excerpts ENABLE ROW LEVEL SECURITY;

-- Prompt documents policies
CREATE POLICY "Users can view prompt documents"
  ON prompt_documents FOR SELECT
  USING (
    prompt_id IN (
      SELECT id FROM prompts WHERE 
        owner_id = auth.uid() OR
        visibility = 'public' OR
        (visibility = 'team' AND workspace_id IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Users can manage prompt documents"
  ON prompt_documents FOR ALL
  USING (
    prompt_id IN (SELECT id FROM prompts WHERE owner_id = auth.uid())
  );

-- Prompt document excerpts policies
CREATE POLICY "Users can view prompt document excerpts"
  ON prompt_document_excerpts FOR SELECT
  USING (
    prompt_id IN (
      SELECT id FROM prompts WHERE 
        owner_id = auth.uid() OR
        visibility = 'public' OR
        (visibility = 'team' AND workspace_id IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Users can manage prompt document excerpts"
  ON prompt_document_excerpts FOR ALL
  USING (
    prompt_id IN (SELECT id FROM prompts WHERE owner_id = auth.uid())
  );
