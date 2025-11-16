# PromptForge Integration Plan
## Detailed Implementation Roadmap

**Date:** 2025-11-16  
**Status:** Planning Phase  
**Target:** MVP in 6-10 weeks

---

## Executive Summary

This plan integrates a comprehensive PromptOS-inspired system ("PromptForge") into the existing Document Intelligence Suite. The system will enable users to build, organize, version, execute, and analyze AI prompts with advanced collaboration and analytics features.

**Key Advantages:**
- Leverages existing infrastructure (Supabase, React, Vite)
- Builds on existing PromptBuilder component
- Reuses authentication and Edge Function patterns
- Extends current LLM integration capabilities

---

## 1. Current State Analysis

### 1.1 Existing Components ✅

**Frontend:**
- ✅ `PromptBuilder` component (structured prompt editor)
- ✅ `PromptForm`, `PromptPreview`, `PromptBuilderTestPanel`
- ✅ Sample prompts data
- ✅ Prompt formatting utilities
- ✅ Template editor component
- ✅ Chat interface component (can be adapted for AI chat)

**Backend:**
- ✅ `prompt-builder` Edge Function (CRUD operations)
- ✅ `test-prompt` Edge Function (OpenRouter integration)
- ✅ Supabase authentication system
- ✅ CORS and security headers infrastructure
- ✅ Rate limiting and request validation

**Database:**
- ⚠️ `prompt_templates` table exists (needs schema review)
- ❌ No `prompt_versions` table
- ❌ No `executions` table
- ❌ No `packs` table
- ❌ No `apps` table

### 1.2 Gaps to Fill

**Database Schema:**
- Prompt versioning system
- Execution logging
- User feedback/ratings
- Prompt packs
- Prompt apps (v2)
- Workspace/team management

**Frontend Features:**
- Prompt library/list view
- Execution history view
- Analytics dashboard
- Pack management UI
- AI chat integration for prompt refinement
- Version comparison UI

**Backend Features:**
- Execution API with logging
- Analytics aggregation
- Pack CRUD operations
- Version management
- Feedback/rating system

---

## 2. Database Schema Design

### 2.1 Core Tables

