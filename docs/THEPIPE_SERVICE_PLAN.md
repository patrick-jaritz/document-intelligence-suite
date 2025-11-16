# thepipe Service Prototype Plan

## Objectives

- **Wrap thepipe CLI/API** in a lightweight HTTP microservice so our existing TypeScript/Supabase stack can invoke it without Python dependencies.
- **Evaluate performance and cost** of AI-enabled extraction (particularly VLM passes) versus our current ingestion pipeline.
- **Deliver deployable artifacts** (Dockerfile, requirements, FastAPI app) that we can run locally and on container-friendly infrastructure (Railway/Vercel Functions/Supabase Edge background jobs).

## Architecture Overview

```
Client (Supabase Edge Function / Worker)
        │
        ▼
thepipe-service (FastAPI)
        │
        ├─ Local filesystem (temporary storage for uploaded files)
        └─ External resources (URLs, GitHub repos, etc.)
```

- **Invocation model**: POST `/extract` with either a `source_url` (downloaded by the service) or a multipart file upload. Optional flags control extras (semantic chunking, Whisper, etc.).
- **Response**: JSON containing markdown chunks, extracted tables, images (as base64 or URLs), plus metadata (tokens used, errors, elapsed time).
- **Authentication**: simple bearer token header checked against `SERVICE_API_KEY` environment variable.

## Deliverables (prototype scope)

1. `services/thepipe-service/`
   - `Dockerfile` (Python 3.11 slim + poetry/pip install)
   - `requirements.txt` (`fastapi`, `uvicorn[standard]`, `pydantic`, `thepipe-api[semantic]`)
   - `app/main.py` (FastAPI app with `/health`, `/extract`)
   - `README.md` (setup, env vars, usage)
2. CI hook (optional) – add `services/thepipe-service/` to lint/build workflow.
3. Evaluation notebook or script to measure runtime on representative documents.

## Open Questions

- **Storage of large media**: thepipe can emit screenshots/images; decide whether to base64-encode in response, persist to object storage, or provide signed URLs.
- **Concurrency**: baseline service is synchronous; for throughput we may need queueing or async workers.
- **Provider selection**: start with OpenAI (gpt-4o); evaluate local VLM compatibility later.

## Next Steps

1. Scaffold FastAPI service + Dockerfile.
2. Add integration points in Supabase Edge function to call the service (stub).
3. Run sample evaluations (PDF, web page, video) and collect metrics (time, token usage).
4. Decide on deployment target and infra budget based on results.


