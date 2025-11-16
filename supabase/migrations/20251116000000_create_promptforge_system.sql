-- Migration: Create PromptForge System
-- Created: 2025-11-16
-- Description: Creates comprehensive prompt management system with versioning, execution logging, and analytics

-- ============================================
-- PROMPTS TABLE (Enhanced from prompt_templates)
-- ============================================

-- Create prompts table (will migrate from prompt_templates)
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Basic info
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'Writing', 'Coding', 'Analysis', etc.
    
    -- Prompt content (supports both structured and plain text)
    prompt_body TEXT NOT NULL, -- Main prompt text with {{placeholders}}
    system_message TEXT, -- Optional system message
    
    -- Structured prompt fields (for backward compatibility)
    role TEXT,
    task TEXT,
    context TEXT,
    constraints JSONB DEFAULT '[]'::jsonb,
    examples JSONB DEFAULT '[]'::jsonb,
    
    -- Organization
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
    
    -- Versioning
    current_version_id UUID, -- Points to latest version (self-reference via prompt_versions)
    parent_prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL, -- For forks
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Legacy fields (for compatibility with prompt_templates)
    mode TEXT DEFAULT 'custom' CHECK (mode IN ('template', 'rag', 'custom')),
    associated_template_id UUID,
    
    -- Preview formats (cached)
    json_preview TEXT,
    markdown_preview TEXT,
    plain_text_preview TEXT,
    
    CONSTRAINT unique_user_title UNIQUE(user_id, title)
);

-- Indexes for prompts
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_visibility ON prompts(visibility);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_prompts_mode ON prompts(mode);
CREATE INDEX IF NOT EXISTS idx_prompts_parent ON prompts(parent_prompt_id) WHERE parent_prompt_id IS NOT NULL;

-- ============================================
-- PROMPT VERSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.prompt_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    
    -- Content snapshot
    prompt_body TEXT NOT NULL,
    system_message TEXT,
    
    -- Structured fields snapshot
    role TEXT,
    task TEXT,
    context TEXT,
    constraints JSONB DEFAULT '[]'::jsonb,
    examples JSONB DEFAULT '[]'::jsonb,
    
    -- Change tracking
    changelog TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Version metadata
    is_current BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT unique_prompt_version UNIQUE(prompt_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_is_current ON prompt_versions(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created_at ON prompt_versions(created_at DESC);

-- ============================================
-- EXECUTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Input parameters
    input_parameters JSONB NOT NULL DEFAULT '{}'::jsonb, -- {placeholder: value}
    
    -- Model configuration
    model_provider TEXT NOT NULL, -- 'openai', 'anthropic', 'openrouter', etc.
    model_name TEXT NOT NULL, -- 'gpt-4o', 'claude-3-opus', etc.
    temperature DECIMAL(3,2),
    max_tokens INTEGER,
    system_message TEXT,
    
    -- Response
    response_text TEXT, -- Full response (or truncated if > 100KB)
    response_stored BOOLEAN DEFAULT FALSE, -- If true, full response in executions_data
    tokens_input INTEGER,
    tokens_output INTEGER,
    tokens_total INTEGER,
    
    -- Performance
    latency_ms INTEGER,
    cost_usd DECIMAL(10,6), -- If available
    
    -- User feedback
    user_rating INTEGER CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)),
    user_feedback TEXT, -- 'success', 'fail', or custom text
    marked_successful BOOLEAN,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_context JSONB DEFAULT '{}'::jsonb -- Additional context (browser, IP, etc.)
);

CREATE INDEX IF NOT EXISTS idx_executions_prompt_id ON executions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_marked_successful ON executions(marked_successful) WHERE marked_successful = true;
CREATE INDEX IF NOT EXISTS idx_executions_user_rating ON executions(user_rating);
CREATE INDEX IF NOT EXISTS idx_executions_prompt_version_id ON executions(prompt_version_id);

-- ============================================
-- EXECUTIONS_DATA TABLE (for large responses)
-- ============================================

CREATE TABLE IF NOT EXISTS public.executions_data (
    execution_id UUID REFERENCES executions(id) ON DELETE CASCADE PRIMARY KEY,
    response_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PROMPT PACKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.prompt_packs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Basic info
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Visibility
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_pack_title UNIQUE(user_id, title)
);

