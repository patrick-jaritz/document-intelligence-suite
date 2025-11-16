# PromptForge Quick Start Guide

## Overview

This guide provides a quick reference for implementing PromptForge, a comprehensive prompt management system integrated into the Document Intelligence Suite.

## Current State

### ✅ What Exists
- **PromptBuilder Component**: Structured prompt editor (role, task, context, constraints, examples)
- **Prompt API**: Basic CRUD via `prompt-builder` Edge Function
- **Test Prompt**: Execution via `test-prompt` Edge Function (OpenRouter)
- **Database**: `prompt_templates` table (needs migration to new schema)

### ❌ What's Missing
- Prompt versioning system
- Execution logging and feedback
- Analytics dashboard
- Prompt packs
- AI chat integration for refinement
- Prompt apps (v2)

## Implementation Priority

### Phase 1: Core (Weeks 1-3) 🔴 HIGH PRIORITY
1. **Database Migration** (2 days)
   - Create new tables: `prompts`, `prompt_versions`, `executions`
   - Migrate existing `prompt_templates` data
   - Set up RLS policies

2. **Backend APIs** (5 days)
   - Extend `prompt-builder` function for versioning
   - Create `execute-prompt` function with logging
   - Create `executions` function for history

3. **Frontend Library** (7 days)
   - `PromptLibrary` page (list view)
   - `PromptDetail` page (editor + metadata)
   - `PromptExecutor` component (parameter form + execution)
   - `ExecutionView` component (response + feedback)

### Phase 2: Analytics (Weeks 4-5) 🟡 MEDIUM PRIORITY
- Analytics backend aggregation
- Dashboard with charts
- Per-prompt statistics

### Phase 3: Packs (Week 6) 🟡 MEDIUM PRIORITY
- Pack CRUD operations
- Export/import functionality
- Pack sharing

### Phase 4: AI Chat (Week 7) 🟢 LOW PRIORITY
- Integrate chat for prompt refinement
- Apply suggestions to editor

## Key Technical Decisions

### Database Schema
- **prompts**: Main table (extends existing structure)
- **prompt_versions**: Version history with changelog
- **executions**: Log all runs with parameters, response, feedback
- **executions_data**: Large responses (>100KB) stored separately

### Placeholder System
- Use `{{variable_name}}` syntax in prompt body
- Auto-generate form fields from placeholders
- Replace placeholders before execution

### Versioning Strategy
- Each prompt has a `current_version_id`
- New versions create entries in `prompt_versions`
- Users can promote any version to current
- Versions preserve full prompt body snapshot

### Execution Flow
1. User selects prompt
2. System extracts `{{placeholders}}`
3. Form generated with input fields
4. User fills parameters
5. Prompt executed via LLM provider
6. Response logged to `executions` table
7. User provides feedback (rating, success/fail)

## File Structure

### New Files to Create

```
frontend/src/
├── pages/
│   ├── PromptLibrary.tsx          # NEW
│   ├── PromptDetail.tsx            # NEW
│   └── PromptAnalytics.tsx         # NEW (Phase 2)
│
├── components/
│   ├── prompts/
│   │   ├── PromptCard.tsx          # NEW
│   │   ├── PromptExecutor.tsx      # NEW
│   │   ├── ExecutionView.tsx       # NEW
│   │   ├── ExecutionHistory.tsx    # NEW
│   │   └── VersionHistory.tsx      # NEW
│   └── analytics/                  # NEW (Phase 2)
│       └── AnalyticsDashboard.tsx
│
├── hooks/
│   ├── usePrompts.ts               # NEW
│   ├── useExecutions.ts            # NEW
│   └── useAnalytics.ts             # NEW (Phase 2)
│
└── services/
    ├── executionService.ts         # NEW
    └── analyticsService.ts         # NEW (Phase 2)

supabase/
├── migrations/
│   └── YYYYMMDDHHMMSS_create_prompt_system.sql  # NEW
│
└── functions/
    ├── execute-prompt/              # NEW
    │   └── index.ts
    ├── executions/                 # NEW
    │   └── index.ts
    └── analytics/                  # NEW (Phase 2)
        └── index.ts
```

## API Endpoints

### Prompts
- `GET /prompts` - List prompts (with filters)
- `POST /prompts` - Create prompt
- `GET /prompts/:id` - Get prompt
- `PUT /prompts/:id` - Update prompt
- `DELETE /prompts/:id` - Delete prompt
- `POST /prompts/:id/versions` - Create version
- `GET /prompts/:id/versions` - List versions

### Executions
- `POST /prompts/:id/execute` - Execute prompt
- `GET /prompts/:id/executions` - List executions
- `GET /executions/:id` - Get execution details
- `POST /executions/:id/feedback` - Update feedback

### Analytics (Phase 2)
- `GET /analytics/overview` - Overall stats
- `GET /analytics/prompts/:id` - Per-prompt stats

## Quick Implementation Checklist

### Week 1
- [ ] Create database migration script
- [ ] Run migration on local Supabase
- [ ] Create `execute-prompt` Edge Function
- [ ] Create `executions` Edge Function
- [ ] Test backend APIs

### Week 2
- [ ] Create `PromptLibrary` page
- [ ] Create `PromptCard` component
- [ ] Create `PromptDetail` page
- [ ] Integrate with existing `PromptBuilder`
- [ ] Add search and filters

### Week 3
- [ ] Create `PromptExecutor` component
- [ ] Build placeholder parser
- [ ] Create dynamic parameter form
- [ ] Create `ExecutionView` component
- [ ] Add feedback controls
- [ ] Create `ExecutionHistory` component

## Testing Strategy

### Unit Tests
- Placeholder extraction
- Form schema generation
- Version comparison

### Integration Tests
- Prompt CRUD flow
- Execution end-to-end
- Version creation

### E2E Tests
- Create → Execute → Feedback flow
- Version management flow

## Migration Path

### Step 1: Database
```sql
-- Run migration script
-- Migrate existing prompt_templates data
-- Verify schema
```

### Step 2: Backend
- Extend existing Edge Functions
- Add new execution endpoints
- Test all APIs

### Step 3: Frontend
- Create new pages/components
- Integrate with existing components
- Add routing

### Step 4: Testing
- Test all flows
- Fix bugs
- Performance optimization

## Success Criteria

### MVP Complete When:
- ✅ Users can create/edit prompts
- ✅ Users can execute prompts with parameters
- ✅ Executions are logged with feedback
- ✅ Version history is visible
- ✅ Basic search/filter works

### Phase 2 Complete When:
- ✅ Analytics dashboard shows metrics
- ✅ Charts display trends
- ✅ Per-prompt analytics available

## Next Steps

1. **Review** the detailed plan (`PROMPTFORGE_INTEGRATION_PLAN.md`)
2. **Create** database migration script
3. **Set up** development branch
4. **Start** with Phase 1, Week 1 tasks

## Questions?

Refer to the detailed integration plan for:
- Complete database schema
- Detailed API specifications
- Component architecture
- Testing strategies
- Risk mitigation
