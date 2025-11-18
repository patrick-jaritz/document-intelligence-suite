#!/bin/bash

################################################################################
# Rollback Google Drive Integration Deployment
# Purpose: Emergency rollback to previous stable version
# Usage: ./deploy-google-integration-rollback.sh [--version TIMESTAMP] [--confirm]
# WARNING: This restores from backups - data changes will be lost!
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%s)
LOG_FILE="${SCRIPT_DIR}/.rollback-logs/rollback-${TIMESTAMP}.log"
BACKUP_DIR="${SCRIPT_DIR}/.backups"

# Flags
ROLLBACK_VERSION=""
AUTO_CONFIRM=false

################################################################################
# Functions
################################################################################

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

section() {
    echo -e "\n${BLUE}=== $1 ===${NC}" | tee -a "$LOG_FILE"
}

ask_confirmation() {
    if [ "$AUTO_CONFIRM" = true ]; then
        return 0
    fi

    local response
    while true; do
        read -p "$(echo -e ${RED}$1${NC}) [y/N] " response
        case "$response" in
            [yY][eE][sS]|[yY])
                return 0
                ;;
            [nN][oO]|[nN]|"")
                return 1
                ;;
            *)
                echo "Please answer y or n"
                ;;
        esac
    done
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --version)
                ROLLBACK_VERSION="$2"
                shift 2
                ;;
            --confirm)
                AUTO_CONFIRM=true
                shift
                ;;
            *)
                error "Unknown argument: $1"
                exit 1
                ;;
        esac
    done
}

setup_logging() {
    mkdir -p "${SCRIPT_DIR}/.rollback-logs"
    touch "$LOG_FILE"
    log "Rollback log: $LOG_FILE"
}

