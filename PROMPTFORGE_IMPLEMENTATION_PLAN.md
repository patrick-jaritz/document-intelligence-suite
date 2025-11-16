# PromptForge Implementation Plan

**Status**: Planning Phase  
**Based on**: Full Product Spec provided  
**Current State**: Basic PromptBuilder component exists, needs full system build

---

## Current Implementation Status

### ✅ What Exists
- Basic `prompt_templates` table (Supabase)
- `PromptBuilder` component (form builder UI)
- `promptService.ts` (basic CRUD operations)
- PromptForge button in mode selector (just added)

### ❌ What's Missing (from spec)
- Prompt versioning system
- Execution tracking & logging
- Analytics dashboard
- Prompt packs
- AI chat integration
- Workspace/team management
- Sharing & collaboration
- Prompt → App converter
- Full library UI with search/filters

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

#### 1.1 Database Schema Design
**Priority**: Critical  
**Tasks**:
- [ ] Design `prompts` table (enhanced from `prompt_templates`)
- [ ] Create `prompt_versions` table
- [ ] Create `executions` table
- [ ] Create `packs` table
- [ ] Create `pack_prompts` junction table
- [ ] Create `workspaces` table (if multi-tenant)
- [ ] Create `workspace_members` table
- [ ] Add indexes for performance
- [ ] Set up RLS policies

**Files to Create**:
- `supabase/migrations/YYYYMMDD_create_promptforge_tables.sql`

#### 1.2 Core Types & Interfaces
**Priority**: Critical  
**Tasks**:
- [ ] Define TypeScript types for all entities
- [ ] Create type definitions file
- [ ] Update existing prompt types

**Files to Update**:
- `frontend/src/types/prompt.ts` (extend)
- `frontend/src/types/promptforge.ts` (new)

---

### Phase 2: Prompt Library (Week 2-3)

#### 2.1 Library UI Components
**Priority**: High  
**Tasks**:
- [ ] Create `PromptLibrary` page component
- [ ] Build prompt card/list view
- [ ] Add search functionality
- [ ] Add filter by tags/category
- [ ] Add sort options (date, usage, success rate)
- [ ] Add pagination

**Files to Create**:
- `frontend/src/pages/PromptLibrary.tsx`
- `frontend/src/components/PromptLibrary/PromptCard.tsx`
- `frontend/src/components/PromptLibrary/PromptFilters.tsx`
- `frontend/src/components/PromptLibrary/PromptSearch.tsx`

#### 2.2 Prompt CRUD Enhancement
**Priority**: High  
**Tasks**:
- [ ] Enhance `promptService.ts` with new operations
- [ ] Add versioning methods
- [ ] Add tagging/categorization
- [ ] Add duplicate functionality
- [ ] Add archive/delete with soft delete

**Files to Update**:
- `frontend/src/services/promptService.ts`
- `frontend/src/services/promptVersionService.ts` (new)

#### 2.3 Prompt Editor Enhancement
**Priority**: High  
**Tasks**:
- [ ] Add version history sidebar
- [ ] Add "Save as new version" button
- [ ] Add changelog input
- [ ] Add tag/category editor
- [ ] Add visibility settings (private/team/public)
- [ ] Add autosave functionality

**Files to Update**:
- `frontend/src/components/PromptBuilder/PromptBuilder.tsx`
- `frontend/src/components/PromptBuilder/VersionHistory.tsx` (new)

---

### Phase 3: Execution & Tracking (Week 3-4)

#### 3.1 Execution Service
**Priority**: High  
**Tasks**:
- [ ] Create execution service
- [ ] Build execution API endpoints (Supabase functions)
- [ ] Add parameter extraction from placeholders
- [ ] Add execution logging
- [ ] Add user feedback collection

**Files to Create**:
- `frontend/src/services/executionService.ts`
- `supabase/functions/execute-prompt/index.ts`

#### 3.2 Execution UI
**Priority**: High  
**Tasks**:
- [ ] Build parameter form generator
- [ ] Create execution view component
- [ ] Add response display with formatting
- [ ] Add feedback controls (thumbs up/down, rating)
- [ ] Add "Save as new version" from execution
- [ ] Add execution history panel

**Files to Create**:
- `frontend/src/components/PromptExecution/ExecutionPanel.tsx`
- `frontend/src/components/PromptExecution/ParameterForm.tsx`
- `frontend/src/components/PromptExecution/ExecutionHistory.tsx`

---

### Phase 4: Analytics (Week 4-5)

#### 4.1 Analytics Service
**Priority**: Medium  
**Tasks**:
- [ ] Create analytics service
- [ ] Build analytics API endpoints
- [ ] Calculate success rates
- [ ] Track usage metrics
- [ ] Generate time-series data

**Files to Create**:
- `frontend/src/services/analyticsService.ts`
- `supabase/functions/get-prompt-analytics/index.ts`

#### 4.2 Analytics Dashboard
**Priority**: Medium  
**Tasks**:
- [ ] Create analytics page
- [ ] Build overview cards (total runs, success rate, etc.)
- [ ] Add charts (runs over time, model usage)
- [ ] Add prompt performance table
- [ ] Add drill-down to individual prompt analytics

**Files to Create**:
- `frontend/src/pages/Analytics.tsx`
- `frontend/src/components/Analytics/OverviewCards.tsx`
- `frontend/src/components/Analytics/UsageChart.tsx`
- `frontend/src/components/Analytics/PromptPerformanceTable.tsx`

---

### Phase 5: Prompt Packs (Week 5-6)

#### 5.1 Pack Service
**Priority**: Medium  
**Tasks**:
- [ ] Create pack service
- [ ] Build pack CRUD operations
- [ ] Add export to JSON functionality
- [ ] Add import from JSON functionality
- [ ] Handle duplicate IDs on import