CREATE INDEX IF NOT EXISTS idx_prompt_packs_user_id ON prompt_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_packs_tags ON prompt_packs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_prompt_packs_visibility ON prompt_packs(visibility);

-- ============================================
-- PACK_PROMPTS JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.pack_prompts (
    pack_id UUID REFERENCES prompt_packs(id) ON DELETE CASCADE NOT NULL,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    
    PRIMARY KEY (pack_id, prompt_id)
);

CREATE INDEX IF NOT EXISTS idx_pack_prompts_pack_id ON pack_prompts(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_prompts_prompt_id ON pack_prompts(prompt_id);

-- ============================================
-- PROMPT METRICS TABLE (for analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS public.prompt_metrics (
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE PRIMARY KEY,
    
    -- Engagement metrics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Performance metrics
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2),
    
    -- Community metrics
    comment_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0, -- How many times copied
    
    -- Calculated scores
    popularity_score DECIMAL(10,2) DEFAULT 0,
    effectiveness_score DECIMAL(10,2) DEFAULT 0,
    
    -- Timestamps
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_metrics_popularity ON prompt_metrics(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_metrics_effectiveness ON prompt_metrics(effectiveness_score DESC);

-- ============================================
-- PROMPT FAVORITES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.prompt_favorites (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (user_id, prompt_id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_favorites_user_id ON prompt_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_favorites_prompt_id ON prompt_favorites(prompt_id);

-- ============================================
-- PROMPT LIKES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.prompt_likes (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (user_id, prompt_id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_likes_prompt_id ON prompt_likes(prompt_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prompts_updated_at
    BEFORE UPDATE ON prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_prompts_updated_at();

CREATE TRIGGER trigger_update_prompt_packs_updated_at
    BEFORE UPDATE ON prompt_packs
    FOR EACH ROW
    EXECUTE FUNCTION update_prompts_updated_at();

-- Update prompt_metrics when execution is created
CREATE OR REPLACE FUNCTION update_prompt_metrics_on_execution()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO prompt_metrics (prompt_id, total_executions, successful_executions, avg_rating)
    VALUES (
        NEW.prompt_id,
        1,
        CASE WHEN NEW.marked_successful = true THEN 1 ELSE 0 END,
        NEW.user_rating::DECIMAL
    )
    ON CONFLICT (prompt_id) DO UPDATE SET
        total_executions = prompt_metrics.total_executions + 1,
        successful_executions = prompt_metrics.successful_executions + 
            CASE WHEN NEW.marked_successful = true THEN 1 ELSE 0 END,
        avg_rating = (
            SELECT AVG(user_rating)::DECIMAL(3,2)
            FROM executions
            WHERE prompt_id = NEW.prompt_id AND user_rating IS NOT NULL
        ),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_metrics_on_execution
    AFTER INSERT ON executions
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_metrics_on_execution();

-- Update prompt_metrics when execution feedback is updated
CREATE OR REPLACE FUNCTION update_prompt_metrics_on_feedback()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE prompt_metrics
    SET
        successful_executions = (
            SELECT COUNT(*) FROM executions
            WHERE prompt_id = NEW.prompt_id AND marked_successful = true
        ),
        avg_rating = (
            SELECT AVG(user_rating)::DECIMAL(3,2)
            FROM executions
            WHERE prompt_id = NEW.prompt_id AND user_rating IS NOT NULL
        ),
        updated_at = NOW()
    WHERE prompt_id = NEW.prompt_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_metrics_on_feedback
    AFTER UPDATE OF user_rating, marked_successful ON executions
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_metrics_on_feedback();

-- Update favorite_count in prompt_metrics
CREATE OR REPLACE FUNCTION update_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE prompt_metrics
        SET favorite_count = favorite_count + 1,
            updated_at = NOW()
        WHERE prompt_id = NEW.prompt_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE prompt_metrics
        SET favorite_count = GREATEST(0, favorite_count - 1),
            updated_at = NOW()
        WHERE prompt_id = OLD.prompt_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_favorite_count
    AFTER INSERT OR DELETE ON prompt_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_favorite_count();

-- Update like_count in prompt_metrics
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE prompt_metrics
        SET like_count = like_count + 1,
            updated_at = NOW()
        WHERE prompt_id = NEW.prompt_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE prompt_metrics
        SET like_count = GREATEST(0, like_count - 1),
            updated_at = NOW()
        WHERE prompt_id = OLD.prompt_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_like_count
    AFTER INSERT OR DELETE ON prompt_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_like_count();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_likes ENABLE ROW LEVEL SECURITY;

-- Prompts RLS Policies
CREATE POLICY "Users can view own prompts or public prompts"
    ON prompts FOR SELECT
    USING (auth.uid() = user_id OR visibility = 'public');

CREATE POLICY "Users can insert own prompts"
    ON prompts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
    ON prompts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
    ON prompts FOR DELETE
    USING (auth.uid() = user_id);

-- Prompt Versions RLS Policies
CREATE POLICY "Users can view versions of accessible prompts"
    ON prompt_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM prompts
            WHERE prompts.id = prompt_versions.prompt_id
            AND (prompts.user_id = auth.uid() OR prompts.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert versions for own prompts"
    ON prompt_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM prompts
            WHERE prompts.id = prompt_versions.prompt_id
            AND prompts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update versions of own prompts"
    ON prompt_versions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM prompts
            WHERE prompts.id = prompt_versions.prompt_id
            AND prompts.user_id = auth.uid()
        )
    );

-- Executions RLS Policies
CREATE POLICY "Users can view own executions"
    ON executions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions"
    ON executions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executions"
    ON executions FOR UPDATE
    USING (auth.uid() = user_id);

-- Executions Data RLS Policies
CREATE POLICY "Users can view execution data for own executions"
    ON executions_data FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM executions
            WHERE executions.id = executions_data.execution_id
            AND executions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert execution data for own executions"
    ON executions_data FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM executions
            WHERE executions.id = executions_data.execution_id
            AND executions.user_id = auth.uid()
        )
    );

-- Prompt Packs RLS Policies
CREATE POLICY "Users can view own packs or public packs"
    ON prompt_packs FOR SELECT
    USING (auth.uid() = user_id OR visibility = 'public');

CREATE POLICY "Users can insert own packs"
    ON prompt_packs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packs"
    ON prompt_packs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own packs"
    ON prompt_packs FOR DELETE
    USING (auth.uid() = user_id);

-- Pack Prompts RLS Policies
CREATE POLICY "Users can view pack prompts for accessible packs"
    ON pack_prompts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM prompt_packs
            WHERE prompt_packs.id = pack_prompts.pack_id
            AND (prompt_packs.user_id = auth.uid() OR prompt_packs.visibility = 'public')
        )
    );

CREATE POLICY "Users can manage pack prompts for own packs"
    ON pack_prompts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM prompt_packs
            WHERE prompt_packs.id = pack_prompts.pack_id
            AND prompt_packs.user_id = auth.uid()
        )
    );

-- Prompt Metrics RLS Policies (read-only for all, updates via triggers)
CREATE POLICY "Users can view all prompt metrics"
    ON prompt_metrics FOR SELECT
    USING (true);

-- Prompt Favorites RLS Policies
CREATE POLICY "Users can manage own favorites"
    ON prompt_favorites FOR ALL
    USING (auth.uid() = user_id);

-- Prompt Likes RLS Policies
CREATE POLICY "Users can manage own likes"
    ON prompt_likes FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON prompts TO authenticated;
GRANT SELECT ON prompts TO anon;

GRANT SELECT, INSERT, UPDATE ON prompt_versions TO authenticated;
GRANT SELECT ON prompt_versions TO anon;

GRANT SELECT, INSERT, UPDATE ON executions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON executions_data TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON prompt_packs TO authenticated;
GRANT SELECT ON prompt_packs TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON pack_prompts TO authenticated;
GRANT SELECT ON pack_prompts TO anon;

GRANT SELECT ON prompt_metrics TO authenticated, anon;

GRANT SELECT, INSERT, DELETE ON prompt_favorites TO authenticated;
GRANT SELECT, INSERT, DELETE ON prompt_likes TO authenticated;

-- ============================================
-- DATA MIGRATION FROM prompt_templates
-- ============================================

-- Migrate existing prompt_templates to prompts table
INSERT INTO prompts (
    id,
    user_id,
    title,
    description,
    category,
    prompt_body,
    system_message,
    role,
    task,
    context,
    constraints,
    examples,
    tags,
    visibility,
    mode,
    associated_template_id,
    json_preview,
    markdown_preview,
    plain_text_preview,
    created_at,
    updated_at
)
SELECT 
    id,
    user_id,
    COALESCE(name, title, 'Untitled Prompt') as title,
    description,
    mode as category, -- Use mode as initial category
    COALESCE(plain_text_preview, 
        CASE 
            WHEN role IS NOT NULL OR task IS NOT NULL THEN
                CONCAT(
                    COALESCE('Role: ' || role || E'\n\n', ''),
                    COALESCE('Task: ' || task || E'\n\n', ''),
                    COALESCE('Context: ' || context || E'\n\n', ''),
                    COALESCE('Constraints: ' || (constraints::text) || E'\n\n', ''),
                    COALESCE('Examples: ' || (examples::text), '')
                )
            ELSE 'Empty prompt'
        END
    ) as prompt_body,
    NULL as system_message,
    role,
    task,
    context,
    constraints,
    examples,
    ARRAY[]::TEXT[] as tags,
    CASE WHEN is_public THEN 'public' ELSE 'private' END as visibility,
    mode,
    associated_template_id,
    json_preview,
    markdown_preview,
    plain_text_preview,
    created_at,
    updated_at
FROM prompt_templates
WHERE NOT EXISTS (
    SELECT 1 FROM prompts WHERE prompts.id = prompt_templates.id
)
ON CONFLICT (id) DO NOTHING;

-- Create initial versions for migrated prompts
INSERT INTO prompt_versions (
    prompt_id,
    version_number,
    prompt_body,
    system_message,
    role,
    task,
    context,
    constraints,
    examples,
    is_current,
    created_by,
    created_at
)
SELECT 
    id as prompt_id,
    1 as version_number,
    prompt_body,
    system_message,
    role,
    task,
    context,
    constraints,
    examples,
    true as is_current,
    user_id as created_by,
    created_at
FROM prompts
WHERE NOT EXISTS (
    SELECT 1 FROM prompt_versions 
    WHERE prompt_versions.prompt_id = prompts.id
);

-- Update prompts to reference current version
UPDATE prompts p
SET current_version_id = (
    SELECT id FROM prompt_versions pv
    WHERE pv.prompt_id = p.id AND pv.is_current = true
    LIMIT 1
)
WHERE current_version_id IS NULL;

-- Initialize metrics for existing prompts
INSERT INTO prompt_metrics (prompt_id)
SELECT id FROM prompts
ON CONFLICT (prompt_id) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate popularity score
CREATE OR REPLACE FUNCTION calculate_popularity_score(p_prompt_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_score DECIMAL(10,2);
BEGIN
    SELECT 
        (view_count * 0.1) + 
        (like_count * 2) + 
        (favorite_count * 3) + 
        (share_count * 5) + 
        (fork_count * 4) + 
        (comment_count * 1.5)
    INTO v_score
    FROM prompt_metrics
    WHERE prompt_id = p_prompt_id;
    
    RETURN COALESCE(v_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate effectiveness score
CREATE OR REPLACE FUNCTION calculate_effectiveness_score(p_prompt_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_score DECIMAL(10,2);
    v_success_rate DECIMAL(5,4);
    v_avg_rating DECIMAL(3,2);
BEGIN
    SELECT 
        CASE 
            WHEN total_executions > 0 THEN 
                successful_executions::DECIMAL / total_executions
            ELSE 0
        END,
        avg_rating
    INTO v_success_rate, v_avg_rating
    FROM prompt_metrics
    WHERE prompt_id = p_prompt_id;
    
    -- Weighted: 70% success rate, 30% average rating
    v_score := (COALESCE(v_success_rate, 0) * 70) + 
               ((COALESCE(v_avg_rating, 0) / 5) * 30);
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Update popularity and effectiveness scores periodically
CREATE OR REPLACE FUNCTION update_prompt_scores()
RETURNS void AS $$
BEGIN
    UPDATE prompt_metrics
    SET 
        popularity_score = calculate_popularity_score(prompt_id),
        effectiveness_score = calculate_effectiveness_score(prompt_id),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE prompts IS 'Main prompts table for PromptForge system';
COMMENT ON TABLE prompt_versions IS 'Version history for prompts';
COMMENT ON TABLE executions IS 'Execution logs with feedback and metrics';
COMMENT ON TABLE prompt_packs IS 'Collections of prompts bundled together';
COMMENT ON TABLE prompt_metrics IS 'Aggregated metrics for analytics and rankings';