```sql
-- ============================================
-- PROMPTS & VERSIONING
-- ============================================

-- Main prompts table (extends existing prompt_templates)
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Basic info
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'Writing', 'Coding', 'Analysis', etc.
    
    -- Prompt content
    prompt_body TEXT NOT NULL, -- Main prompt text with {{placeholders}}
    system_message TEXT, -- Optional system message
    
    -- Organization
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
    
    -- Versioning
    current_version_id UUID, -- Points to latest version
    parent_prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL, -- For forks
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    CONSTRAINT unique_user_title UNIQUE(user_id, title)
);

CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_prompts_workspace_id ON prompts(workspace_id);
CREATE INDEX idx_prompts_tags ON prompts USING GIN(tags);
CREATE INDEX idx_prompts_category ON prompts(category);
CREATE INDEX idx_prompts_visibility ON prompts(visibility);
CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC);

-- Prompt versions table
CREATE TABLE IF NOT EXISTS public.prompt_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    
    -- Content snapshot
    prompt_body TEXT NOT NULL,
    system_message TEXT,
    
    -- Change tracking
    changelog TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Version metadata
    is_current BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT unique_prompt_version UNIQUE(prompt_id, version_number)
);

CREATE INDEX idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
CREATE INDEX idx_prompt_versions_is_current ON prompt_versions(is_current) WHERE is_current = true;

-- ============================================
-- EXECUTIONS & FEEDBACK
-- ============================================

-- Execution log table
CREATE TABLE IF NOT EXISTS public.executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    prompt_version_id UUID REFERENCES prompt_versions(id),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Input parameters
    input_parameters JSONB NOT NULL, -- {placeholder: value}
    
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
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT, -- 'success', 'fail', or custom text
    marked_successful BOOLEAN,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_context JSONB -- Additional context (browser, IP, etc.)
);

CREATE INDEX idx_executions_prompt_id ON executions(prompt_id);
CREATE INDEX idx_executions_user_id ON executions(user_id);
CREATE INDEX idx_executions_created_at ON executions(created_at DESC);
CREATE INDEX idx_executions_marked_successful ON executions(marked_successful) WHERE marked_successful = true;
CREATE INDEX idx_executions_user_rating ON executions(user_rating);

-- Large response storage (for responses > 100KB)
CREATE TABLE IF NOT EXISTS public.executions_data (
    execution_id UUID REFERENCES executions(id) ON DELETE CASCADE PRIMARY KEY,
    response_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PROMPT PACKS
-- ============================================

-- Prompt packs table
CREATE TABLE IF NOT EXISTS public.prompt_packs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
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

CREATE INDEX idx_prompt_packs_user_id ON prompt_packs(user_id);
CREATE INDEX idx_prompt_packs_tags ON prompt_packs USING GIN(tags);

-- Pack prompts junction table (with ordering)
CREATE TABLE IF NOT EXISTS public.pack_prompts (
    pack_id UUID REFERENCES prompt_packs(id) ON DELETE CASCADE NOT NULL,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    
    PRIMARY KEY (pack_id, prompt_id)
);

CREATE INDEX idx_pack_prompts_pack_id ON pack_prompts(pack_id);
CREATE INDEX idx_pack_prompts_prompt_id ON pack_prompts(prompt_id);

-- ============================================
-- WORKSPACES & COLLABORATION (v2)
-- ============================================

-- Workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

-- Workspace members
CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

-- ============================================
-- PROMPT APPS (v2)
-- ============================================

-- Prompt apps table
CREATE TABLE IF NOT EXISTS public.prompt_apps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    prompt_version_id UUID REFERENCES prompt_versions(id),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- App definition
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    
    -- Form configuration
    form_fields JSONB NOT NULL, -- Array of {label, type, required, default, options}
    
    -- Access control
    access_level TEXT DEFAULT 'private' CHECK (access_level IN ('private', 'workspace', 'public')),
    requires_auth BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prompt_apps_prompt_id ON prompt_apps(prompt_id);
CREATE INDEX idx_prompt_apps_user_id ON prompt_apps(user_id);
CREATE INDEX idx_prompt_apps_slug ON prompt_apps(slug);
CREATE INDEX idx_prompt_apps_access_level ON prompt_apps(access_level);

-- ============================================
-- COMMENTS & COLLABORATION (v2)
-- ============================================

-- Comments table
CREATE TABLE IF NOT EXISTS public.prompt_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id UUID REFERENCES prompt_comments(id) ON DELETE CASCADE, -- For threading
    
    content TEXT NOT NULL,
    mentions UUID[], -- Array of user IDs mentioned with @
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prompt_comments_prompt_id ON prompt_comments(prompt_id);
CREATE INDEX idx_prompt_comments_user_id ON prompt_comments(user_id);
CREATE INDEX idx_prompt_comments_parent ON prompt_comments(parent_comment_id);

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
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (examples - adjust based on requirements)
-- Users can view their own prompts + public prompts
CREATE POLICY "Users can view own prompts" ON prompts
    FOR SELECT USING (auth.uid() = user_id OR visibility = 'public');

-- Users can insert their own prompts
CREATE POLICY "Users can insert own prompts" ON prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own prompts
CREATE POLICY "Users can update own prompts" ON prompts
    FOR UPDATE USING (auth.uid() = user_id);

-- Similar policies for other tables...
```

---

## 3. Implementation Phases

### Phase 1: Foundation & Core Prompt Library (Weeks 1-3)

**Goal:** Build the core prompt management system with versioning and execution.

#### Week 1: Database & Backend Foundation

**Tasks:**
1. ✅ Review existing `prompt_templates` table schema
2. ⬜ Create migration script for new tables (`prompts`, `prompt_versions`, `executions`)
3. ⬜ Set up RLS policies
4. ⬜ Create Edge Functions:
   - `prompts` (CRUD - extend existing `prompt-builder`)
   - `prompt-versions` (version management)
   - `execute-prompt` (execution with logging)
   - `executions` (list executions, get execution details)

**Deliverables:**
- Database migration files
- Edge Functions deployed
- API documentation

#### Week 2: Frontend Prompt Library