**Files to Create**:
- `frontend/src/services/packService.ts`
- `supabase/functions/export-pack/index.ts`
- `supabase/functions/import-pack/index.ts`

#### 5.2 Pack UI
**Priority**: Medium  
**Tasks**:
- [ ] Create packs page
- [ ] Build pack list view
- [ ] Add pack editor (add/remove/reorder prompts)
- [ ] Add drag-and-drop reordering
- [ ] Add export/import buttons
- [ ] Add pack detail view

**Files to Create**:
- `frontend/src/pages/Packs.tsx`
- `frontend/src/components/Packs/PackEditor.tsx`
- `frontend/src/components/Packs/PackPromptList.tsx`

---

### Phase 6: AI Chat Integration (Week 6-7)

#### 6.1 Chat Service
**Priority**: Medium  
**Tasks**:
- [ ] Create chat service
- [ ] Integrate with LLM APIs
- [ ] Add context injection (current prompt)
- [ ] Handle streaming responses

**Files to Create**:
- `frontend/src/services/chatService.ts`

#### 6.2 Chat UI
**Priority**: Medium  
**Tasks**:
- [ ] Create docked chat panel component
- [ ] Add to prompt editor page
- [ ] Add "Improve prompt" suggestions
- [ ] Add "Generate variants" feature
- [ ] Add "Replace" and "Add as version" actions

**Files to Create**:
- `frontend/src/components/PromptChat/ChatPanel.tsx`
- `frontend/src/components/PromptChat/ChatMessage.tsx`

---

### Phase 7: Prompt → App Converter (Week 7-8) - v2 Feature

#### 7.1 App Builder
**Priority**: Low (v2)  
**Tasks**:
- [ ] Create app entity/service
- [ ] Build form field builder UI
- [ ] Add field type selection
- [ ] Add field configuration
- [ ] Generate app schema

**Files to Create**:
- `frontend/src/services/appService.ts`
- `frontend/src/components/AppBuilder/FormFieldBuilder.tsx`

#### 7.2 App Runtime
**Priority**: Low (v2)  
**Tasks**:
- [ ] Create app runtime page
- [ ] Build dynamic form renderer
- [ ] Add execution with app context
- [ ] Add result display
- [ ] Add public/private access control

**Files to Create**:
- `frontend/src/pages/AppRuntime.tsx`
- `frontend/src/components/AppRuntime/DynamicForm.tsx`

---

## Database Schema Design

### Core Tables

```sql
-- Enhanced prompts table
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  prompt_body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  owner_id UUID REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
  current_version_id UUID REFERENCES prompt_versions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- Prompt versions
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  prompt_body TEXT NOT NULL,
  changelog TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_current BOOLEAN DEFAULT FALSE
);

-- Executions
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID REFERENCES prompts(id),
  prompt_version_id UUID REFERENCES prompt_versions(id),
  user_id UUID REFERENCES auth.users(id),
  inputs JSONB,
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

-- Packs
CREATE TABLE packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  owner_id UUID REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  visibility TEXT DEFAULT 'private',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pack prompts (junction)
CREATE TABLE pack_prompts (
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  PRIMARY KEY (pack_id, prompt_id)
);

-- Workspaces (optional, for multi-tenant)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);
```

---

## File Structure

```
frontend/src/
├── pages/
│   ├── PromptLibrary.tsx          # Main library view
│   ├── Analytics.tsx               # Analytics dashboard
│   ├── Packs.tsx                   # Prompt packs page
│   └── AppRuntime.tsx              # App runtime (v2)
├── components/
│   ├── PromptLibrary/              # Library components
│   │   ├── PromptCard.tsx
│   │   ├── PromptFilters.tsx
│   │   └── PromptSearch.tsx
│   ├── PromptExecution/            # Execution components
│   │   ├── ExecutionPanel.tsx
│   │   ├── ParameterForm.tsx
│   │   └── ExecutionHistory.tsx
│   ├── PromptBuilder/              # Existing, enhance
│   │   ├── VersionHistory.tsx      # New
│   │   └── ...
│   ├── PromptChat/                 # AI chat
│   │   ├── ChatPanel.tsx
│   │   └── ChatMessage.tsx
│   ├── Analytics/                  # Analytics components
│   │   ├── OverviewCards.tsx
│   │   ├── UsageChart.tsx
│   │   └── PromptPerformanceTable.tsx
│   └── Packs/                      # Pack components
│       ├── PackEditor.tsx
│       └── PackPromptList.tsx
├── services/
│   ├── promptService.ts            # Enhance existing
│   ├── promptVersionService.ts     # New
│   ├── executionService.ts          # New
│   ├── analyticsService.ts          # New
│   ├── packService.ts              # New
│   ├── chatService.ts              # New
│   └── appService.ts               # New (v2)
└── types/
    ├── prompt.ts                   # Enhance existing
    └── promptforge.ts               # New
```

---

## Next Steps

1. **Start with Phase 1**: Database schema design
2. **Create migration file** for all tables
3. **Set up RLS policies** for security
4. **Build Phase 2**: Prompt Library UI (most visible feature)
5. **Iterate**: Add features based on user feedback

---

## Questions to Resolve

1. **Workspaces**: Do we need multi-tenant workspaces in MVP, or single-user first?
2. **Authentication**: Use existing Supabase auth or add workspace-level auth?
3. **API Keys**: Store user API keys encrypted, or use server-side keys?
4. **Pricing**: Free tier limits? (runs per month, prompts per workspace)
5. **Public Sharing**: Enable in MVP or v2?

---

**Ready to start implementation?** Begin with Phase 1 (Database Schema) → Phase 2 (Library UI)