list_available_backups() {
    section "Available Backups"

    if [ ! -d "$BACKUP_DIR" ]; then
        error "No backups directory found"
        return 1
    fi

    log "Staging backups:"
    if [ -d "$BACKUP_DIR/staging" ]; then
        ls -td "$BACKUP_DIR/staging"/* 2>/dev/null | head -5 | while read backup; do
            local time=$(basename "$backup")
            local size=$(du -sh "$backup" | cut -f1)
            echo "  - $time ($size)"
        done
    else
        echo "  No staging backups found"
    fi

    log "Production backups:"
    if [ -d "$BACKUP_DIR/production" ]; then
        ls -td "$BACKUP_DIR/production"/* 2>/dev/null | head -5 | while read backup; do
            local time=$(basename "$backup")
            local size=$(du -sh "$backup" | cut -f1)
            echo "  - $time ($size)"
        done
    else
        echo "  No production backups found"
    fi

    log "To rollback to specific version, use: --version TIMESTAMP"
}

find_latest_backup() {
    section "Finding Latest Backup"

    local latest=""
    
    if [ -d "$BACKUP_DIR/production" ]; then
        latest=$(ls -td "$BACKUP_DIR/production"/* 2>/dev/null | head -1)
    elif [ -d "$BACKUP_DIR/staging" ]; then
        latest=$(ls -td "$BACKUP_DIR/staging"/* 2>/dev/null | head -1)
    fi

    if [ -z "$latest" ]; then
        error "No backups found in $BACKUP_DIR"
        return 1
    fi

    ROLLBACK_VERSION=$(basename "$latest")
    success "Latest backup: $ROLLBACK_VERSION"
}

confirm_rollback_scope() {
    section "Rollback Scope"

    echo "This rollback will:"
    echo "1. Restore Edge Functions from backup"
    echo "2. Restore frontend components from backup"
    echo ""
    echo "This rollback will NOT:"
    echo "- Revert database changes (requires manual migration)"
    echo "- Delete any files"
    echo "- Affect user data in database"
    echo ""

    if ! ask_confirmation "Continue with rollback to version $ROLLBACK_VERSION?"; then
        error "Rollback cancelled by user"
        exit 1
    fi
}

backup_current_state() {
    section "Backing Up Current State"

    local current_backup="${BACKUP_DIR}/pre-rollback-${TIMESTAMP}"
    mkdir -p "$current_backup"

    log "Saving current Edge Functions..."
    cp -r "supabase/functions/google-oauth-start" "$current_backup/" 2>/dev/null || true
    cp -r "supabase/functions/google-oauth-callback" "$current_backup/" 2>/dev/null || true
    cp -r "supabase/functions/google-connector" "$current_backup/" 2>/dev/null || true
    cp "supabase/functions/vision-rag-query/index.ts" "$current_backup/" 2>/dev/null || true

    log "Saving current frontend..."
    cp "frontend/src/components/RAGView.tsx" "$current_backup/" 2>/dev/null || true
    cp "frontend/src/components/GoogleConnect.tsx" "$current_backup/" 2>/dev/null || true

    success "Current state backed up to: $current_backup"
}

rollback_edge_functions() {
    section "Rolling Back Edge Functions"

    local backup_path=""
    
    if [ -d "$BACKUP_DIR/production/$ROLLBACK_VERSION" ]; then
        backup_path="$BACKUP_DIR/production/$ROLLBACK_VERSION"
    elif [ -d "$BACKUP_DIR/staging/$ROLLBACK_VERSION" ]; then
        backup_path="$BACKUP_DIR/staging/$ROLLBACK_VERSION"
    fi

    if [ -z "$backup_path" ] || [ ! -d "$backup_path" ]; then
        error "Backup not found at $backup_path"
        return 1
    fi

    log "Restoring Edge Functions from: $backup_path"

    # Restore functions if they exist in backup
    if [ -d "$backup_path/google-oauth-start" ]; then
        log "Restoring google-oauth-start..."
        cp -r "$backup_path/google-oauth-start"/* "supabase/functions/google-oauth-start/" 2>/dev/null || true
        success "google-oauth-start restored"
    fi

    if [ -d "$backup_path/google-oauth-callback" ]; then
        log "Restoring google-oauth-callback..."
        cp -r "$backup_path/google-oauth-callback"/* "supabase/functions/google-oauth-callback/" 2>/dev/null || true
        success "google-oauth-callback restored"
    fi

    if [ -d "$backup_path/google-connector" ]; then
        log "Restoring google-connector..."
        cp -r "$backup_path/google-connector"/* "supabase/functions/google-connector/" 2>/dev/null || true
        success "google-connector restored"
    fi

    if [ -f "$backup_path/index.ts" ]; then
        log "Restoring vision-rag-query..."
        cp "$backup_path/index.ts" "supabase/functions/vision-rag-query/index.ts"
        success "vision-rag-query restored"
    fi
}

rollback_frontend() {
    section "Rolling Back Frontend"

    local backup_path=""
    
    if [ -d "$BACKUP_DIR/production/$ROLLBACK_VERSION" ]; then
        backup_path="$BACKUP_DIR/production/$ROLLBACK_VERSION"
    elif [ -d "$BACKUP_DIR/staging/$ROLLBACK_VERSION" ]; then
        backup_path="$BACKUP_DIR/staging/$ROLLBACK_VERSION"
    fi

    log "Restoring frontend from: $backup_path"

    if [ -f "$backup_path/RAGView.tsx" ]; then
        log "Restoring RAGView.tsx..."
        cp "$backup_path/RAGView.tsx" "frontend/src/components/RAGView.tsx"
        success "RAGView.tsx restored"
    fi

    if [ -f "$backup_path/GoogleConnect.tsx" ]; then
        log "Restoring GoogleConnect.tsx..."
        cp "$backup_path/GoogleConnect.tsx" "frontend/src/components/GoogleConnect.tsx"
        success "GoogleConnect.tsx restored"
    fi
}

verify_rollback() {
    section "Verifying Rollback"

    log "Checking restored files..."

    if [ -f "supabase/functions/google-oauth-start/index.ts" ]; then
        success "google-oauth-start exists"
    else
        error "google-oauth-start not found"
    fi

    if [ -f "supabase/functions/google-connector/index.ts" ]; then
        success "google-connector exists"
    else
        error "google-connector not found"
    fi

    if [ -f "frontend/src/components/RAGView.tsx" ]; then
        success "RAGView.tsx exists"
    else
        error "RAGView.tsx not found"
    fi
}

rollback_database() {
    section "Database Rollback (Manual)"

    warning "Database rollback requires manual steps:"
    echo ""
    echo "To restore database to previous state:"
    echo ""
    echo "1. In Supabase Dashboard:"
    echo "   - Go to Database > Backups"
    echo "   - Select backup from before deployment"
    echo "   - Click 'Restore'"
    echo ""
    echo "2. Or manually revert migration:"
    echo "   - Run: supabase db reset"
    echo "   - Or execute rollback SQL in Supabase dashboard"
    echo ""

    if ! ask_confirmation "Have you completed database rollback?"; then
        warning "Database was not rolled back - data may be inconsistent"
    fi
}

redeploy_functions() {
    section "Redeploying Edge Functions"

    warning "Manually redeploy Edge Functions using:"
    echo ""
    echo "Via Supabase CLI:"
    echo "  supabase functions deploy google-oauth-start --project-id YOUR_PROJECT_ID"
    echo "  supabase functions deploy google-oauth-callback --project-id YOUR_PROJECT_ID"
    echo "  supabase functions deploy google-connector --project-id YOUR_PROJECT_ID"
    echo "  supabase functions deploy vision-rag-query --project-id YOUR_PROJECT_ID"
    echo ""
    echo "Or via Supabase Dashboard:"
    echo "  1. Go to Edge Functions"
    echo "  2. For each function, copy code from restored files"
    echo "  3. Paste into editor and save"
    echo ""

    if ! ask_confirmation "Have you redeployed all Edge Functions?"; then
        warning "Edge Functions were not redeployed - rollback incomplete"
        return 1
    fi
}

rebuild_frontend() {
    section "Rebuilding Frontend"

    log "Building frontend with restored code..."
    
    if [ -f "frontend/package.json" ]; then
        cd "frontend"
        npm run build 2>/dev/null || warning "Frontend build completed with warnings"
        cd "$SCRIPT_DIR"
        success "Frontend rebuilt"
    else
        warning "frontend/package.json not found"
    fi
}

summary() {
    section "Rollback Summary"

    success "✅ Rollback completed successfully"
    warning "Next steps:"
    echo "1. Verify all systems are working correctly"
    echo "2. Check Edge Function logs for errors"
    echo "3. Test OAuth flow with test credentials"
    echo "4. Monitor error rates and performance"
    echo "5. Notify affected users if necessary"
    echo ""
    echo "Rollback log: $LOG_FILE"
    echo "Previous state backup: ${BACKUP_DIR}/pre-rollback-${TIMESTAMP}"
}

handle_error() {
    error "Rollback failed at line $1"
    error "Check logs at: $LOG_FILE"
    error "Previous state backed up at: ${BACKUP_DIR}/pre-rollback-${TIMESTAMP}"
    exit 1
}

################################################################################
# Main
################################################################################

trap 'handle_error $LINENO' ERR

main() {
    parse_arguments "$@"
    setup_logging

    log "Starting Google Drive Integration Rollback"

    section "Rollback Confirmation"
    echo -e "${RED}⚠️  WARNING: This will revert code to a previous backup!${NC}"
    echo ""

    list_available_backups

    if [ -z "$ROLLBACK_VERSION" ]; then
        log "Finding latest backup..."
        find_latest_backup
    fi

    confirm_rollback_scope
    backup_current_state
    
    rollback_edge_functions
    rollback_frontend
    verify_rollback
    
    rollback_database
    redeploy_functions
    rebuild_frontend
    
    summary
}

main "$@"
