# Structured Prompt Builder Integration Plan

**Source**: [Structured Prompt Builder](https://github.com/Siddhesh2377/structured-prompt-builder)  
**Analysis Date**: 2025-01-31  
**Integration Status**: 📋 Planning Phase

---

## 🎯 Executive Summary

The Structured Prompt Builder is a perfect fit for your Document Intelligence Suite. It will enhance your platform by providing:

- **Visual Prompt Engineering** for better LLM interactions
- **Template Creation** that integrates with your existing template system
- **Prompt Testing** using OpenRouter's 100+ AI models
- **Prompt Library** for reusable, optimized prompts

### Why This Integration Makes Sense

1. **Your Platform is Prompt-Heavy**: You have multiple functions using prompts:
   - `generate-structured-output` - Data extraction prompts
   - `rag-query` - Question answering prompts
   - `github-analyzer` - Repository analysis prompts
   - Template system for structured data extraction

2. **Current Prompt Management Issues**:
   - Prompts are hardcoded in Edge Functions
   - No easy way for users to customize prompts
   - Limited prompt testing capabilities
   - Template system doesn't include prompt engineering

3. **Value Proposition**:
   - Users can build and test prompts visually
   - Export optimized prompts to your LLM functions
   - Create reusable prompt templates
   - Test with multiple models before deploying

---

## 📊 Integration Architecture

### Option A: Embedded Component (Recommended)

Integrate the Structured Prompt Builder as a React component in your frontend:

```
┌─────────────────────────────────────────────────┐
│         Document Intelligence Suite              │
├─────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Data Extract │  │   RAG View             │ │
│  └──────┬───────┘  └──────┬─────────────────┘ │
│         │                 │                    │
│         ▼                 ▼                    │
│  ┌──────────────────────────────────────────┐ │
│  │    Structured Prompt Builder              │ │
│  │  ┌────────────────────────────────────┐  │ │
│  │  │ Role: Data Extraction Expert       │  │ │
│  │  │ Task: Extract structured data      │  │ │
│  │  │ Context: [User input]              │  │ │
│  │  │ Constraints: [...]                 │  │ │
│  │  │ Examples: [...]                    │  │ │
│  │  └────────────────────────────────────┘  │ │
│  │  Live Preview | Test | Save              │ │
│  └──────────────────────────────────────────┘ │
│         │                 │                    │
│         ▼                 ▼                    │
│  ┌──────────────────────────────────────────┐ │
│  │  Export to:                                │ │
│  │  • Template Schema                        │ │
│  │  • RAG Query Prompt                       │ │
│  │  • Custom LLM Function                   │ │
│  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Option B: Standalone Service

Add as a separate mode/page in your app, similar to GitHub Analyzer:

```
Main Menu:
- Extract Data
- RAG Query
- GitHub Analyzer
- Prompt Builder ⭐ NEW
- Markdown Converter
```

---

## 🔧 Implementation Plan

### Phase 1: Component Integration

#### 1.1 Add Prompt Builder Component

**File**: `frontend/src/components/PromptBuilder.tsx`

```typescript
interface PromptBuilderProps {
  onPromptExport?: (prompt: StructuredPrompt) => void;
  initialPrompt?: StructuredPrompt;
  mode?: 'template' | 'rag' | 'custom';
}

export function PromptBuilder({ 
  onPromptExport, 
  initialPrompt,
  mode = 'custom' 
}: PromptBuilderProps) {
  // Component implementation
  // Based on structured-prompt-builder structure
}
```

**Features to Port**:
- Structured fields (Title, Role, Task, Context)
- Dynamic lists (Constraints, Examples)
- Live preview (JSON, Markdown, Plain Text)
- Local library (integrate with Supabase storage)
- Model testing (OpenRouter integration)

#### 1.2 Integration Points

**A. Template Editor Integration**

Modify `TemplateEditor.tsx` to include prompt builder:

```typescript
// Add "Build Prompt" button in TemplateEditor
<TabPanel>
  <TemplateSchemaEditor />
  <Divider />
  <PromptBuilder 
    mode="template"
    onPromptExport={(prompt) => saveTemplateWithPrompt(template, prompt)}
  />
</TabPanel>
```

**B. RAG View Integration**

Add prompt customization to `RAGView.tsx`:

```typescript
// Add prompt builder tab
<Tabs>
  <Tab>Query</Tab>
  <Tab>Prompt Builder</Tab> {/* NEW */}
  <Tab>Settings</Tab>
</Tabs>

<TabPanel>
  <PromptBuilder 
    mode="rag"
    initialPrompt={ragPrompt}
    onPromptExport={(prompt) => updateRAGPrompt(prompt)}
  />
</TabPanel>
```

**C. Data Extract Integration**

Allow custom prompts for structured extraction:

```typescript
// In DataExtractView
<AdvancedOptions>
  <PromptBuilder 
    mode="template"
    onPromptExport={(prompt) => setCustomExtractionPrompt(prompt)}
  />
</AdvancedOptions>
```

---

### Phase 2: Backend Integration

#### 2.1 Prompt Storage

**New Table**: `prompt_templates`

```sql
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
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
  mode TEXT, -- 'template', 'rag', 'custom'
  associated_template_id UUID REFERENCES structure_templates(id),
  
  -- Preview formats
  json_preview TEXT,
  markdown_preview TEXT,
  plain_text_preview TEXT,
  
  -- Usage stats
  usage_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prompt_templates_user_id ON prompt_templates(user_id);
CREATE INDEX idx_prompt_templates_mode ON prompt_templates(mode);
CREATE INDEX idx_prompt_templates_public ON prompt_templates(is_public) WHERE is_public = true;
```

#### 2.2 Edge Function: Prompt Management

**New Function**: `supabase/functions/prompt-builder/index.ts`

```typescript
// CRUD operations for prompts
// GET /prompt-builder - List prompts
// POST /prompt-builder - Create prompt
// PUT /prompt-builder/:id - Update prompt
// DELETE /prompt-builder/:id - Delete prompt
// POST /prompt-builder/:id/test - Test prompt with OpenRouter
```

#### 2.3 Update Existing Functions

**Modify `generate-structured-output`** to accept custom prompts:

```typescript
interface StructuredOutputRequest {
  extractedText: string;
  structureTemplate: any;
  customPrompt?: StructuredPrompt; // NEW
  llmProvider: string;
  model: string;
}

// Use custom prompt if provided
const prompt = customPrompt 
  ? buildPromptFromStructured(customPrompt, structureTemplate)
  : buildPrompt(extractedText, structureTemplate);
```

**Modify `rag-query`** to accept custom prompts:

```typescript
interface RAGQueryRequest {
  question: string;
  documentId?: string;
  filename?: string;
  customPrompt?: StructuredPrompt; // NEW
  provider: string;
  model: string;
}

// Use custom prompt for answer generation
const answerPrompt = customPrompt
  ? buildRAGPromptFromStructured(customPrompt, question, context)
  : defaultRAGPrompt(question, context);
```

---

### Phase 3: OpenRouter Integration

#### 3.1 Add OpenRouter Testing

**Component**: `PromptBuilderTestPanel.tsx`

```typescript
interface PromptBuilderTestPanelProps {
  prompt: StructuredPrompt;
  apiKey?: string;
}

export function PromptBuilderTestPanel({ prompt, apiKey }: Props) {
  // Features:
  // - Model selection (100+ models)
  // - Parameter tuning (temperature, max tokens, etc.)
  // - Streaming responses
  // - Token usage stats
  // - Cost estimation
}
```

**Edge Function**: `supabase/functions/test-prompt/index.ts`

```typescript
// Proxy to OpenRouter API
// Test prompts with various models
// Return response, tokens, cost
```

#### 3.2 Environment Setup

```bash
# Add OpenRouter API key (user-provided or platform-wide)
supabase secrets set OPENROUTER_API_KEY="your-key" # Optional

# Or use user's own key (recommended for cost control)
```

---

### Phase 4: Template System Integration

#### 4.1 Link Prompts with Templates

```sql
-- Add prompt_id to structure_templates
ALTER TABLE structure_templates 
ADD COLUMN prompt_template_id UUID REFERENCES prompt_templates(id);

-- When user creates template, optionally create prompt
-- When user creates prompt for extraction, link to template
```

#### 4.2 Prompt Export Formats

**Export Options**:
1. **Template Schema** - Use as extraction prompt
2. **RAG Query** - Use for question answering
3. **GitHub Analysis** - Use for repository analysis
4. **Custom Function** - Export JSON for any Edge Function
5. **OpenRouter Format** - Direct API call format

---

## 🎨 UI/UX Design

### Integration Styles

**Option 1: Modal/Drawer** (Recommended)
- Click "Build Prompt" button
- Opens prompt builder in modal/drawer
- Export directly to current context

**Option 2: Tab/View**
- New tab in existing views
- Persistent prompt builder
- Real-time preview in context

**Option 3: Standalone Page**
- New route: `/prompt-builder`
- Full-screen prompt builder
- Export to clipboard or save

### Design Consistency

Match your existing UI:
- Use same color scheme
- Same component library
- Same spacing/sizing
- Responsive design

---

## 📦 Implementation Steps

### Step 1: Clone & Port Core Functionality (Week 1)

```bash
# Clone structured-prompt-builder
git clone https://github.com/Siddhesh2377/structured-prompt-builder.git temp-prompt-builder

# Extract core components
# - Prompt form structure
# - Live preview logic
# - Format conversion utilities

# Port to React/TypeScript
# - Convert vanilla JS to React hooks
# - Add TypeScript types
# - Integrate with your component system
```

**Files to Create**:
- `frontend/src/components/PromptBuilder/PromptBuilder.tsx`
- `frontend/src/components/PromptBuilder/PromptForm.tsx`
- `frontend/src/components/PromptBuilder/PromptPreview.tsx`
- `frontend/src/components/PromptBuilder/PromptLibrary.tsx`
- `frontend/src/utils/promptFormatters.ts`

### Step 2: Database & Backend (Week 1-2)

```bash
# Create migration
supabase migration new add_prompt_templates

# Add prompt_templates table
# Add prompt_template_id to structure_templates

# Create Edge Function
supabase functions new prompt-builder
supabase functions new test-prompt

# Deploy
supabase functions deploy prompt-builder
supabase functions deploy test-prompt
```

### Step 3: Integrate with Existing Features (Week 2)

**A. Template Editor**
- Add prompt builder tab
- Link prompts to templates
- Export prompt with template

**B. RAG View**
- Add prompt customization
- Test with current document
- Save prompt for reuse

**C. Data Extract**
- Optional custom prompts
- Better extraction results
- User-controlled prompts

### Step 4: OpenRouter Testing (Week 2-3)

- Add OpenRouter API integration
- Model selection UI
- Parameter tuning
- Token usage display
- Cost estimation

### Step 5: Polish & Documentation (Week 3)

- UI polish
- Error handling
- User documentation
- Example prompts
- Tutorial/onboarding

---

## 💻 Code Examples

### Example 1: Prompt Builder Component Structure

```typescript
// frontend/src/components/PromptBuilder/PromptBuilder.tsx

export interface StructuredPrompt {
  title: string;
  role: string;
  task: string;
  context: string;
  constraints: string[];
  examples: Array<{ input: string; output: string }>;
}

export function PromptBuilder({ 
  onPromptExport, 
  mode = 'custom' 
}: PromptBuilderProps) {
  const [prompt, setPrompt] = useState<StructuredPrompt>({
    title: '',
    role: '',
    task: '',
    context: '',
    constraints: [],
    examples: []
  });

  const [previewFormat, setPreviewFormat] = useState<'json' | 'markdown' | 'plain'>('markdown');

  // Live preview generation
  const preview = useMemo(() => {
    return generatePreview(prompt, previewFormat);
  }, [prompt, previewFormat]);

  // Export handlers
  const handleExportToTemplate = () => {
    const templatePrompt = convertToTemplatePrompt(prompt);
    onPromptExport?.(templatePrompt);
  };

  const handleExportToRAG = () => {
    const ragPrompt = convertToRAGPrompt(prompt);
    onPromptExport?.(ragPrompt);
  };

  return (
    <div className="prompt-builder">
      <PromptForm prompt={prompt} onChange={setPrompt} />
      <PromptPreview preview={preview} format={previewFormat} />
      <ExportOptions 
        onExportTemplate={handleExportToTemplate}
        onExportRAG={handleExportToRAG}
      />
    </div>
  );
}
```

### Example 2: Template Integration

```typescript
// frontend/src/components/TemplateEditor.tsx (modified)

export function TemplateEditor({ onTemplateSelect }: Props) {
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const handlePromptExport = (prompt: StructuredPrompt) => {
    if (selectedTemplate) {
      // Save prompt with template
      saveTemplateWithPrompt(selectedTemplate.id, prompt);
    }
  };

  return (
    <div>
      <TemplateList onSelect={setSelectedTemplate} />
      
      {selectedTemplate && (
        <>
          <Button onClick={() => setShowPromptBuilder(true)}>
            Build Custom Prompt
          </Button>
          
          {showPromptBuilder && (
            <Modal onClose={() => setShowPromptBuilder(false)}>
              <PromptBuilder
                mode="template"
                onPromptExport={handlePromptExport}
              />
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
```

### Example 3: Backend Prompt Usage

```typescript
// supabase/functions/generate-structured-output/index.ts (modified)

interface Request {
  extractedText: string;
  structureTemplate: any;
  customPromptId?: string; // NEW: Reference to prompt_templates
  llmProvider: string;
  model: string;
}

async function generateWithCustomPrompt(
  extractedText: string,
  structureTemplate: any,
  customPromptId: string,
  model: string
) {
  // Fetch prompt from database
  const { data: promptTemplate } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('id', customPromptId)
    .single();

  // Build prompt from structured format
  const systemPrompt = buildPromptFromStructured(
    promptTemplate,
    structureTemplate
  );

  // Use custom prompt in LLM call
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: extractedText }
      ]
    })
  });

  return response.json();
}
```

---

## 📊 Benefits & Use Cases

### Benefits

1. **User Empowerment**
   - Users can customize prompts without code
   - Visual prompt building
   - Test before deploying

2. **Better Results**
   - Optimized prompts = better extraction
   - Tested prompts = fewer errors
   - Reusable prompts = consistency

3. **Cost Optimization**
   - Test prompts cheaply before production
   - Compare models before committing
   - Optimize token usage

4. **Platform Enhancement**
   - Differentiates from competitors
   - Advanced feature for power users
   - Community prompt sharing

### Use Cases

1. **Custom Data Extraction**
   - User wants specific fields extracted
   - Build custom prompt for domain-specific data
   - Test with sample documents

2. **RAG Query Optimization**
   - Improve answer quality
   - Add context/constraints
   - Test with document-specific queries

3. **Template Creation**
   - Build extraction templates with prompts
   - Share with community
   - Maintain prompt library

4. **Multi-Model Testing**
   - Test same prompt across models
   - Find best model for use case
   - Cost comparison

---

## 🔒 Security & Privacy

1. **User Prompts**: Store in user's own database (not shared by default)
2. **API Keys**: User's OpenRouter key (optional) or platform key
3. **Prompt Sharing**: Opt-in only for public prompts
4. **Data Isolation**: User prompts isolated by user_id

---

## 📈 Success Metrics

- **Adoption**: % of users who try prompt builder
- **Usage**: Prompts created per user
- **Effectiveness**: Improvement in extraction quality
- **Satisfaction**: User feedback on feature

---

## 🚀 Quick Start Implementation

### Minimal Viable Integration

1. **Add Component** (1-2 days)
   ```bash
   # Create basic PromptBuilder component
   # Port core functionality from original
   # Add to TemplateEditor as tab
   ```

2. **Basic Storage** (1 day)
   ```bash
   # Add prompt_templates table
   # Save/load prompts
   # Link to templates
   ```

3. **Export Integration** (1 day)
   ```bash
   # Export prompts to existing functions
   # Test with generate-structured-output
   ```

**Total: 3-4 days for MVP**

---

## 📚 Resources

- **Original Repo**: https://github.com/Siddhesh2377/structured-prompt-builder
- **Live Demo**: https://structured-prompt-builder.vercel.app
- **OpenRouter Docs**: https://openrouter.ai/docs
- **Your Template System**: `supabase/functions/add-templates/index.ts`

---

## ✅ Recommendation

**Implement as Option A (Embedded Component)** with:
1. Phase 1 (Component) - Start immediately
2. Phase 2 (Backend) - Follow in Week 2
3. Phase 3 (OpenRouter) - Optional, Week 3+
4. Phase 4 (Full Integration) - As needed

This provides immediate value while allowing incremental enhancement.

---

**Ready to start?** I can help you:
1. Create the PromptBuilder component
2. Set up database schema
3. Integrate with TemplateEditor
4. Add OpenRouter testing

Let me know which phase you'd like to tackle first! 🚀

