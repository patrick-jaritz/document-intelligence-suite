# PromptForge Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ PromptLibrary│  │ PromptDetail │  │ Analytics    │         │
│  │   (List)     │  │  (Editor)    │  │ Dashboard    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                 │
│         └─────────────────┼──────────────────┘                 │
│                           │                                    │
│  ┌───────────────────────┼───────────────────────┐             │
│  │         Shared Components & Hooks              │             │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────┐ │             │
│  │  │PromptCard  │  │PromptExec  │  │Version  │ │             │
│  │  │            │  │            │  │History  │ │             │
│  │  └────────────┘  └────────────┘  └─────────┘ │             │
│  │  ┌────────────┐  ┌────────────┐              │             │
│  │  │Execution   │  │AI Chat     │              │             │
│  │  │View        │  │(Refine)    │              │             │
│  │  └────────────┘  └────────────┘              │             │
│  └──────────────────────────────────────────────┘             │
│                           │                                    │
│  ┌───────────────────────┼───────────────────────┐             │
│  │         Services Layer                         │             │
│  │  promptService │ executionService │ analytics │             │
│  └───────────────────────┼───────────────────────┘             │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │ HTTP/REST
                            │
┌───────────────────────────┼────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                     │
├───────────────────────────┼────────────────────────────────────┤
│                           │                                    │
│  ┌───────────────────────┼───────────────────────┐             │
│  │  prompts/             │  executions/          │             │
│  │  - CRUD               │  - List               │             │
│  │  - Versions           │  - Feedback           │             │
│  └───────────────────────┼───────────────────────┘             │
│                           │                                    │
│  ┌───────────────────────┼───────────────────────┐             │
│  │  execute-prompt/       │  analytics/           │             │
│  │  - Execute            │  - Overview           │             │
│  │  - Log                │  - Per-prompt         │             │
│  └───────────────────────┼───────────────────────┘             │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │
┌───────────────────────────┼────────────────────────────────────┐
│                    SUPABASE DATABASE                          │
├───────────────────────────┼────────────────────────────────────┤
│                           │                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ prompts  │  │prompt_   │  │executions│  │executions│     │
│  │          │  │versions  │  │          │  │_data     │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │prompt_   │  │workspaces│  │workspace │                   │
│  │packs     │  │          │  │_members  │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼────────────────────────────────────┐
│                    EXTERNAL SERVICES                          │
├───────────────────────────┼────────────────────────────────────┤
│                           │                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │ OpenAI   │  │Anthropic │  │OpenRouter│                    │
│  │ API     │  │ API      │  │ API      │                    │
│  └──────────┘  └──────────┘  └──────────┘                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Data Flow: Prompt Execution

```
User Action: Execute Prompt
    │
    ├─► 1. Extract {{placeholders}} from prompt_body
    │       └─► ["product_name", "tone", "length"]
    │
    ├─► 2. Generate Form Schema
    │       └─► [
    │             {name: "product_name", label: "Product Name", type: "text"},
    │             {name: "tone", label: "Tone", type: "select"},
    │             {name: "length", label: "Length", type: "number"}
    │           ]
    │
    ├─► 3. User Fills Form
    │       └─► {product_name: "Widget", tone: "professional", length: 500}
    │
    ├─► 4. Replace Placeholders
    │       └─► "Write a {{tone}} description of {{product_name}}..."
    │           becomes
    │           "Write a professional description of Widget..."
    │
    ├─► 5. Call LLM Provider
    │       └─► POST to OpenAI/Anthropic/OpenRouter
    │
    ├─► 6. Receive Response
    │       └─► {content: "...", usage: {...}, model: "gpt-4o"}
    │
    ├─► 7. Log Execution
    │       └─► INSERT into executions table
    │           - prompt_id
    │           - input_parameters
    │           - response_text
    │           - tokens_input/output
    │           - latency_ms
    │
    └─► 8. Display Response + Collect Feedback
            └─► User rates (1-5) and marks success/fail
                └─► UPDATE executions SET user_rating, marked_successful
```

## Component Hierarchy

```
App
├── Router
│   ├── /prompts (PromptLibrary)
│   │   ├── PromptCard[]
│   │   ├── SearchBar
│   │   └── FilterSidebar
│   │
│   ├── /prompts/:id (PromptDetail)
│   │   ├── PromptEditor (uses PromptBuilder)
│   │   ├── MetadataPanel
│   │   ├── VersionHistory (sidebar)
│   │   ├── PromptExecutor
│   │   │   ├── ParameterForm
│   │   │   └── ModelSelector
│   │   ├── ExecutionView
│   │   │   ├── ResponseDisplay
│   │   │   └── FeedbackControls
│   │   └── ExecutionHistory
│   │
│   └── /analytics (AnalyticsDashboard)
│       ├── OverviewCards
│       ├── RunsOverTimeChart
│       ├── SuccessRateChart
│       └── TopPromptsList
│
└── Layout
    ├── Navigation
    └── UserMenu
```

## Database Relationships

