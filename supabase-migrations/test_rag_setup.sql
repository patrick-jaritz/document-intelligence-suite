-- =====================================================
-- RAG Setup Verification Test
-- =====================================================
-- Run this in Supabase SQL Editor to verify everything is set up correctly
-- =====================================================

-- Test 1: Check if pgvector extension exists
SELECT 'Test 1: pgvector extension' as test_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
            THEN '✅ PASS' ELSE '❌ FAIL - Run: CREATE EXTENSION vector;' 
       END as result;

-- Test 2: Check if tables exist
SELECT 'Test 2: rag_documents table' as test_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rag_documents')
            THEN '✅ PASS' ELSE '❌ FAIL - Table missing' 
       END as result
UNION ALL
SELECT 'Test 2: document_chunks table' as test_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_chunks')
            THEN '✅ PASS' ELSE '❌ FAIL - Table missing' 
       END as result
UNION ALL
SELECT 'Test 2: rag_sessions table' as test_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rag_sessions')
            THEN '✅ PASS' ELSE '❌ FAIL - Table missing' 
       END as result;

-- Test 3: Check if RPC function exists
SELECT 'Test 3: match_document_chunks function' as test_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_document_chunks')
            THEN '✅ PASS' ELSE '❌ FAIL - Function missing' 
       END as result;

-- Test 4: Check if vector index exists
SELECT 'Test 4: Vector similarity index' as test_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_indexes 
         WHERE indexname = 'idx_document_chunks_embedding'
       )
       THEN '✅ PASS' ELSE '⚠️  WARNING - Index missing (optional but recommended)' 
       END as result;

-- Test 5: Count existing data
SELECT 'Test 5: Existing documents' as test_name,
       COALESCE((SELECT COUNT(*)::text FROM rag_documents), '0') || ' documents' as result
UNION ALL
SELECT 'Test 5: Existing chunks' as test_name,
       COALESCE((SELECT COUNT(*)::text FROM document_chunks), '0') || ' chunks' as result
UNION ALL
SELECT 'Test 5: Existing sessions' as test_name,
       COALESCE((SELECT COUNT(*)::text FROM rag_sessions), '0') || ' Q&A sessions' as result;

-- =====================================================
-- Expected Results:
-- All tests should show ✅ PASS
-- If any show ❌ FAIL, run the 01_rag_schema.sql migration
-- =====================================================

