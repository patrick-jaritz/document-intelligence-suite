#!/bin/bash

# Health Monitoring Script for Collaboration Features
# Monitors production health and logs metrics

set -e

ENVIRONMENT="${1:-staging}"
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
LOG_FILE="/tmp/collaboration-health-$(date +%Y%m%d).log"
HEALTH_CHECK_INTERVAL=30  # seconds
DB_CHECK_INTERVAL=300    # seconds (5 minutes)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🏥 Health Monitoring System Started" | tee -a "$LOG_FILE"
echo "Environment: $ENVIRONMENT" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "Started at: $(date)" | tee -a "$LOG_FILE"
echo "---" | tee -a "$LOG_FILE"

# Initialize counters
HEALTH_CHECKS=0
FAILED_CHECKS=0
TOTAL_RESPONSE_TIME=0
SLOW_REQUESTS=0

# Function to check endpoint health
check_endpoint() {
  local endpoint=$1
  local name=$2
  
  local start_time=$(date +%s%N)
  
  response=$(curl -s -w "\n%{http_code}" -X GET "$SUPABASE_URL$endpoint" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    --max-time 10 2>/dev/null || echo "error")
  
  local end_time=$(date +%s%N)
  local response_time=$(( ($end_time - $start_time) / 1000000 ))  # Convert to ms
  
  http_code=$(echo "$response" | tail -n1)
  
  if [[ "$http_code" =~ ^(200|201|204|400|401)$ ]]; then
    status="${GREEN}✓${NC}"
    ((HEALTH_CHECKS++))
  else
    status="${RED}✗${NC}"
    ((FAILED_CHECKS++))
  fi
  
  if [ "$response_time" -gt 1000 ]; then
    speed="${YELLOW}[${response_time}ms - SLOW]${NC}"
    ((SLOW_REQUESTS++))
  else
    speed="${GREEN}[${response_time}ms]${NC}"
  fi
  
  ((TOTAL_RESPONSE_TIME += response_time))
  
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  message="[$timestamp] $status $name - HTTP $http_code $speed"
  echo -e "$message" | tee -a "$LOG_FILE"
}

# Function to check database connectivity
check_database() {
  echo "" | tee -a "$LOG_FILE"
  echo -e "${BLUE}→ Database Health Check${NC}" | tee -a "$LOG_FILE"
  
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Check connection
  if psql -h localhost -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "[$timestamp] ${GREEN}✓${NC} Database connected" | tee -a "$LOG_FILE"
  else
    echo -e "[$timestamp] ${RED}✗${NC} Database connection failed" | tee -a "$LOG_FILE"
    ((FAILED_CHECKS++))
    return 1
  fi
  
  # Check table row counts
  comment_threads=$(psql -h localhost -U postgres -d postgres -t -c "SELECT COUNT(*) FROM comment_threads;")
  comments=$(psql -h localhost -U postgres -d postgres -t -c "SELECT COUNT(*) FROM comments;")
  saved_views=$(psql -h localhost -U postgres -d postgres -t -c "SELECT COUNT(*) FROM saved_views;")
  
  echo -e "[$timestamp] comment_threads: $comment_threads rows" | tee -a "$LOG_FILE"
  echo -e "[$timestamp] comments: $comments rows" | tee -a "$LOG_FILE"
  echo -e "[$timestamp] saved_views: $saved_views rows" | tee -a "$LOG_FILE"
  
  # Check for errors in last hour
  recent_errors=$(psql -h localhost -U postgres -d postgres -t -c \
    "SELECT COUNT(*) FROM pg_stat_statements WHERE query LIKE '%ERROR%' AND query_start > NOW() - INTERVAL '1 hour';")
  
  if [ "$recent_errors" -gt 0 ]; then
    echo -e "[$timestamp] ${YELLOW}⚠${NC} Recent errors: $recent_errors" | tee -a "$LOG_FILE"
  fi
}

# Function to check Edge Function logs
check_edge_functions() {
  echo "" | tee -a "$LOG_FILE"
  echo -e "${BLUE}→ Edge Function Health Check${NC}" | tee -a "$LOG_FILE"
  
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Try to get last 10 lines from edge function logs
  # This would require Supabase CLI or direct database access
  echo -e "[$timestamp] Check Supabase dashboard for detailed logs" | tee -a "$LOG_FILE"
  echo -e "[$timestamp] https://app.supabase.com → Logs → Edge Functions" | tee -a "$LOG_FILE"
}

# Function to generate metrics summary
print_summary() {
  echo "" | tee -a "$LOG_FILE"
  echo -e "${BLUE}═════ Health Metrics Summary ═════${NC}" | tee -a "$LOG_FILE"
  
  if [ $HEALTH_CHECKS -eq 0 ]; then
    HEALTH_CHECKS=1  # Prevent division by zero
  fi
  
  AVG_RESPONSE_TIME=$(( TOTAL_RESPONSE_TIME / HEALTH_CHECKS ))
  FAILURE_RATE=$(( (FAILED_CHECKS * 100) / HEALTH_CHECKS ))
  
  echo "Health Checks: $HEALTH_CHECKS" | tee -a "$LOG_FILE"
  echo "Failed Checks: $FAILED_CHECKS" | tee -a "$LOG_FILE"
  echo "Failure Rate: $FAILURE_RATE%" | tee -a "$LOG_FILE"
  echo "Average Response Time: ${AVG_RESPONSE_TIME}ms" | tee -a "$LOG_FILE"
  echo "Slow Requests (>1s): $SLOW_REQUESTS" | tee -a "$LOG_FILE"
  
  if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "\nStatus: ${GREEN}🟢 HEALTHY${NC}" | tee -a "$LOG_FILE"
  elif [ $FAILED_CHECKS -le 2 ]; then
    echo -e "\nStatus: ${YELLOW}🟡 WARNING${NC}" | tee -a "$LOG_FILE"
  else
    echo -e "\nStatus: ${RED}🔴 CRITICAL${NC}" | tee -a "$LOG_FILE"
  fi
  
  echo "Timestamp: $(date)" | tee -a "$LOG_FILE"
  echo "═════════════════════════════════${NC}" | tee -a "$LOG_FILE"
}

# Main monitoring loop
last_db_check=0

while true; do
  current_time=$(date +%s)
  
  echo "" | tee -a "$LOG_FILE"
  echo -e "${BLUE}→ Health Check Round${NC} ($(date '+%H:%M:%S'))" | tee -a "$LOG_FILE"
  
  # Check Edge Function endpoints
  check_endpoint "/functions/v1/comment-thread?repository_url=https://github.com/test/repo" "GET /comment-thread"
  check_endpoint "/functions/v1/comments?thread_id=test" "GET /comments"
  check_endpoint "/functions/v1/saved-views" "GET /saved-views"
  
  # Periodic database check
  if [ $((current_time - last_db_check)) -ge $DB_CHECK_INTERVAL ]; then
    check_database
    check_edge_functions
    last_db_check=$current_time
  fi
  
  # Print summary every 10 checks
  if [ $((HEALTH_CHECKS % 10)) -eq 0 ]; then
    print_summary
  fi
  
  # Wait before next check
  sleep $HEALTH_CHECK_INTERVAL
done
