# Local Development Quick Start

Prerequisites:
- Node.js >= 18
- Docker & Docker Compose (for optional OCR services)
- Supabase CLI (`supabase`) for local Supabase emulation

1) Install frontend dependencies

```bash
cd frontend
npm install
```

2) Start Supabase locally (in a separate terminal)

From the repository root:

```bash
npm run supabase:start
# or: supabase start
```

3) (Optional) Start OCR services with Docker Compose

Some services in `services/` provide Dockerfiles and compose configurations. Example (if present):

```bash
# from repo root
docker compose -f docker-compose.ocr.yml up --build -d
```

4) Run the frontend

```bash
cd frontend
npm run dev
```

5) Useful commands

- Run frontend tests: `cd frontend && npm run test:run`
- Build frontend: `cd frontend && npm run build`
- Stop Supabase: `npm run supabase:stop` (from repo root)

Notes:
- Some Supabase functions and services expect environment variables. Check `supabase/` and `services/*/README.md` for provider-specific setup and `.env` guidance.
- If you prefer an all-in-one setup, run `npm run setup` (installs frontend deps and starts Supabase), but `supabase:start` will block the terminal.