**Tasks:**
1. ⬜ Create `PromptLibrary` page component
2. ⬜ Create `PromptCard` component (for list view)
3. ⬜ Create `PromptDetail` page (editor + metadata)
4. ⬜ Integrate with existing `PromptBuilder` component
5. ⬜ Add search and filter functionality
6. ⬜ Create `PromptVersionHistory` component

**Deliverables:**
- Prompt library UI
- Prompt detail/editor page
- Version history sidebar

#### Week 3: Execution & Logging

**Tasks:**
1. ⬜ Create `PromptExecutor` component
2. ⬜ Build parameter form generator (from `{{placeholders}}`)
3. ⬜ Create `ExecutionView` component (shows response)
4. ⬜ Add feedback controls (rating, success/fail)
5. ⬜ Create `ExecutionHistory` component
6. ⬜ Integrate with existing LLM providers (OpenAI, Anthropic, etc.)

**Deliverables:**
- Execution interface
- Response display with feedback
- Execution history view

---

### Phase 2: Analytics & Intelligence (Weeks 4-5)

**Goal:** Add analytics dashboard and prompt performance tracking.

#### Week 4: Analytics Backend

**Tasks:**
1. ⬜ Create `analytics` Edge Function
2. ⬜ Build aggregation queries:
   - Total runs per prompt
   - Success rate calculation
   - Average rating
   - Token usage statistics
   - Time-series data (runs per day/week)
3. ⬜ Create caching layer for analytics (Redis or Supabase cache)

**Deliverables:**
- Analytics API endpoints
- Aggregation functions

#### Week 5: Analytics Frontend

**Tasks:**
1. ⬜ Create `AnalyticsDashboard` page
2. ⬜ Build chart components (using Chart.js or Recharts):
   - Runs over time
   - Success rate trends
   - Top performing prompts
   - Model usage distribution
3. ⬜ Create `PromptAnalytics` component (per-prompt stats)
4. ⬜ Add export functionality (CSV, JSON)

**Deliverables:**
- Analytics dashboard
- Charts and visualizations
- Export functionality

---

### Phase 3: Packs & Organization (Week 6)

**Goal:** Enable users to bundle prompts into packs.

#### Week 6: Prompt Packs

**Tasks:**
1. ⬜ Create `PackManager` page
2. ⬜ Build `PackEditor` component (drag & drop prompt ordering)
3. ⬜ Create pack CRUD Edge Functions
4. ⬜ Implement export/import (JSON format)
5. ⬜ Add pack sharing (public links)

**Deliverables:**
- Pack management UI
- Export/import functionality
- Pack sharing

---

### Phase 4: AI Chat Integration (Week 7)

**Goal:** Add AI chat for prompt refinement.

#### Week 7: AI Chat

**Tasks:**
1. ⬜ Extend existing `ChatInterface` component
2. ⬜ Create `PromptRefinementChat` component (docked panel)
3. ⬜ Add context injection (current prompt content)
4. ⬜ Build "Apply to Editor" functionality
5. ⬜ Add "Save as New Version" from chat suggestions

**Deliverables:**
- AI chat panel
- Prompt refinement workflow
- Version creation from chat

---

### Phase 5: Polish & Optimization (Week 8)

**Goal:** Performance optimization, UX improvements, testing.

#### Week 8: Polish

**Tasks:**
1. ⬜ Performance optimization (lazy loading, code splitting)
2. ⬜ Add loading states and error handling
3. ⬜ Implement autosave for prompt editor
4. ⬜ Add keyboard shortcuts
5. ⬜ Write unit tests for critical components
6. ⬜ E2E testing for core flows

**Deliverables:**
- Optimized performance
- Comprehensive error handling
- Test coverage

---

### Phase 6: Extended Features (v2 - Weeks 9+)

**Goal:** Collaboration, apps, marketplace.

#### Weeks 9-10: Collaboration & Apps

**Tasks:**
1. ⬜ Workspace management UI
2. ⬜ Team member invitations
3. ⬜ Comments system
4. ⬜ Prompt → App builder
5. ⬜ Public app URLs

**Deliverables:**
- Team collaboration features
- Prompt apps functionality

---

## 4. Technical Architecture

### 4.1 Frontend Structure

