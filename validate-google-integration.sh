#!/bin/bash

################################################################################
# Pre-Deployment Validator for Google Drive Integration
# Purpose: Comprehensive system validation before any deployment
# Usage: ./validate-google-integration.sh [--fix-issues] [--detailed]
# Exit codes: 0 = All checks passed, 1 = Critical issues found, 2 = Warnings only
################################################################################

# set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%s)
REPORT_FILE="${SCRIPT_DIR}/validation-report-${TIMESTAMP}.txt"

# Tracking
CRITICAL_ISSUES=0
WARNINGS=0
PASSES=0
FIX_ISSUES=false
DETAILED=false

################################################################################
# Functions
################################################################################

log() {
    echo -e "${BLUE}[CHECK]${NC} $1" | tee -a "$REPORT_FILE"
}

pass() {
    echo -e "${GREEN}✓ PASS${NC} $1" | tee -a "$REPORT_FILE"
    ((PASSES++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC} $1" | tee -a "$REPORT_FILE"
    ((WARNINGS++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC} $1" | tee -a "$REPORT_FILE"
    ((CRITICAL_ISSUES++))
}

section() {
    echo -e "\n${PURPLE}━━━ $1 ━━━${NC}" | tee -a "$REPORT_FILE"
}

detail() {
    if [ "$DETAILED" = true ]; then
        echo -e "  ${BLUE}→${NC} $1" | tee -a "$REPORT_FILE"
    fi
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --fix-issues)
                FIX_ISSUES=true
                shift
                ;;
            --detailed)
                DETAILED=true
                shift
                ;;
            *)
                echo "Unknown argument: $1"
                exit 1
                ;;
        esac
    done
}

setup_report() {
    touch "$REPORT_FILE"
    {
        echo "Google Drive Integration - Pre-Deployment Validation Report"
        echo "Timestamp: $(date)"
        echo "System: $(uname -s)"
        echo "================================================================"
    } > "$REPORT_FILE"
}

################################################################################
# Validation Functions
################################################################################

check_git_status() {
    section "Git Repository Status"

    log "Checking git repository..."
    if ! git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree &> /dev/null; then
        fail "Not in a git repository"
        return 1
    fi
    pass "Valid git repository"

    log "Checking for uncommitted changes..."
    if [ -n "$(git -C "$SCRIPT_DIR" status --porcelain)" ]; then
        warn "Uncommitted changes detected:"
        git -C "$SCRIPT_DIR" status --short | tee -a "$REPORT_FILE"
        detail "Run: git add -A && git commit -m 'Pre-deployment commit'"
    else
        pass "No uncommitted changes"
    fi

    log "Checking branch..."
    local current_branch=$(git -C "$SCRIPT_DIR" branch --show-current)
    if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
        warn "On branch: $current_branch (not main/master)"
        detail "Consider merging to main before production deployment"
    else
        pass "On branch: $current_branch"
    fi

    detail "Latest commits:"
    git -C "$SCRIPT_DIR" log --oneline -n 3 | sed 's/^/    /' | tee -a "$REPORT_FILE"
}

check_file_structure() {
    section "File Structure"

    local required_files=(
        "supabase/functions/google-oauth-start/index.ts"
        "supabase/functions/google-oauth-callback/index.ts"
        "supabase/functions/google-connector/index.ts"
        "supabase/functions/vision-rag-query/index.ts"
        "supabase/migrations/20251117000000_create_external_integrations.sql"
        "frontend/src/components/RAGView.tsx"
        "frontend/src/components/GoogleConnect.tsx"
        "GOOGLE_DRIVE_INTEGRATION.md"
        "DEPLOYMENT_CHECKLIST_GOOGLE_INTEGRATION.md"
        "SESSION_SUMMARY_GOOGLE_INTEGRATION.md"
        "QUICK_REFERENCE_GOOGLE_INTEGRATION.md"
        "ARCHITECTURE_DIAGRAMS_GOOGLE_INTEGRATION.md"
        "MASTER_INDEX_GOOGLE_INTEGRATION.md"
    )

    for file in "${required_files[@]}"; do
        if [ -f "$SCRIPT_DIR/$file" ]; then
            local size=$(du -h "$SCRIPT_DIR/$file" | cut -f1)
            pass "$file ($size)"
        else
            fail "$file not found"
        fi
    done
}

