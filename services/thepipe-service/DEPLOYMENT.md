# thepipe-service Deployment Guide

## Quick Evaluation

Before deploying to production, evaluate the thepipe-service on your documents to determine:
- Extraction time per document
- Estimated API costs
- Suitable deployment target (Railway, Vercel, Supabase)

### Step 1: Run Locally

```bash
cd services/thepipe-service

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the service (requires OPENAI_API_KEY)
export OPENAI_API_KEY="sk-..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

### Step 2: Evaluate Performance

In a new terminal:

```bash
# Test with a real document
python scripts/evaluate.py --source https://arxiv.org/pdf/2106.10337.pdf --pretty

# Test with local file
python scripts/evaluate.py --source ./sample.pdf --pretty

# Save metrics to JSON
python scripts/evaluate.py --source ./document.pdf --output metrics.json
```

**Output Example**:
```
⏱️  Extracting document...
📊 Calculating metrics...
   ✓ Extraction time: 3.42s
   ✓ Chunks: 45
   ✓ Images: 8
   ✓ Characters: 125,000
   ✓ Est. tokens: 31,250
   ✓ Est. cost: $0.00085

🚀 Deployment recommendations:
   [HIGH] Railway
       → Fast extraction (3.42s), low cost ($0.00085), suitable for always-on service
```

---

## Deployment Options

### 1. **Railway** (Recommended for Production)

Best for: Always-on service, steady document throughput

**Pros**:
- Simple deployment with Git integration
- Cost-effective ($5-50/month depending on usage)
- Good for batch/scheduled extraction jobs
- Easy monitoring and logging

**Cons**:
- Costs accumulate with usage (typical: $0.001-0.01 per extraction)

**Setup**:

1. Create a `railway.json` in the service root:
```json
{
  "deploy": {
    "buildCommand": "pip install -r requirements.txt",
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
  },
  "environment": [
    {
      "name": "OPENAI_API_KEY",
      "description": "OpenAI API key for VLM extraction"
    },
    {
      "name": "SERVICE_API_KEY",
      "description": "Optional bearer token for service authentication"
    }
  ]
}
```

2. Connect your GitHub repo to Railway
3. Set environment variables in Railway dashboard
4. Deploy via Railway UI or CLI: `railway up`

**Accessing the service**:
```bash
THEPIPE_URL="https://thepipe-service-prod.railway.app"
curl -X POST $THEPIPE_URL/extract \
  -H "Authorization: Bearer $SERVICE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source_url":"https://example.com/doc.pdf"}'
```

### 2. **Vercel Functions** (Alternative for Low Volume)

Best for: Low-frequency extractions, serverless architecture

**Pros**:
- Pay-per-request (no idle costs)
- Git integration
- Global edge network
- Simple deployment

**Cons**:
- 30-second timeout limit (may not work for large documents)
- Higher per-request latency than Railway
- Not suitable for real-time use cases

**Setup**:
```bash
# Create Vercel config
echo '{
  "functions": {
    "services/thepipe-service/app/**": {
      "memory": 3008,
      "maxDuration": 30
    }
  }
}' > vercel.json

# Deploy
vercel deploy --prod
```

### 3. **Supabase Edge Functions** (Alternative)

Best for: Integration with Supabase, low-volume extractions

**Pros**:
- Direct database integration
- Built-in authentication
- Lower latency within Supabase ecosystem

**Cons**:
- Limited to 30-second execution time
- Depends on Supabase tier
- Less suitable for heavy computation

**Setup**: Requires wrapping thepipe in Deno/TypeScript Edge Function (more complex)

### 4. **Async Queue** (For Large Documents)

Best for: Batch processing, documents >10MB, high volume

**Architecture**:
```
Client → Supabase Edge Function (queue job) → Background Worker (thepipe-service) → Result
```

**Tools**:
- [Bull](https://github.com/OptimalBits/bull) (Node.js)
- [Celery](https://celery.io/) (Python)
- `pg_cron` + PostgreSQL (Supabase-native)

---

## Recommended: Railway Deployment

### Step 1: Prepare Railway Config

```bash
cd /path/to/document-intelligence-suite
cat > services/thepipe-service/railway.json << 'EOF'
{
  "deploy": {
    "buildCommand": "pip install --no-cache-dir -r requirements.txt",
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "dockerfile": "Dockerfile",
    "nixpacks": false
  }
}
EOF
```

### Step 2: Deploy

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link <project-id>

# Set environment variables
railway variables set OPENAI_API_KEY "sk-..."
railway variables set SERVICE_API_KEY "secret-api-key-123"

# Deploy
railway up
```

### Step 3: Integration with Supabase

In your Edge Function or API:

```typescript
const THEPIPE_URL = Deno.env.get("THEPIPE_SERVICE_URL");
const THEPIPE_API_KEY = Deno.env.get("THEPIPE_API_KEY");

async function extractDocument(sourceUrl: string) {
  const response = await fetch(`${THEPIPE_URL}/extract`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${THEPIPE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_url: sourceUrl,
      options: { semantic: false, text_only: false },
    }),
  });

  if (!response.ok) throw new Error("Extraction failed");
  return response.json();
}
```

---

## Monitoring & Logging

### Railway Logs
```bash
railway logs -f  # Follow logs in real-time
```

### Health Check
```bash
curl https://your-thepipe-service.railway.app/health
# Response: {"status":"ok"}
```

### Metrics to Monitor
- **Average extraction time per document type**
- **OpenAI API usage and costs**
- **Error rates by source type**
- **Concurrent extraction requests**
- **Service availability (uptime %)**

---

## Cost Estimates

Assuming 100 extractions/day, average 3 seconds each, GPT-4o model:

| Deployment | Compute | API (GPT-4o) | Total/Month |
|------------|---------|--------------|------------|
| **Railway** | $10-20 | $25-75 | **$35-95** |
| **Vercel** | $0 (pay-per-use) | $25-75 | **$25-75** |
| **Supabase Edge Fn** | Included | $25-75 | **$25-75** |

> Note: API costs dominate (GPT-4o ≈ $0.01-0.02 per extraction)

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'thepipe'"
```bash
pip install -r requirements.txt --upgrade
```

### "OPENAI_API_KEY not set"
```bash
export OPENAI_API_KEY="sk-..."
# Or in Railway: railway variables set OPENAI_API_KEY "sk-..."
```

### "Timeout after 30 seconds"
This is expected for documents >50MB. Use async queue approach instead.

### "Rate limited by OpenAI"
Implement request queuing with exponential backoff. See `app/main.py` for example middleware.

---

## Next Steps

1. ✅ Evaluate performance locally (`scripts/evaluate.py`)
2. ✅ Compare deployment options above
3. ✅ Choose Railway, Vercel, or Async Queue
4. ✅ Deploy and test in staging
5. ✅ Integrate with main Supabase Edge Functions
6. ✅ Monitor costs and performance

See `THEPIPE_SERVICE_PLAN.md` for full feature specification.