```
frontend/src/
├── pages/
│   ├── PromptLibrary.tsx          # Main library view
│   ├── PromptDetail.tsx            # Prompt editor/detail
│   ├── PromptAnalytics.tsx         # Analytics dashboard
│   ├── PromptPacks.tsx             # Pack management
│   └── PromptApp.tsx               # App runtime (v2)
│
├── components/
│   ├── prompts/
│   │   ├── PromptCard.tsx          # Library card
│   │   ├── PromptEditor.tsx        # Enhanced editor
│   │   ├── PromptExecutor.tsx      # Execution interface
│   │   ├── ExecutionView.tsx        # Response display
│   │   ├── ExecutionHistory.tsx     # History list
│   │   ├── VersionHistory.tsx       # Version sidebar
│   │   ├── PromptRefinementChat.tsx # AI chat panel
│   │   └── ParameterForm.tsx        # Dynamic form generator
│   │
│   ├── packs/
│   │   ├── PackCard.tsx
│   │   ├── PackEditor.tsx
│   │   └── PackImportExport.tsx
│   │
│   ├── analytics/
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── PromptStats.tsx
│   │   └── Charts/
│   │       ├── RunsOverTime.tsx
│   │       ├── SuccessRate.tsx
│   │       └── TopPrompts.tsx
│   │
│   └── apps/ (v2)
│       ├── AppBuilder.tsx
│       └── AppRuntime.tsx
│
├── hooks/
│   ├── usePrompts.ts               # Prompt CRUD
│   ├── usePromptVersions.ts        # Version management
│   ├── useExecutions.ts            # Execution logging
│   ├── useAnalytics.ts             # Analytics data
│   └── usePacks.ts                 # Pack management
│
├── services/
│   ├── promptService.ts            # API client (extend existing)
│   ├── executionService.ts         # Execution API
│   └── analyticsService.ts         # Analytics API
│
└── types/
    ├── prompt.ts                   # Prompt types (extend existing)
    ├── execution.ts                # Execution types
    ├── pack.ts                     # Pack types
    └── analytics.ts                # Analytics types
```

### 4.2 Backend Structure

```
supabase/functions/
├── prompts/
│   ├── index.ts                    # CRUD (extend existing prompt-builder)
│   ├── versions.ts                 # Version management
│   └── execute.ts                  # Execution endpoint
│
├── executions/
│   ├── index.ts                    # List executions
│   ├── feedback.ts                 # Update feedback
│   └── detail.ts                   # Get execution details
│
├── packs/
│   ├── index.ts                    # Pack CRUD
│   ├── export.ts                   # Export pack
│   └── import.ts                   # Import pack
│
├── analytics/
│   ├── overview.ts                 # Overall analytics
│   └── prompt.ts                   # Per-prompt analytics
│
└── apps/ (v2)
    ├── index.ts                    # App CRUD
    └── execute.ts                  # App execution
```

---

## 5. Integration with Existing System

### 5.1 Reuse Existing Components

**PromptBuilder Component:**
- ✅ Keep existing `PromptBuilder` for structured prompts
- ⬜ Add "Simple Mode" for plain text prompts with `{{placeholders}}`
- ⬜ Integrate with new prompt library

**ChatInterface:**
- ✅ Adapt for prompt refinement chat
- ⬜ Add prompt context injection
- ⬜ Add "Apply to Editor" button

**TemplateEditor:**
- ✅ Can be used for prompt editing
- ⬜ Extend to support placeholders

### 5.2 Extend Existing Functions

**prompt-builder Edge Function:**
- ✅ Already has CRUD operations
- ⬜ Add versioning support
- ⬜ Add tag/category management
- ⬜ Add visibility controls

**test-prompt Edge Function:**
- ✅ Already executes prompts
- ⬜ Extend to log executions
- ⬜ Add feedback collection
- ⬜ Add token/cost tracking

### 5.3 New Components Needed

**Must Build:**
1. PromptLibrary page (list view with search/filter)
2. PromptDetail page (editor + metadata + versions)
3. PromptExecutor component (parameter form + execution)
4. ExecutionView component (response display)
5. AnalyticsDashboard page
6. PackManager page