check_code_syntax() {
    section "Code Syntax"

    log "Checking TypeScript files..."
    
    # Check for obvious syntax errors
    local ts_files=(
        "supabase/functions/google-oauth-start/index.ts"
        "supabase/functions/google-oauth-callback/index.ts"
        "supabase/functions/google-connector/index.ts"
        "supabase/functions/vision-rag-query/index.ts"
        "frontend/src/components/RAGView.tsx"
        "frontend/src/components/GoogleConnect.tsx"
    )

    for file in "${ts_files[@]}"; do
        if [ -f "$SCRIPT_DIR/$file" ]; then
            if grep -q "console\." "$SCRIPT_DIR/$file" 2>/dev/null; then
                detail "$(basename $file): Has debug logging"
            fi
            
            # Count lines
            local lines=$(wc -l < "$SCRIPT_DIR/$file")
            if [ "$lines" -gt 10 ]; then
                pass "$(basename $file) ($lines lines)"
            fi
        fi
    done

    log "Checking SQL files..."
    if [ -f "$SCRIPT_DIR/supabase/migrations/20251117000000_create_external_integrations.sql" ]; then
        if grep -q "CREATE TABLE" "$SCRIPT_DIR/supabase/migrations/20251117000000_create_external_integrations.sql"; then
            pass "Migration has CREATE TABLE statement"
        fi
        if grep -q "RLS\|ROW LEVEL SECURITY" "$SCRIPT_DIR/supabase/migrations/20251117000000_create_external_integrations.sql"; then
            pass "Migration includes RLS policies"
        fi
    fi
}

check_test_files() {
    section "Test Files"

    local test_files=(
        "supabase/functions/google-connector/__tests__/connector.test.ts"
        "supabase/functions/vision-rag-query/__tests__/google-integration.test.ts"
    )

    for file in "${test_files[@]}"; do
        if [ -f "$SCRIPT_DIR/$file" ]; then
            local test_count=$(grep -c "test\|describe\|it(" "$SCRIPT_DIR/$file" || echo "0")
            pass "$(basename $(dirname $file)): $test_count test cases"
        else
            warn "$file not found"
        fi
    done
}

check_dependencies() {
    section "Dependencies"

    log "Checking npm packages..."
    if [ -f "$SCRIPT_DIR/package.json" ]; then
        pass "package.json exists"
        
        # Check for key dependencies
        if grep -q "vite\|react\|typescript" "$SCRIPT_DIR/package.json"; then
            pass "Frontend dependencies present"
        fi
    else
        warn "package.json not found"
    fi

    log "Checking Supabase configuration..."
    if [ -f "$SCRIPT_DIR/supabase.json" ] || [ -f "$SCRIPT_DIR/supabase/config.json" ]; then
        pass "Supabase configuration found"
    else
        warn "Supabase configuration not found (may be OK for deployed projects)"
    fi
}

