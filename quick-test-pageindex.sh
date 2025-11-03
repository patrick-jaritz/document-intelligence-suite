#!/bin/bash

# Quick PageIndex Test Script
# Tests API key and basic functionality

echo "🧪 Quick PageIndex API Test"
echo "============================"
echo ""

# Set API key
export PAGEINDEX_API_KEY="7535a44ab7c34d6c978009fd571c0bac"
export OPENAI_API_KEY="${OPENAI_API_KEY:-$(grep OPENAI_API_KEY .env 2>/dev/null | cut -d '=' -f2-)}"

echo "✅ PageIndex API Key: ${PAGEINDEX_API_KEY:0:10}..."
echo "✅ OpenAI API Key: ${OPENAI_API_KEY:+Set}"

if [ -z "$OPENAI_API_KEY" ]; then
  echo "⚠️  Warning: OPENAI_API_KEY not found"
  echo "   Set it with: export OPENAI_API_KEY='your-key'"
fi

echo ""
echo "📋 To test with a PDF:"
echo "   deno run --allow-net --allow-read --allow-env test-pageindex.ts \\"
echo "     ./your-document.pdf \\"
echo "     \"What is this document about?\""
echo ""
echo "📋 Or test API key directly:"
echo "   curl -H \"Authorization: Bearer ${PAGEINDEX_API_KEY}\" \\"
echo "        https://api.pageindex.ai/v1/documents"
echo ""

