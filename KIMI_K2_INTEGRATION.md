## Kimi K2 Integration Guide

### Overview
- Added **MoonshotAI Kimi K2** as a first-class LLM provider across the Document Intelligence Suite.
- Coverage includes:
  - `supabase/functions/rag-query` (vector RAG answers)
  - `supabase/functions/generate-structured-output` (structured extraction pipeline)
  - `supabase/functions/github-analyzer` (repository analysis)
  - Frontend provider dropdowns (`RAGView`, `ChatInterface`)

### Environment Variables
Set these variables wherever the Supabase Edge Functions run (Supabase project) and mirror them in Vercel for the frontend:

```bash
KIMI_API_KEY=sk-...
KIMI_API_BASE_URL=https://platform.moonshot.ai    # optional, defaults to this value
```

> **Note:** `KIMI_API_BASE_URL` is optional and only required if you use a proxy or custom deployment.

### Behavioural Notes
- Kimi K2 is OpenAI-compatible; requests are sent to `/v1/chat/completions`.
- Default model: `kimi-k2-instruct` (128K context). `kimi-k2-base` exposed as an alternate option in the UI.
- Temperature is auto-tuned (~0.5) to align with Moonshot’s guidance (`real_temperature = request_temperature * 0.6`).
- Embeddings: Kimi does not currently expose embeddings. When Kimi is selected, the system falls back to OpenAI embeddings if available; otherwise local embeddings are used.

### Frontend UX
- RAG provider dropdown now lists “Kimi K2 (Moonshot)” with contextual guidance.
- Model picker exposes `kimi-k2-instruct` and `kimi-k2-base`.
- Chat interface (document view) supports Kimi end-to-end.

### Testing Checklist
1. Configure `KIMI_API_KEY` (and optional `KIMI_API_BASE_URL`) in Supabase and Vercel.
2. Run a document RAG query selecting **Kimi K2**; verify answers and source citations.
3. Execute a structured extraction job (Prompt Builder → Test Panel → choose Kimi via API key or direct call) and confirm JSON response.
4. Run a GitHub Analyzer request and check logs for successful Kimi fallback when OpenAI is absent.

### Deployment
After adding the environment variables, redeploy:
```bash
supabase functions deploy rag-query generate-structured-output github-analyzer
pnpm run build && vercel deploy
```

Kimi integration is now live and ready for long-context, tool-friendly RAG workflows.