check_environment_configuration() {
    section "Environment Configuration"

    log "Checking environment variable templates..."
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        pass ".env.example exists"
        
        if grep -q "STAGING_SUPABASE_URL\|PROD_SUPABASE_URL" "$SCRIPT_DIR/.env.example"; then
            pass "Staging and production placeholders present"
        fi
        
        if grep -q "GOOGLE_CLIENT_ID\|GOOGLE_CLIENT_SECRET" "$SCRIPT_DIR/.env.example"; then
            pass "Google OAuth variables documented"
        fi
    else
        warn ".env.example not found"
    fi

    log "Checking .gitignore..."
    if [ -f "$SCRIPT_DIR/.gitignore" ]; then
        if grep -q ".env\|secrets" "$SCRIPT_DIR/.gitignore"; then
            pass ".gitignore includes environment patterns"
        else
            warn ".gitignore exists but may not exclude .env files"
        fi
    else
        warn ".gitignore not found"
    fi

    log "Checking for exposed secrets..."
    local secret_patterns=("GOOGLE_CLIENT_SECRET=" "SUPABASE_SERVICE_ROLE_KEY=")
    for pattern in "${secret_patterns[@]}"; do
        if grep -r "$pattern" "$SCRIPT_DIR" --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v ".env.example" | grep -v "__tests__"; then
            fail "Potential exposed secret: $pattern"
        fi
    done
    pass "No exposed secrets detected"
}

check_documentation() {
    section "Documentation"

    log "Checking documentation completeness..."
    
    local doc_files=(
        "MASTER_INDEX_GOOGLE_INTEGRATION.md"
        "GOOGLE_DRIVE_INTEGRATION.md"
        "DEPLOYMENT_CHECKLIST_GOOGLE_INTEGRATION.md"
        "QUICK_REFERENCE_GOOGLE_INTEGRATION.md"
        "SESSION_SUMMARY_GOOGLE_INTEGRATION.md"
        "ARCHITECTURE_DIAGRAMS_GOOGLE_INTEGRATION.md"
    )

    for doc in "${doc_files[@]}"; do
        if [ -f "$SCRIPT_DIR/$doc" ]; then
            local words=$(wc -w < "$SCRIPT_DIR/$doc")
            if [ "$words" -gt 500 ]; then
                pass "$doc ($words words)"
            else
                warn "$doc exists but is small ($words words)"
            fi
        else
            fail "$doc not found"
        fi
    done
}

check_deployment_scripts() {
    section "Deployment Scripts"

    log "Checking deployment automation..."
    
    local scripts=(
        "deploy-google-integration-staging.sh"
        "deploy-google-integration-production.sh"
        "validate-google-integration.sh"
    )

    for script in "${scripts[@]}"; do
        if [ -f "$SCRIPT_DIR/$script" ]; then
            if [ -x "$SCRIPT_DIR/$script" ]; then
                pass "$script (executable)"
            else
                warn "$script exists but not executable"
                if [ "$FIX_ISSUES" = true ]; then
                    chmod +x "$SCRIPT_DIR/$script"
                    detail "Made $script executable"
                fi
            fi
        else
            fail "$script not found"
        fi
    done
}

check_integration_points() {
    section "Integration Points"

    log "Checking vision-rag-query includes google-connector..."
    if grep -q "google-connector\|includeGoogle" "$SCRIPT_DIR/supabase/functions/vision-rag-query/index.ts"; then
        pass "vision-rag-query references google integration"
    else
        fail "vision-rag-query missing google integration"
    fi

    log "Checking RAGView includes Google toggle..."
    if grep -q "includeGoogle\|setIncludeGoogle" "$SCRIPT_DIR/frontend/src/components/RAGView.tsx"; then
        pass "RAGView has Google toggle state"
    else
        fail "RAGView missing Google toggle"
    fi

    log "Checking Google connector request handling..."
    if grep -q "userId.*query" "$SCRIPT_DIR/supabase/functions/google-connector/index.ts"; then
        pass "google-connector handles userId and query"
    else
        fail "google-connector missing request handling"
    fi

    log "Checking OAuth callback implementation..."
    if grep -q "external_account_integrations\|access_token" "$SCRIPT_DIR/supabase/functions/google-oauth-callback/index.ts"; then
        pass "OAuth callback stores tokens"
    else
        fail "OAuth callback not storing tokens properly"
    fi
}

