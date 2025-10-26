#!/bin/bash

# Deployment script for integrated Markdown conversion pipeline
# This script deploys the new Edge Functions to Supabase

set -e

echo "🚀 Deploying Integrated Markdown Conversion Pipeline"
echo "=================================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please login first:"
    echo "   supabase login"
    exit 1
fi

echo "✅ Supabase CLI is installed and logged in"

# Deploy the new Edge Functions
echo ""
echo "📦 Deploying new Edge Functions..."

echo "1. Deploying markdown-converter function..."
supabase functions deploy markdown-converter

echo "2. Deploying process-pdf-ocr-markdown function..."
supabase functions deploy process-pdf-ocr-markdown

echo "3. Deploying process-rag-markdown function..."
supabase functions deploy process-rag-markdown

echo ""
echo "✅ All Edge Functions deployed successfully!"

# Run database migration
echo ""
echo "🗄️ Running database migration..."
supabase db push

echo ""
echo "🧪 Running integration tests..."
node test-integrated-pipeline.js

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Summary of deployed functions:"
echo "   - markdown-converter: Standalone Markdown conversion"
echo "   - process-pdf-ocr-markdown: OCR + Markdown for Data Extract"
echo "   - process-rag-markdown: OCR + Markdown + Embeddings for RAG"
echo ""
echo "🔧 Database updates:"
echo "   - Added markdown_text column to processing_jobs"
echo "   - Added markdown_metadata column to processing_jobs"
echo "   - Added markdown_enabled column to processing_jobs"
echo "   - Added conversion_method column to processing_jobs"
echo "   - Enhanced rag_documents table with Markdown support"
echo ""
echo "🎯 Next steps:"
echo "   1. Test the enhanced RAG view in the frontend"
echo "   2. Test the enhanced document processor"
echo "   3. Monitor performance metrics"
echo "   4. Gather user feedback"
echo ""
echo "📊 You can now use the integrated pipeline with:"
echo "   - Better LLM performance through clean Markdown text"
echo "   - Enhanced RAG accuracy with structured embeddings"
echo "   - Comprehensive processing metadata"
echo "   - Fallback support for backward compatibility"
