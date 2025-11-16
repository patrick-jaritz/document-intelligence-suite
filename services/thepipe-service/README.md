# thepipe-service (prototype)

FastAPI wrapper around the [thepipe](https://github.com/emcf/thepipe) document extraction toolkit.  
The goal is to expose a simple HTTP interface for our Supabase/TypeScript stack while we evaluate extraction quality and runtime cost.

## Endpoints

| Method | Path       | Description                                 |
| ------ | ---------- | ------------------------------------------- |
| GET    | `/health`  | Liveness probe. Returns `{"status":"ok"}`.  |
| POST   | `/extract` | Run thepipe against a URL or uploaded file. |

### `/extract` payload

```json
{
  "source_url": "https://example.com/report.pdf",
  "options": {
    "semantic": true,
    "text_only": false
  }
}
```

Alternatively, upload a file via multipart form-data with field `file`.

### Response (trimmed)

```json
{
  "success": true,
  "elapsed_seconds": 3.42,
  "chunks": [
    {"type": "markdown", "content": "# Title …"},
    {"type": "image", "content": "data:image/png;base64, …"}
  ],
  "metadata": {
    "source": "https://example.com/report.pdf",
    "semantic_embeddings": false,
    "model": "gpt-4o"
  }
}
```

Errors return HTTP 400/500 with `{"success":false,"error":"…"}`.

## Configuration

| Env var             | Description                                   |
| ------------------- | --------------------------------------------- |
| `OPENAI_API_KEY`    | Required for VLM extraction via OpenAI API.   |
| `SERVICE_API_KEY`   | Optional bearer token required by clients.    |
| `DEFAULT_MODEL`     | Override default model (`gpt-4o`).            |
| `TMP_DIR`           | Temp path for downloads (default `/tmp`).     |

## Development

```bash
cd services/thepipe-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

### Quick evaluation

With the service running locally:

```bash
python scripts/evaluate.py --source https://arxiv.org/pdf/2106.10337.pdf --pretty
python scripts/evaluate.py --source ./fixtures/sample.pdf --endpoint http://localhost:8080
```

## Docker

```bash
docker build -t thepipe-service .
docker run -p 8080:8080 --env-file .env thepipe-service
```

> **Note**: When running on CPU-only hosts, install the CPU wheels for PyTorch before the `[semantic]` extra if you enable semantic embeddings.


