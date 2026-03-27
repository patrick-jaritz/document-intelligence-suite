# 🗄️ Database Migrations

This directory contains SQL migration scripts for the BRAITER Document Intelligence Suite.

## Migration Files

### 1. `01_initial_schema.sql`
**Purpose**: Creates all necessary tables for the application

**Tables Created**:
- `documents` - Document metadata and status
- `processing_jobs` - Job tracking for async processing
- `rag_sessions` - RAG conversation history
- `structure_templates` - JSON extraction templates
- `logs` - Application logs
- `performance_metrics` - Performance tracking
- `api_request_logs` - API usage logs
- `provider_health` - OCR/LLM provider status

**Includes**:
- Row Level Security (RLS) policies
- Indexes for performance
- pgvector extension for RAG embeddings
- Foreign key constraints

### 2. `force_insert_exam_template.sql`
**Purpose**: Force-insert/update the Exam Questions template

**What It Does**:
- Deletes existing "Exam Questions" template (if any)
- Inserts updated schema with:
  - MCQ support (multiple choice with options)
  - Short answer support
  - Essay prompts
  - True/False questions
  - Difficulty levels (1-5)
  - Solutions and explanations
  - Topic tags
- Verifies the insertion

**When to Use**: 
- After initial schema creation
- When updating the Exam Questions template schema
- If the template is missing or corrupted

---

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the SQL from the migration file
5. Click **Run** (or press `Cmd/Ctrl + Enter`)
6. Verify success in the output panel

### Option 2: Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref joqnpibrfzqflyogrkht

# Run migration
supabase db push
```

### Option 3: psql (Direct Database Access)

```bash
# Get connection string from Supabase Dashboard > Project Settings > Database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.joqnpibrfzqflyogrkht.supabase.co:5432/postgres"

# Run the migration
\i /path/to/01_initial_schema.sql
\i /path/to/force_insert_exam_template.sql
```

---

## Migration Order

⚠️ **IMPORTANT**: Run migrations in this order:

1. **First**: `01_initial_schema.sql` (creates all tables)
2. **Second**: `force_insert_exam_template.sql` (inserts templates)

---

## Verifying Migrations

After running migrations, verify with:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check templates
SELECT id, name, description, is_public 
FROM structure_templates 
ORDER BY name;

-- Verify pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```

Expected Results:
- **8 tables**: documents, processing_jobs, rag_sessions, structure_templates, logs, performance_metrics, api_request_logs, provider_health
- **15 templates**: Exam Questions, Invoice, Receipt, etc.
- **pgvector**: version 0.5.0 or higher
- **RLS policies**: Multiple policies per table

---

## Rollback

If you need to rollback a migration:

```sql
-- Drop all tables (DESTRUCTIVE - use with caution!)
DROP TABLE IF EXISTS api_request_logs CASCADE;
DROP TABLE IF EXISTS provider_health CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS processing_jobs CASCADE;
DROP TABLE IF EXISTS rag_sessions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS structure_templates CASCADE;

-- Drop pgvector extension
DROP EXTENSION IF EXISTS vector CASCADE;
```

⚠️ **WARNING**: This will delete ALL data. Only use in development/staging environments.

---

## Troubleshooting

### Error: `relation "structure_templates" does not exist`
**Solution**: Run `01_initial_schema.sql` first

### Error: `extension "vector" does not exist`
**Solution**: 
1. Ensure you have pgvector enabled in Supabase Dashboard
2. Go to Database > Extensions
3. Enable "vector" extension

### Error: `permission denied for table`
**Solution**: 
1. Ensure you're using the service role key or database password
2. Check RLS policies are correctly applied

### Error: `duplicate key value violates unique constraint`
**Solution**: 
- Template already exists
- Use `force_insert_exam_template.sql` which includes `DELETE` statement
- Or manually delete: `DELETE FROM structure_templates WHERE name = 'Exam Questions';`

---

## Development Workflow

When making schema changes:

1. Create a new migration file: `02_add_feature.sql`
2. Include rollback instructions in comments
3. Test in local Supabase instance first
4. Apply to staging/production
5. Update this README

---

## Schema Documentation

### Core Relationships

```
documents (1) ----< (many) processing_jobs
documents (1) ----< (many) rag_sessions
```

### Key Indexes

- `documents.id` (primary key, UUID)
- `processing_jobs.document_id` (foreign key index)
- `rag_sessions.document_id` (foreign key index)
- `structure_templates.name` (unique index)
- `logs.timestamp` (for efficient log queries)

### Constraints

- `documents.status`: enum ('pending', 'processing', 'completed', 'failed')
- `processing_jobs.job_type`: enum ('ocr', 'llm', 'rag')
- All timestamps: default `now()`
- All UUIDs: default `gen_random_uuid()`

---

## Support

If you encounter issues with migrations:

1. Check the Supabase logs: Dashboard > Logs
2. Verify database connection: Dashboard > Project Settings > Database
3. Review RLS policies: Dashboard > Authentication > Policies
4. Contact: Patrick Jaritz

---

**Last Updated**: 2025-01-15  
**Database Version**: PostgreSQL 15.6  
**pgvector Version**: 0.5.0+

