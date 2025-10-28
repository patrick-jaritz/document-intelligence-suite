# Migration 4: Make document_id Nullable

## Problem
The `document_chunks` table has a foreign key constraint on `document_id` that requires it to reference an existing UUID in `rag_documents`. When the `rag_documents` record doesn't exist, the insert fails with a foreign key constraint violation.

## Solution
Make `document_id` nullable in `document_chunks` table. This allows the `generate-embeddings` function to insert chunks even when the `rag_documents` record hasn't been created yet.

## How to Apply
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Database > SQL Editor
4. Copy and paste the contents of `supabase-migrations/04_make_document_id_nullable.sql`
5. Click "Run"
