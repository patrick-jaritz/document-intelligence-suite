-- PromptForge Database Schema
-- Creates all tables needed for the full PromptForge system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- WORKSPACES (Optional multi-tenant support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members (for team collaboration)
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ============================================================================
-- PROMPTS (Main prompt entity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  prompt_body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
  current_version_id UUID, -- Will reference prompt_versions(id) after that table is created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- ============================================================================
-- PROMPT VERSIONS (Version control for prompts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  prompt_body TEXT NOT NULL,
  changelog TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_current BOOLEAN DEFAULT FALSE,
  UNIQUE(prompt_id, version_number)
);

-- Add foreign key constraint for current_version_id now that prompt_versions exists
ALTER TABLE prompts 
  ADD CONSTRAINT fk_prompts_current_version 
  FOREIGN KEY (current_version_id) 
  REFERENCES prompt_versions(id) ON DELETE SET NULL;

-- ============================================================================
-- EXECUTIONS (Track all prompt runs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  inputs JSONB DEFAULT '{}',
  model TEXT,
  temperature NUMERIC,
  system_message TEXT,
  response TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  latency_ms INTEGER,
  user_feedback TEXT CHECK (user_feedback IN ('success', 'fail', 'neutral')),
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROMPT PACKS (Collections of prompts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pack prompts junction table (many-to-many with ordering)
CREATE TABLE IF NOT EXISTS pack_prompts (
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  PRIMARY KEY (pack_id, prompt_id)
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Prompts indexes
CREATE INDEX IF NOT EXISTS idx_prompts_owner ON prompts(owner_id);
CREATE INDEX IF NOT EXISTS idx_prompts_workspace ON prompts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_prompts_visibility ON prompts(visibility);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_prompts_archived ON prompts(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_updated ON prompts(updated_at DESC);

-- Prompt versions indexes
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_current ON prompt_versions(prompt_id, is_current) WHERE is_current = TRUE;

-- Executions indexes
CREATE INDEX IF NOT EXISTS idx_executions_prompt ON executions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_executions_user ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_created ON executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_feedback ON executions(user_feedback);

-- Packs indexes
CREATE INDEX IF NOT EXISTS idx_packs_owner ON packs(owner_id);
CREATE INDEX IF NOT EXISTS idx_packs_workspace ON packs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_packs_visibility ON packs(visibility);

-- Workspace indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_prompts ENABLE ROW LEVEL SECURITY;

-- Workspaces policies
CREATE POLICY "Users can view own workspaces"
  ON workspaces FOR SELECT
  USING (owner_id = auth.uid() OR id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Users can view workspace members"
  ON workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage members"
  ON workspace_members FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Prompts policies
CREATE POLICY "Users can view own prompts"
  ON prompts FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view team prompts"
  ON prompts FOR SELECT
  USING (
    visibility = 'team' AND (
      workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view public prompts"
  ON prompts FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can create prompts"
  ON prompts FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own prompts"
  ON prompts FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own prompts"
  ON prompts FOR DELETE
  USING (owner_id = auth.uid());

-- Prompt versions policies
CREATE POLICY "Users can view prompt versions"
  ON prompt_versions FOR SELECT
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

CREATE POLICY "Users can create prompt versions"
  ON prompt_versions FOR INSERT
  WITH CHECK (
    prompt_id IN (SELECT id FROM prompts WHERE owner_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own prompt versions"
  ON prompt_versions FOR UPDATE
  USING (
    prompt_id IN (SELECT id FROM prompts WHERE owner_id = auth.uid())
  );

-- Executions policies
CREATE POLICY "Users can view own executions"
  ON executions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view team executions"
  ON executions FOR SELECT
  USING (
    prompt_id IN (
      SELECT id FROM prompts WHERE 
        visibility = 'team' AND workspace_id IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can create executions"
  ON executions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own executions"
  ON executions FOR UPDATE
  USING (user_id = auth.uid());

-- Packs policies
CREATE POLICY "Users can view own packs"
  ON packs FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view team packs"
  ON packs FOR SELECT
  USING (
    visibility = 'team' AND (
      workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view public packs"
  ON packs FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can create packs"
  ON packs FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own packs"
  ON packs FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own packs"
  ON packs FOR DELETE
  USING (owner_id = auth.uid());

-- Pack prompts policies
CREATE POLICY "Users can view pack prompts"
  ON pack_prompts FOR SELECT
  USING (
    pack_id IN (
      SELECT id FROM packs WHERE 
        owner_id = auth.uid() OR
        visibility = 'public' OR
        (visibility = 'team' AND workspace_id IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Users can manage pack prompts"
  ON pack_prompts FOR ALL
  USING (
    pack_id IN (SELECT id FROM packs WHERE owner_id = auth.uid())
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packs_updated_at
  BEFORE UPDATE ON packs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create first version when prompt is created
CREATE OR REPLACE FUNCTION create_initial_prompt_version()
RETURNS TRIGGER AS $$
DECLARE
  version_id UUID;
BEGIN
  INSERT INTO prompt_versions (prompt_id, version_number, prompt_body, is_current, created_by)
  VALUES (NEW.id, 1, NEW.prompt_body, TRUE, NEW.owner_id)
  RETURNING id INTO version_id;
  
  UPDATE prompts SET current_version_id = version_id WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_initial_version_on_prompt_insert
  AFTER INSERT ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_prompt_version();

-- Function to ensure only one current version per prompt
CREATE OR REPLACE FUNCTION ensure_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE prompt_versions
    SET is_current = FALSE
    WHERE prompt_id = NEW.prompt_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_current_version_trigger
  BEFORE INSERT OR UPDATE ON prompt_versions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_current_version();
