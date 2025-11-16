# TODO List

**Generated**: 2025-01-31  
**Branch**: `cursor/show-todo-list-f6b3`

---

## 🔴 High Priority - Core Features

### Prompt Builder
- [ ] **Backend Edge Function** (`supabase/functions/prompt-builder/index.ts`)
  - Create CRUD operations for prompts
  - GET / - List prompts
  - POST / - Create prompt
  - PUT /:id - Update prompt
  - DELETE /:id - Delete prompt
  - **Location**: `PROMPT_BUILDER_IMPLEMENTATION_STATUS.md:94`

- [ ] **Update generate-structured-output** (`supabase/functions/generate-structured-output/index.ts`)
  - Accept `customPromptId` in request
  - Fetch prompt from database
  - Use custom prompt instead of default
  - **Location**: `PROMPT_BUILDER_IMPLEMENTATION_STATUS.md:106`

- [ ] **Save prompt to database** (`frontend/src/components/PromptBuilder/PromptBuilder.tsx:56`)
  - Implement save functionality
  - Currently just logs to console

- [ ] **Save prompt and link to template** (`frontend/src/components/TemplateEditor.tsx:285`)
  - Link saved prompts to templates

### Document Service Integration
- [ ] **Integrate with actual document service** (`frontend/src/components/PromptBuilder/DocumentSelector.tsx:62`)
  - Currently a placeholder showing UI structure
  - Needs connection to actual document service
  - **Location**: `PROMPTFORGE_NEXT_STEPS.md:164`

---

## 🟡 Medium Priority - Features & Enhancements

### Prompt Library UI
- [ ] **Create PromptLibrary.tsx component** (`PROMPT_BUILDER_IMPLEMENTATION_STATUS.md:124`)
  - List saved prompts
  - Load existing prompts
  - Delete prompts
  - Share public prompts

### OpenRouter Testing
- [ ] **Create PromptBuilderTestPanel.tsx** (`PROMPT_BUILDER_IMPLEMENTATION_STATUS.md:133`)
  - Test prompts with multiple models
  - Parameter tuning UI
  - Token usage stats
  - Cost estimation
  - **Status**: Phase 3 TODO (`PROMPT_BUILDER_PHASE2_COMPLETE.md:150`)

### Execution Service
- [ ] **Calculate tokens from API response** (`frontend/src/services/executionService.ts:110-111`)
  - `tokens_in`: Calculate from actual API response
  - `tokens_out`: Calculate from actual API response
  - Currently set to `null`

---

## 🟢 Low Priority - Improvements & Optimizations

### PageIndex Service
- [ ] **Implement actual PDF page extraction** (`supabase/functions/vision-rag-query/index.ts:258`)
  - Options: PyMuPDF service, pdf2pic, client-side PDF.js
  - Current: Uses tree summaries as fallback
  - **Location**: `PAGEINDEX_INTEGRATION_SUMMARY.md:143`, `PAGEINDEX_SERVICE_IMPLEMENTATION.md:233`

- [ ] **Auto-submit PDFs to PageIndex** (`PAGEINDEX_SERVICE_IMPLEMENTATION.md:237`)
  - When Vision RAG is selected
  - Store PageIndex doc_id → document_id mapping
  - **Location**: `PAGEINDEX_INTEGRATION_SUMMARY.md:150`

- [ ] **Implement webhook or polling mechanism** (`PAGEINDEX_SERVICE_IMPLEMENTATION.md:241`)
  - For PageIndex processing status

### PromptForge Enhancements
- [ ] **Pack Reordering** (`PROMPTFORGE_NEXT_STEPS.md:165`)
  - Currently uses simple array manipulation
  - Consider drag-and-drop library for better UX

- [ ] **Analytics Performance** (`PROMPTFORGE_NEXT_STEPS.md:166`)
  - For large datasets, consider pagination or server-side aggregation

- [ ] **Pack Import Validation** (`PROMPTFORGE_NEXT_STEPS.md:167`)
  - Add validation for imported pack JSON format

### Performance Optimizations
- [ ] **Cache PageIndex trees** (`PAGEINDEX_INTEGRATION_SUMMARY.md:154`)
- [ ] **Optimize VLM calls** (`PAGEINDEX_INTEGRATION_SUMMARY.md:155`)
- [ ] **Batch processing** (`PAGEINDEX_INTEGRATION_SUMMARY.md:156`)

---

## 📋 Testing & Quality

### Component Testing
- [ ] Render PromptBuilder component
- [ ] Test form inputs (all fields)
- [ ] Test constraint/examples add/remove/reorder
- [ ] Test preview format switching
- [ ] Test copy to clipboard
- [ ] Test export callbacks
- **Location**: `PROMPT_BUILDER_IMPLEMENTATION_STATUS.md:177-182`

### Integration Testing
- [ ] Test TemplateEditor integration
- [ ] Test prompt saving to database
- [ ] Test prompt loading from database
- [ ] Test prompt linking to templates
- **Location**: `PROMPT_BUILDER_IMPLEMENTATION_STATUS.md:185-188`

### Database Testing
- [ ] Run migration successfully
- [ ] Test RLS policies (user can only access own prompts)
- [ ] Test public prompts visibility
- [ ] Test foreign key relationships
- **Location**: `PROMPT_BUILDER_IMPLEMENTATION_STATUS.md:191-194`

---

## 📊 Summary by Category

| Category | Count | Status |
|----------|-------|--------|
| **High Priority** | 5 | 🔴 Critical |
| **Medium Priority** | 3 | 🟡 Important |
| **Low Priority** | 8 | 🟢 Nice to have |
| **Testing** | 12 | 📋 Quality assurance |
| **Total** | 28 | |

---

## 🎯 Quick Reference

### Most Critical TODOs
1. Create prompt-builder edge function
2. Update generate-structured-output to accept custom prompts
3. Implement save prompt to database
4. Integrate DocumentSelector with actual document service
5. Calculate tokens from API response

### Next Steps (This Week)
1. Run database migration for prompt templates
2. Create backend edge function for prompts
3. Update generate-structured-output function
4. Test prompt saving/loading
5. Create PromptLibrary UI component

---

## 📝 Notes

- Many TODOs are documented in `PROMPT_BUILDER_IMPLEMENTATION_STATUS.md`
- Some TODOs are in code comments (search for `// TODO:`)
- Phase 2 and Phase 3 items are tracked in various progress documents
- Testing checklist is comprehensive but not yet executed

---

**Last Updated**: 2025-01-31