**Can Adapt:**
1. ChatInterface → PromptRefinementChat
2. TemplateEditor → PromptEditor
3. GitHubAnalyzer archive → PromptLibrary (similar patterns)

---

## 6. API Design

### 6.1 Prompt Management API

```typescript
// GET /prompts
// Query params: search, tags, category, visibility, page, limit
GET /functions/v1/prompts?search=blog&tags=writing,seo&page=1&limit=20

// POST /prompts
POST /functions/v1/prompts
Body: {
  title: string,
  description?: string,
  prompt_body: string,
  system_message?: string,
  category?: string,
  tags?: string[],
  visibility?: 'private' | 'team' | 'public'
}

// GET /prompts/:id
GET /functions/v1/prompts/:id

// PUT /prompts/:id
PUT /functions/v1/prompts/:id

// DELETE /prompts/:id
DELETE /functions/v1/prompts/:id

// POST /prompts/:id/versions (create new version)
POST /functions/v1/prompts/:id/versions
Body: {
  prompt_body: string,
  changelog?: string
}

// GET /prompts/:id/versions
GET /functions/v1/prompts/:id/versions
```

### 6.2 Execution API

```typescript
// POST /prompts/:id/execute
POST /functions/v1/prompts/:id/execute
Body: {
  prompt_version_id?: string, // Optional, uses current if not specified
  parameters: { [key: string]: any }, // Values for {{placeholders}}
  model_provider: 'openai' | 'anthropic' | 'openrouter',
  model_name: string,
  temperature?: number,
  max_tokens?: number,
  system_message?: string
}

// GET /prompts/:id/executions
GET /functions/v1/prompts/:id/executions?page=1&limit=20&filter=successful

// GET /executions/:id
GET /functions/v1/executions/:id

// POST /executions/:id/feedback
POST /functions/v1/executions/:id/feedback
Body: {
  rating?: 1-5,
  feedback?: string,
  marked_successful?: boolean
}
```

### 6.3 Analytics API

```typescript
// GET /analytics/overview
GET /functions/v1/analytics/overview?timeframe=7d

// GET /analytics/prompts/:id
GET /functions/v1/analytics/prompts/:id?timeframe=30d
```

### 6.4 Packs API

```typescript
// GET /packs
GET /functions/v1/packs

// POST /packs
POST /functions/v1/packs
Body: {
  title: string,
  description?: string,
  prompt_ids: string[], // Ordered list
  tags?: string[]
}

// GET /packs/:id
GET /functions/v1/packs/:id

// PUT /packs/:id
PUT /functions/v1/packs/:id

// POST /packs/:id/export
POST /functions/v1/packs/:id/export

// POST /packs/import
POST /functions/v1/packs/import
Body: { pack_data: JSON }
```

---

## 7. Detailed Task Breakdown

### Phase 1.1: Database Setup (Days 1-2)

**Task 1.1.1: Create Migration Script**
- [ ] Create `supabase/migrations/YYYYMMDDHHMMSS_create_prompt_system.sql`
- [ ] Include all table definitions
- [ ] Add indexes
- [ ] Set up RLS policies
- [ ] Test migration on local Supabase

**Task 1.1.2: Migrate Existing Data**
- [ ] Check if `prompt_templates` table has data
- [ ] Create migration script to move data to new `prompts` table
- [ ] Preserve user associations

**Task 1.1.3: Verify Schema**
- [ ] Run migration
- [ ] Verify all tables created
- [ ] Test RLS policies
- [ ] Document schema

### Phase 1.2: Backend API (Days 3-5)

**Task 1.2.1: Extend Prompt Builder Function**
- [ ] Review existing `prompt-builder/index.ts`
- [ ] Add versioning endpoints
- [ ] Add tag/category support
- [ ] Add visibility controls
- [ ] Test all endpoints

**Task 1.2.2: Create Execution Function**
- [ ] Create `supabase/functions/execute-prompt/index.ts`
- [ ] Parse `{{placeholders}}` from prompt body
- [ ] Generate parameter form schema
- [ ] Execute prompt with LLM provider
- [ ] Log execution to database
- [ ] Return response + execution_id

