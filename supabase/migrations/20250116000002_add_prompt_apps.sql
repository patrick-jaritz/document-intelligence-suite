-- PromptForge Public Apps
-- Allows prompts to be shared as standalone web applications

-- Public app URLs
CREATE TABLE IF NOT EXISTS prompt_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  allow_anonymous BOOLEAN DEFAULT true,
  require_auth BOOLEAN DEFAULT false,
  max_executions_per_day INTEGER DEFAULT 100,
  max_executions_total INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Track public app executions (separate from regular executions)
CREATE TABLE IF NOT EXISTS app_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID REFERENCES prompt_apps(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  inputs JSONB NOT NULL,
  output TEXT,
  model TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  latency_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App analytics
CREATE TABLE IF NOT EXISTS app_analytics (
  app_id UUID REFERENCES prompt_apps(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  executions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  PRIMARY KEY (app_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prompt_apps_prompt ON prompt_apps(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_apps_slug ON prompt_apps(slug);
CREATE INDEX IF NOT EXISTS idx_prompt_apps_active ON prompt_apps(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_app_executions_app ON app_executions(app_id);
CREATE INDEX IF NOT EXISTS idx_app_executions_created ON app_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_app_analytics_app_date ON app_analytics(app_id, date);

-- RLS Policies
ALTER TABLE prompt_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_analytics ENABLE ROW LEVEL SECURITY;

-- Prompt apps: Users can view active apps, owners can manage
CREATE POLICY "Anyone can view active public apps"
  ON prompt_apps FOR SELECT
  USING (is_active = true);

CREATE POLICY "Owners can manage their apps"
  ON prompt_apps FOR ALL
  USING (
    prompt_id IN (SELECT id FROM prompts WHERE owner_id = auth.uid())
  );

-- App executions: Public can create, owners can view
CREATE POLICY "Anyone can create app executions"
  ON app_executions FOR INSERT
  WITH CHECK (
    app_id IN (SELECT id FROM prompt_apps WHERE is_active = true)
  );

CREATE POLICY "App owners can view executions"
  ON app_executions FOR SELECT
  USING (
    app_id IN (
      SELECT id FROM prompt_apps 
      WHERE prompt_id IN (SELECT id FROM prompts WHERE owner_id = auth.uid())
    )
  );

-- App analytics: Owners can view
CREATE POLICY "App owners can view analytics"
  ON app_analytics FOR SELECT
  USING (
    app_id IN (
      SELECT id FROM prompt_apps 
      WHERE prompt_id IN (SELECT id FROM prompts WHERE owner_id = auth.uid())
    )
  );

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_app_slug(prompt_title TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from title
  base_slug := lower(regexp_replace(prompt_title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  base_slug := substring(base_slug from 1 for 50); -- Limit length
  
  -- Add random suffix
  slug := base_slug || '-' || substring(md5(random()::text) from 1 for 8);
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM prompt_apps WHERE prompt_apps.slug = slug) LOOP
    counter := counter + 1;
    slug := base_slug || '-' || substring(md5(random()::text) from 1 for 8);
    IF counter > 100 THEN
      -- Fallback to UUID-based slug
      slug := 'app-' || substring(uuid_generate_v4()::text from 1 for 8);
      EXIT;
    END IF;
  END LOOP;
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_prompt_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prompt_apps_updated_at
  BEFORE UPDATE ON prompt_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_apps_updated_at();
