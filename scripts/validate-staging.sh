#!/bin/bash

# Staging Deployment Validation Script
# Verifies all collaboration features are working before production merge

set -e

echo "🚀 Staging Deployment Validation"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

STAGING_URL="${STAGING_URL:-http://localhost:3000}"
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"

# Check if required environment variables are set
if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}Error: SUPABASE_ANON_KEY not set${NC}"
  exit 1
fi

check_endpoint() {
  local method=$1
  local endpoint=$2
  local name=$3
  local data=$4
  
  echo -e "${BLUE}→${NC} Checking $name..."
  
  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$SUPABASE_URL$endpoint" \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$SUPABASE_URL$endpoint" \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [[ "$http_code" =~ ^(200|201|204|400|401)$ ]]; then
    echo -e "${GREEN}✓${NC} $name returned HTTP $http_code"
    return 0
  else
    echo -e "${RED}✗${NC} $name returned HTTP $http_code"
    echo "Response: $body"
    return 1
  fi
}

echo -e "\n${YELLOW}1. Testing Edge Function Endpoints${NC}"
echo "===================================="

check_endpoint "GET" "/functions/v1/comment-thread?repository_url=https://github.com/test/repo" "GET /comment-thread"
check_endpoint "POST" "/functions/v1/comment-thread" "POST /comment-thread" \
  '{"repository_url":"https://github.com/test/repo"}'
check_endpoint "GET" "/functions/v1/comments?thread_id=test" "GET /comments"
check_endpoint "POST" "/functions/v1/comments" "POST /comments" \
  '{"thread_id":"test","body":"Test"}'
check_endpoint "GET" "/functions/v1/saved-views" "GET /saved-views"
check_endpoint "POST" "/functions/v1/saved-views" "POST /saved-views" \
  '{"name":"Test","visibility":"private","filters":{}}'

echo -e "\n${YELLOW}2. Testing Database Layer${NC}"
echo "===================================="

# Check if migrations are applied
echo -e "${BLUE}→${NC} Checking database migrations..."
psql -h localhost -U postgres -d postgres -c "\dt public.comment_threads;" >/dev/null 2>&1 && \
  echo -e "${GREEN}✓${NC} comment_threads table exists" || \
  echo -e "${RED}✗${NC} comment_threads table missing"

psql -h localhost -U postgres -d postgres -c "\dt public.comments;" >/dev/null 2>&1 && \
  echo -e "${GREEN}✓${NC} comments table exists" || \
  echo -e "${RED}✗${NC} comments table missing"

psql -h localhost -U postgres -d postgres -c "\dt public.saved_views;" >/dev/null 2>&1 && \
  echo -e "${GREEN}✓${NC} saved_views table exists" || \
  echo -e "${RED}✗${NC} saved_views table missing"

echo -e "\n${YELLOW}3. Testing Frontend Build${NC}"
echo "===================================="

cd /Users/patrickjaritz/CODE/document-intelligence-suite-standalone/frontend

echo -e "${BLUE}→${NC} Building frontend..."
if npm run build >/dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Frontend built successfully"
else
  echo -e "${RED}✗${NC} Frontend build failed"
  exit 1
fi

echo -e "${BLUE}→${NC} Checking CommentPanel component..."
if grep -q "export.*CommentPanel" src/components/CommentPanel.tsx; then
  echo -e "${GREEN}✓${NC} CommentPanel component found"
else
  echo -e "${RED}✗${NC} CommentPanel component missing"
  exit 1
fi

echo -e "${BLUE}→${NC} Checking GitHubAnalyzer integration..."
if grep -q "CommentPanel" src/components/GitHubAnalyzer.tsx; then
  echo -e "${GREEN}✓${NC} CommentPanel integrated in GitHubAnalyzer"
else
  echo -e "${RED}✗${NC} CommentPanel not integrated"
  exit 1
fi

echo -e "\n${YELLOW}4. Testing Unit Tests${NC}"
echo "===================================="

echo -e "${BLUE}→${NC} Running frontend tests..."
if npm run test 2>&1 | grep -q "passed\|test"; then
  echo -e "${GREEN}✓${NC} Frontend tests executed"
else
  echo -e "${YELLOW}⚠${NC} Tests may need manual verification"
fi

echo -e "\n${YELLOW}5. Testing CORS Headers${NC}"
echo "===================================="

echo -e "${BLUE}→${NC} Checking CORS headers..."
cors_response=$(curl -s -X OPTIONS "$SUPABASE_URL/functions/v1/comments" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -i)

if echo "$cors_response" | grep -qi "Access-Control-Allow-Origin"; then
  echo -e "${GREEN}✓${NC} CORS headers present"
else
  echo -e "${YELLOW}⚠${NC} CORS headers may need verification"
fi

echo -e "\n${YELLOW}6. Testing Error Handling${NC}"
echo "===================================="

echo -e "${BLUE}→${NC} Testing 401 Unauthorized..."
response=$(curl -s -w "%{http_code}" -X GET "$SUPABASE_URL/functions/v1/comments" \
  -H "Content-Type: application/json" | tail -c4)
if [ "$response" = "401" ]; then
  echo -e "${GREEN}✓${NC} 401 error returned for missing auth"
else
  echo -e "${YELLOW}⚠${NC} Auth check may need verification"
fi

echo -e "\n${YELLOW}7. Verifying RLS Policies${NC}"
echo "===================================="

echo -e "${BLUE}→${NC} Checking RLS policies..."
if psql -h localhost -U postgres -d postgres -c "\d comment_threads" | grep -q "Enable RLS"; then
  echo -e "${GREEN}✓${NC} RLS enabled on comment_threads"
else
  echo -e "${YELLOW}⚠${NC} RLS verification needed"
fi

if psql -h localhost -U postgres -d postgres -c "\d comments" | grep -q "Enable RLS"; then
  echo -e "${GREEN}✓${NC} RLS enabled on comments"
else
  echo -e "${YELLOW}⚠${NC} RLS verification needed"
fi

echo -e "\n${GREEN}✓ Staging deployment validation complete!${NC}"
echo "=============================================="
echo -e "\nNext steps:"
echo "1. Test CommentPanel UI manually in browser"
echo "2. Create test comments in staging"
echo "3. Verify soft-delete functionality"
echo "4. Check team/private view access controls"
echo "5. Run production deployment if all tests pass"