**Task 1.2.3: Create Executions List Function**
- [ ] Create `supabase/functions/executions/index.ts`
- [ ] List executions with filters
- [ ] Support pagination
- [ ] Include prompt metadata

**Task 1.2.4: Create Feedback Function**
- [ ] Create `supabase/functions/executions/feedback.ts`
- [ ] Update execution with rating/feedback
- [ ] Validate input

### Phase 1.3: Frontend Library (Days 6-10)

**Task 1.3.1: Create Prompt Library Page**
- [ ] Create `frontend/src/pages/PromptLibrary.tsx`
- [ ] Add route in router
- [ ] Create `PromptCard` component
- [ ] Implement list/grid view toggle
- [ ] Add search bar
- [ ] Add filter sidebar (tags, category, date)

**Task 1.3.2: Create Prompt Detail Page**
- [ ] Create `frontend/src/pages/PromptDetail.tsx`
- [ ] Integrate `PromptBuilder` component
- [ ] Add metadata panel (tags, category, visibility)
- [ ] Add version history sidebar
- [ ] Add save/duplicate/delete actions

**Task 1.3.3: Create Execution Interface**
- [ ] Create `PromptExecutor` component
- [ ] Build `ParameterForm` component (dynamic form from placeholders)
- [ ] Add model/provider selector
- [ ] Add temperature/max_tokens controls
- [ ] Add execute button
- [ ] Show loading state

**Task 1.3.4: Create Execution View**
- [ ] Create `ExecutionView` component
- [ ] Display response (markdown rendering)
- [ ] Add copy button
- [ ] Add feedback controls (rating, success/fail)
- [ ] Show execution metadata (tokens, latency, cost)

**Task 1.3.5: Create Execution History**
- [ ] Create `ExecutionHistory` component
- [ ] List executions for a prompt
- [ ] Add filters (date, success, rating)
- [ ] Click to view execution details
- [ ] Add pagination

### Phase 1.4: Version Management (Days 11-12)

**Task 1.4.1: Version History Component**
- [ ] Create `VersionHistory` sidebar component
- [ ] List all versions with timestamps
- [ ] Show changelog
- [ ] Add "View Version" button
- [ ] Add "Promote to Current" button

**Task 1.4.2: Version Creation**
- [ ] Add "Save as New Version" button in editor
- [ ] Show changelog input modal
- [ ] Create version via API
- [ ] Update UI after creation

**Task 1.4.3: Version Comparison (Optional)**
- [ ] Create `VersionComparison` component
- [ ] Side-by-side diff view
- [ ] Highlight changes

---

## 8. Key Implementation Details

### 8.1 Placeholder Parsing

```typescript
// Extract placeholders from prompt body
function extractPlaceholders(promptBody: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = [...promptBody.matchAll(regex)];
  return [...new Set(matches.map(m => m[1]))];
}

// Generate form schema
function generateFormSchema(placeholders: string[]): FormField[] {
  return placeholders.map(name => ({
    name,
    label: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: 'text',
    required: true
  }));
}

// Replace placeholders with values
function replacePlaceholders(promptBody: string, parameters: Record<string, string>): string {
  return promptBody.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return parameters[key] || match;
  });
}
```

### 8.2 Execution Logging

```typescript
// After LLM execution
const execution = {
  prompt_id,
  prompt_version_id,
  user_id,
  input_parameters: parameters,
  model_provider,
  model_name,
  temperature,
  max_tokens,
  response_text: response.substring(0, 100000), // Truncate if needed
  response_stored: response.length > 100000,
  tokens_input: usage.prompt_tokens,
  tokens_output: usage.completion_tokens,
  tokens_total: usage.total_tokens,
  latency_ms: Date.now() - startTime,
  cost_usd: calculateCost(usage, model)
};

// Store in executions table
// If response_stored = true, also store in executions_data
```

### 8.3 Analytics Aggregation