```
users (auth.users)
  │
  ├─► prompts (1:N)
  │     │
  │     ├─► prompt_versions (1:N)
  │     │     └─► executions (1:N)
  │     │
  │     └─► pack_prompts (N:M via prompt_packs)
  │
  ├─► prompt_packs (1:N)
  │     └─► pack_prompts (1:N)
  │
  ├─► workspaces (1:N as owner)
  │     └─► workspace_members (N:M)
  │
  └─► executions (1:N)
        └─► executions_data (1:1, optional)
```

## API Request Flow

```
Frontend Component
    │
    ├─► Service Layer (promptService.ts)
    │       │
    │       └─► callEdgeFunction('prompts', {...})
    │
    ├─► Supabase Client
    │       │
    │       └─► POST /functions/v1/prompts
    │               Headers: Authorization: Bearer <token>
    │
    ├─► Edge Function (prompts/index.ts)
    │       │
    │       ├─► Verify Auth Token
    │       ├─► Validate Request
    │       ├─► Execute Business Logic
    │       └─► Query Database
    │
    ├─► Supabase Database
    │       │
    │       ├─► RLS Policy Check
    │       └─► Return Data
    │
    └─► Response to Frontend
            │
            └─► Update UI State
```

## Key Design Patterns

### 1. Placeholder System
```typescript
// Prompt body contains placeholders
const promptBody = "Write a {{tone}} blog post about {{topic}} with {{word_count}} words.";

// Extract placeholders
const placeholders = extractPlaceholders(promptBody);
// → ["tone", "topic", "word_count"]

// Generate form
const formFields = generateFormSchema(placeholders);
// → [{name: "tone", type: "select", options: [...]}, ...]

// Replace before execution
const finalPrompt = replacePlaceholders(promptBody, userInputs);
// → "Write a professional blog post about AI with 1000 words."
```

### 2. Version Management
```typescript
// Create new version
const newVersion = {
  prompt_id: "abc123",
  version_number: 2, // Auto-increment
  prompt_body: updatedBody,
  changelog: "Added examples section",
  is_current: false // User promotes later
};

// Promote version
UPDATE prompt_versions SET is_current = false WHERE prompt_id = "abc123";
UPDATE prompt_versions SET is_current = true WHERE id = newVersionId;
UPDATE prompts SET current_version_id = newVersionId WHERE id = "abc123";
```

### 3. Execution Logging
```typescript
// After LLM call
const execution = {
  prompt_id,
  prompt_version_id,
  input_parameters: {tone: "professional", topic: "AI"},
  model_provider: "openai",
  model_name: "gpt-4o",
  response_text: response.content,
  tokens_input: response.usage.prompt_tokens,
  tokens_output: response.usage.completion_tokens,
  latency_ms: Date.now() - startTime,
  cost_usd: calculateCost(response.usage, model)
};

// Store execution
await supabase.from('executions').insert(execution);

// If response > 100KB, also store in executions_data
if (response.content.length > 100000) {
  await supabase.from('executions_data').insert({
    execution_id: execution.id,
    response_text: response.content
  });
}
```

### 4. Analytics Aggregation
```sql
-- Pre-compute analytics (can be cached)
SELECT 
  prompt_id,
  COUNT(*) as total_runs,
  AVG(user_rating) as avg_rating,
  COUNT(*) FILTER (WHERE marked_successful = true)::numeric / COUNT(*)::numeric as success_rate,
  SUM(tokens_total) as total_tokens,
  AVG(latency_ms) as avg_latency
FROM executions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY prompt_id;
```

## Security Considerations

### Row Level Security (RLS)
- Users can only see their own prompts + public prompts
- Workspace members can see team prompts
- Executions are private to the user who created them

### API Security
- All Edge Functions verify JWT token
- Rate limiting on execution endpoints
- Input validation (max prompt length, parameter validation)
- Cost limits per user/workspace

### Data Privacy
- API keys stored encrypted
- Execution responses can be deleted by user
- GDPR-compliant data export/deletion

## Performance Optimizations

### Frontend
- Lazy load prompt library (pagination)
- Code splitting for analytics dashboard
- Memoize expensive computations (placeholder extraction)
- Virtual scrolling for long lists

### Backend
- Cache analytics aggregations (Redis or Supabase cache)
- Index database queries (prompt_id, user_id, created_at)
- Batch execution queries
- Stream large responses

### Database
- Indexes on frequently queried columns
- Partition executions table by date (if very large)
- Archive old executions (>90 days) to cold storage

## Scalability Considerations

### Current Limits (MVP)
- 100 concurrent users
- 10,000 prompts per user
- 100,000 executions total

### Future Scaling
- Horizontal scaling of Edge Functions
- Database read replicas
- CDN for static assets
- Queue system for execution (if high volume)

## Monitoring & Observability

### Metrics to Track
- API response times
- Execution success rates
- Token usage and costs
- User engagement (prompts created, executions run)
- Error rates

### Logging
- All API calls logged
- Execution errors logged with context
- User actions logged for analytics

### Alerts
- High error rate (>5%)
- Unusual token usage spikes
- Database connection issues
- Edge Function timeouts
