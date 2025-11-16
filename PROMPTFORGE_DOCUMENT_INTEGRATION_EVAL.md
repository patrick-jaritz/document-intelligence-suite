# PromptForge Document Integration Evaluation

**Date**: 2025-11-16  
**Status**: Evaluation Complete - Integration Recommended ✅

---

## 🎯 Integration Opportunity

### Current State
- ✅ Document upload & processing system exists
- ✅ RAG system with document storage
- ✅ OCR and document extraction capabilities
- ✅ Document metadata and embeddings stored

### PromptForge Needs
- Prompts often require document context
- Users want to reference specific documents
- Examples/excerpts from documents improve prompts
- Document-aware prompt building would be valuable

---

## 💡 Integration Benefits

### 1. **Context-Aware Prompt Building**
**Use Case**: User uploads a contract, wants to build a prompt to extract key terms
- Link prompt to the document
- Use document sections as examples
- Reference document structure in prompt

**Value**: Higher quality prompts, less manual work

### 2. **Document-Prompt Relationships**
**Use Case**: User has multiple documents, wants prompts specific to each
- Associate prompts with documents
- Filter prompts by document
- See which documents use which prompts

**Value**: Better organization, document-specific workflows

### 3. **Example Extraction**
**Use Case**: User wants to use actual document content as examples in prompt
- Extract relevant sections from documents
- Insert into prompt examples automatically
- Keep examples up-to-date with document changes

**Value**: Real-world examples improve prompt quality

### 4. **Document-Aware Execution**
**Use Case**: Execute prompt against specific document
- Select document when running prompt
- Use document content as context
- Store execution results linked to document

**Value**: Document-specific prompt testing and results

---

## 🏗️ Proposed Integration Architecture

### Database Schema Addition

```sql
-- Link prompts to documents
CREATE TABLE prompt_documents (
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE, -- Assuming documents table exists
  relationship_type TEXT DEFAULT 'context' CHECK (relationship_type IN ('context', 'example', 'reference', 'target')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (prompt_id, document_id)
);

-- Store document excerpts used in prompts
CREATE TABLE prompt_document_excerpts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  excerpt_text TEXT NOT NULL,
  page_number INTEGER,
  start_char INTEGER,
  end_char INTEGER,
  used_in_version_id UUID REFERENCES prompt_versions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link executions to documents
ALTER TABLE executions ADD COLUMN document_id UUID REFERENCES documents(id);
ALTER TABLE executions ADD COLUMN document_context TEXT; -- Store relevant document context used
```

### Service Layer Integration

```typescript
// New service: promptDocumentService.ts
- linkPromptToDocument()
- getPromptDocuments()
- extractDocumentExcerpts()
- useDocumentAsContext()
- getDocumentPrompts()
```

### UI Integration Points

1. **Prompt Builder**
   - Document selector sidebar
   - "Add document context" button
   - Document excerpt picker
   - Preview document sections

2. **Prompt Library**
   - Filter by linked documents
   - Show document badges on prompts
   - "Documents" column in list view

3. **Execution Panel**
   - Document selector for execution
   - Show document context used
   - Link results to documents

---

## 📊 Integration Priority Assessment

### High Priority ✅
- **Document-Prompt Linking**: Core feature for organization
- **Document Context in Prompts**: Improves prompt quality
- **Filter by Document**: Essential for workflows

### Medium Priority ⚠️
- **Excerpt Extraction**: Nice-to-have, can be manual initially
- **Document-Aware Execution**: Useful but not critical for MVP

### Low Priority (v2) 📅
- **Auto-generate prompts from documents**: Advanced feature
- **Document versioning sync**: Complex, can wait

---

## 🎯 Recommended Implementation Approach

### Phase 2.5: Document Integration (After Core Library)

**Step 1**: Add document linking
- Create `prompt_documents` table
- Add service methods
- Add UI to link/unlink documents

**Step 2**: Document context in prompts
- Add document selector to prompt builder
- Store document references
- Show linked documents in prompt view

**Step 3**: Document filtering
- Add filter to library
- Show document badges
- Document-based navigation

**Step 4**: Document-aware execution (v2)
- Select document when executing
- Use document content as context
- Store document-linked results

---

## 🔄 Integration with Existing Systems

### RAG System Integration
- ✅ Can reuse document storage
- ✅ Can use existing document metadata
- ✅ Can leverage document embeddings for search

### Document Processing Pipeline
- ✅ Can use OCR results
- ✅ Can use extracted text
- ✅ Can use structured data

### Execution System
- ✅ Can integrate with existing execution flow
- ✅ Can use document content in LLM calls
- ✅ Can store document-linked results

---

## 📝 Implementation Checklist

### Database
- [ ] Create `prompt_documents` table
- [ ] Create `prompt_document_excerpts` table
- [ ] Add `document_id` to `executions` table
- [ ] Add indexes for performance
- [ ] Add RLS policies

### Services
- [ ] Create `promptDocumentService.ts`
- [ ] Add document linking methods
- [ ] Add excerpt extraction methods
- [ ] Update execution service to handle documents

### UI Components
- [ ] Document selector component
- [ ] Document badge component
- [ ] Document filter in library
- [ ] Document context panel in builder
- [ ] Document selector in execution panel

---

## ✅ Conclusion

**Recommendation**: **Integrate document linking in Phase 2.5**

**Rationale**:
1. High value for users (document-aware prompts)
2. Natural fit with existing document system
3. Enhances prompt quality and organization
4. Not too complex to implement
5. Can be added incrementally

**Timeline**: Add after core library UI is complete, before analytics

**Priority**: High - Should be part of MVP scope

---

**Next**: Proceed with Phase 2 (Library UI), then add document integration as Phase 2.5