```sql
-- Success rate per prompt
SELECT 
  prompt_id,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE marked_successful = true) as successful_runs,
  ROUND(
    COUNT(*) FILTER (WHERE marked_successful = true)::numeric / COUNT(*)::numeric * 100,
    2
  ) as success_rate,
  AVG(user_rating) as avg_rating,
  SUM(tokens_total) as total_tokens
FROM executions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY prompt_id
ORDER BY success_rate DESC;
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

- [ ] Prompt placeholder parsing
- [ ] Form schema generation
- [ ] Version comparison logic
- [ ] Analytics calculations

### 9.2 Integration Tests

- [ ] Prompt CRUD operations
- [ ] Execution flow end-to-end
- [ ] Version creation and promotion
- [ ] Pack import/export

### 9.3 E2E Tests

- [ ] Create prompt → Execute → Provide feedback
- [ ] Create version → Compare → Promote
- [ ] Create pack → Export → Import

---

## 10. Migration from Existing System

### 10.1 Data Migration

If `prompt_templates` table exists:

```sql
-- Migrate existing prompts
INSERT INTO prompts (
  id, user_id, title, description, prompt_body,
  category, tags, created_at, updated_at
)
SELECT 
  id,
  user_id,
  name as title,
  description,
  plain_text_preview as prompt_body,
  mode as category,
  ARRAY[]::TEXT[] as tags,
  created_at,
  updated_at
FROM prompt_templates;

-- Create initial versions
INSERT INTO prompt_versions (
  prompt_id, version_number, prompt_body, is_current, created_at
)
SELECT 
  id,
  1,
  plain_text_preview,
  true,
  created_at
FROM prompt_templates;
```

### 10.2 Component Migration

- Keep existing `PromptBuilder` component
- Add new wrapper components around it
- Gradually migrate to new data model
- Maintain backward compatibility during transition

---

## 11. Success Metrics & Monitoring

### 11.1 Key Metrics

- **Activation:** % users with ≥5 prompts, ≥10 executions in 7 days
- **Retention:** 30-day retained users
- **Engagement:** Avg weekly executions per user
- **Quality:** Success rate per prompt

### 11.2 Monitoring

- Track API response times
- Monitor execution success rates
- Alert on high error rates
- Track token usage and costs

---

## 12. Risk Mitigation

### 12.1 Technical Risks

**Risk:** Large execution responses exceed database limits
**Mitigation:** Store >100KB responses in separate `executions_data` table

**Risk:** High token costs from frequent executions
**Mitigation:** Add rate limiting, cost alerts, usage quotas

**Risk:** Performance issues with large prompt libraries
**Mitigation:** Implement pagination, caching, database indexes

### 12.2 Product Risks

**Risk:** Users don't understand versioning
**Mitigation:** Clear UI, onboarding tutorial, tooltips

**Risk:** Low adoption of analytics
**Mitigation:** Make analytics visible by default, show insights proactively

---

## 13. Next Steps

### Immediate Actions (This Week)

1. ✅ Review this plan
2. ⬜ Create database migration script
3. ⬜ Set up development branch
4. ⬜ Create initial task tickets/issues

### Week 1 Deliverables

- [ ] Database schema deployed
- [ ] Edge Functions skeleton created
- [ ] Frontend routing structure
- [ ] Basic PromptLibrary page

---

## 14. Dependencies & Prerequisites

### Required

- ✅ Supabase project with database access
- ✅ Existing authentication system
- ✅ LLM provider API keys (OpenAI, Anthropic, etc.)
- ✅ Frontend build system (Vite)

### Optional (for v2)

- Redis for caching (or Supabase cache)
- Stripe for billing
- Email service for notifications

---

## 15. Estimated Effort

### Phase 1 (MVP Core): 3 weeks
- Database: 2 days
- Backend APIs: 5 days
- Frontend Library: 7 days
- Execution System: 4 days
- Testing & Polish: 2 days

### Phase 2 (Analytics): 2 weeks
- Backend Analytics: 3 days
- Frontend Dashboard: 5 days
- Charts & Visualizations: 2 days

### Phase 3 (Packs): 1 week
- Backend: 2 days
- Frontend: 3 days

### Phase 4 (AI Chat): 1 week
- Integration: 3 days
- UX Polish: 2 days

**Total MVP:** 7 weeks  
**With v2 Features:** 10+ weeks

---

This plan provides a comprehensive roadmap for building PromptForge. Each phase builds on the previous one, and we can adjust scope based on priorities.