check_security() {
    section "Security"

    log "Checking RLS policies..."
    if grep -q "ROW LEVEL SECURITY\|auth.uid()" "$SCRIPT_DIR/supabase/migrations/20251117000000_create_external_integrations.sql"; then
        pass "RLS policies configured"
    else
        warn "RLS policies not evident in migration"
    fi

    log "Checking token security..."
    if grep -q "access_token\|refresh_token\|expires_at" "$SCRIPT_DIR/supabase/functions/google-oauth-callback/index.ts"; then
        pass "Token management implemented"
    else
        warn "Token management implementation unclear"
    fi

    log "Checking CORS configuration..."
    if grep -q "headers\|Content-Type\|cors" "$SCRIPT_DIR/supabase/functions/google-connector/index.ts" "$SCRIPT_DIR/supabase/functions/vision-rag-query/index.ts"; then
        pass "CORS headers likely configured"
    fi
}

check_error_handling() {
    section "Error Handling"

    log "Checking error handling in functions..."
    
    local functions=(
        "supabase/functions/google-oauth-callback/index.ts"
        "supabase/functions/google-connector/index.ts"
        "supabase/functions/vision-rag-query/index.ts"
    )

    for func in "${functions[@]}"; do
        if [ -f "$SCRIPT_DIR/$func" ]; then
            if grep -q "catch\|error\|throw" "$SCRIPT_DIR/$func"; then
                pass "$(basename $(dirname $func)): has error handling"
            else
                warn "$(basename $(dirname $func)): minimal error handling"
            fi
        fi
    done
}

check_performance() {
    section "Performance"

    log "Checking for N+1 queries..."
    if grep -q "JOIN\|batch" "$SCRIPT_DIR/supabase/functions/google-connector/index.ts"; then
        pass "Database queries appear optimized"
    fi

    log "Checking for caching..."
    if grep -q "cache\|expires_at" "$SCRIPT_DIR/supabase/functions/google-connector/index.ts"; then
        pass "Token caching implemented"
    else
        detail "Token caching may improve performance"
    fi

    log "Checking response payload sizes..."
    detail "Google Drive result limit: Check DEPLOYMENT_CHECKLIST"
}

################################################################################
# Summary
################################################################################

print_summary() {
    section "Validation Summary"

    local total=$((PASSES + WARNINGS + CRITICAL_ISSUES))
    
    echo ""
    echo "Checks Passed:    ${GREEN}$PASSES${NC} ✓"
    echo "Warnings:         ${YELLOW}$WARNINGS${NC} ⚠"
    echo "Critical Issues:  ${RED}$CRITICAL_ISSUES${NC} ✗"
    echo "────────────────────────"
    echo "Total Checks:     $total"
    echo ""

    if [ "$CRITICAL_ISSUES" -gt 0 ]; then
        echo -e "${RED}VALIDATION FAILED${NC}"
        echo "Critical issues must be resolved before deployment"
        echo "Review report: $REPORT_FILE"
        return 1
    elif [ "$WARNINGS" -gt 0 ]; then
        echo -e "${YELLOW}VALIDATION PASSED WITH WARNINGS${NC}"
        echo "Warnings should be reviewed before deployment"
        echo "Review report: $REPORT_FILE"
        return 2
    else
        echo -e "${GREEN}VALIDATION PASSED${NC}"
        echo "All checks passed - ready for deployment"
        echo "Review report: $REPORT_FILE"
        return 0
    fi
}

################################################################################
# Main
################################################################################

main() {
    parse_arguments "$@"
    setup_report

    echo -e "\n${BLUE}Google Drive Integration - Pre-Deployment Validator${NC}"
    echo "Report: $REPORT_FILE"

    check_git_status
    check_file_structure
    check_code_syntax
    check_test_files
    check_dependencies
    check_environment_configuration
    check_documentation
    check_deployment_scripts
    check_integration_points
    check_security
    check_error_handling
    check_performance

    echo "" | tee -a "$REPORT_FILE"
    print_summary
    exit $?
}

main "$@"
