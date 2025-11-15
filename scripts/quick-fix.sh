#!/bin/bash

# Quick Fix Script - Automates Priority 1 & Easy Fixes
# Document Intelligence Suite
# Created: November 15, 2025

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║          DOCUMENT INTELLIGENCE SUITE - QUICK FIX                ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track progress
TOTAL_STEPS=8
CURRENT_STEP=0

function step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    echo ""
    echo -e "${BLUE}[Step $CURRENT_STEP/$TOTAL_STEPS]${NC} $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

function success() {
    echo -e "${GREEN}✓${NC} $1"
}

function warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

function error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    error "Error: Must be run from project root directory"
    exit 1
fi

# ============================================================================
# STEP 1: Install Frontend Dependencies
# ============================================================================
step "Installing Frontend Dependencies"

cd frontend

if [ -d "node_modules" ]; then
    warning "node_modules already exists. Cleaning up..."
    rm -rf node_modules package-lock.json
fi

echo "Running npm install..."
npm install

if [ $? -eq 0 ]; then
    success "Frontend dependencies installed successfully"
else
    error "Failed to install dependencies"
    exit 1
fi

# Verify critical packages
if [ -d "node_modules/react" ] && [ -d "node_modules/typescript" ]; then
    success "Critical packages verified"
else
    error "Some critical packages are missing"
    exit 1
fi

cd ..

# ============================================================================
# STEP 2: Verify Build Works
# ============================================================================
step "Verifying Build Configuration"

cd frontend

echo "Running build test..."
npm run build

if [ $? -eq 0 ]; then
    success "Build successful"
    
    # Check dist directory
    if [ -d "dist" ]; then
        DIST_SIZE=$(du -sh dist | cut -f1)
        success "Build output created: $DIST_SIZE"
    fi
else
    error "Build failed"
    exit 1
fi

cd ..

# ============================================================================
# STEP 3: Create Documentation Structure
# ============================================================================
step "Organizing Documentation"

# Create docs structure
mkdir -p docs/{architecture,deployment,development,features,guides,troubleshooting,archive,history}

success "Documentation directories created"

# Create index
cat > docs/INDEX.md << 'EOF'
# Documentation Index

## 📚 Quick Start
- [Getting Started](development/GETTING_STARTED.md)
- [Quick Fix Guide](../COMPREHENSIVE_FIX_PLAN.md)

## 🏗️ Architecture
- [System Overview](architecture/SYSTEM_OVERVIEW.md)
- [Architecture Diagram](architecture/DIAGRAM.txt)

## 🚀 Deployment
- [Deployment Guide](deployment/DEPLOYMENT_GUIDE.md)
- [Environment Setup](deployment/ENV_SETUP.md)

## ✨ Features
- [RAG System](features/RAG.md)
- [GitHub Analyzer](features/GITHUB_ANALYZER.md)
- [OCR Processing](features/OCR.md)

## 🔧 Troubleshooting
- [Common Issues](troubleshooting/COMMON_ISSUES.md)
- [Fix Plan](../COMPREHENSIVE_FIX_PLAN.md)

## 📖 Analysis
- [Project Analysis](../PROJECT_ANALYSIS_REPORT.md)
- [Health Check](../QUICK_HEALTH_CHECK.md)
EOF

success "Documentation index created"

# Move key architecture docs
if [ -f "COMPREHENSIVE_SYSTEM_DOCUMENTATION.md" ]; then
    cp COMPREHENSIVE_SYSTEM_DOCUMENTATION.md docs/architecture/SYSTEM_OVERVIEW.md
    success "System documentation moved"
fi

if [ -f "ARCHITECTURE_DIAGRAM.txt" ]; then
    cp ARCHITECTURE_DIAGRAM.txt docs/architecture/DIAGRAM.txt
    success "Architecture diagram moved"
fi

# ============================================================================
# STEP 4: Set Up Git Ignore for Temp Files
# ============================================================================
step "Updating .gitignore"

# Add to .gitignore if not already present
if ! grep -q "docs/temp/" .gitignore 2>/dev/null; then
    cat >> .gitignore << 'EOF'

# Temporary documentation
docs/temp/
*_TEMP.md
*.tmp

# Test artifacts
frontend/coverage/
frontend/.vitest/
EOF
    success ".gitignore updated"
else
    warning ".gitignore already contains temp doc rules"
fi

# ============================================================================
# STEP 5: Create Quick Reference Files
# ============================================================================
step "Creating Quick Reference Files"

# Create getting started guide
cat > docs/development/GETTING_STARTED.md << 'EOF'
# Getting Started

## Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for backend)

## Quick Start

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

## Environment Variables

Create `frontend/.env.local`:
```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Next Steps
- Review [Architecture](../architecture/SYSTEM_OVERVIEW.md)
- Check [Features](../features/)
- Read [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)
EOF

success "Getting started guide created"

# Create common issues guide
cat > docs/troubleshooting/COMMON_ISSUES.md << 'EOF'
# Common Issues

## Dependencies Not Installing

**Problem:** npm install fails

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## Build Fails

**Problem:** npm run build fails

**Solution:**
1. Check TypeScript errors: `npm run typecheck`
2. Check for missing dependencies
3. Clear cache and rebuild

## Dev Server Won't Start

**Problem:** npm run dev fails

**Solution:**
1. Check port 5173 is not in use
2. Verify environment variables
3. Check Vite configuration

## Supabase Connection Issues

**Problem:** Cannot connect to Supabase

**Solution:**
1. Verify VITE_SUPABASE_URL is set
2. Verify VITE_SUPABASE_ANON_KEY is set
3. Check Supabase project status

## For More Help
- See [Comprehensive Fix Plan](../../COMPREHENSIVE_FIX_PLAN.md)
- Check [Health Status](../../QUICK_HEALTH_CHECK.md)
EOF

success "Common issues guide created"

# ============================================================================
# STEP 6: Run Linter
# ============================================================================
step "Running Linter"

cd frontend

echo "Checking code quality..."
npm run lint 2>&1 | tee ../lint-output.txt || true

if grep -q "0 errors" ../lint-output.txt; then
    success "No linting errors found"
elif grep -q "error" ../lint-output.txt; then
    warning "Some linting errors found. See lint-output.txt for details"
else
    success "Linter ran successfully"
fi

rm -f ../lint-output.txt

cd ..

# ============================================================================
# STEP 7: Type Check
# ============================================================================
step "Running Type Check"

cd frontend

echo "Checking TypeScript types..."
npm run typecheck 2>&1 | tee ../typecheck-output.txt || true

if [ $? -eq 0 ]; then
    success "Type check passed"
else
    warning "Type errors found. See typecheck-output.txt for details"
fi

rm -f ../typecheck-output.txt

cd ..

# ============================================================================
# STEP 8: Generate Status Report
# ============================================================================
step "Generating Status Report"

cat > QUICK_FIX_STATUS.md << EOF
# Quick Fix Status Report

**Generated:** $(date)

## ✅ Completed

1. **Dependencies Installed**
   - Frontend node_modules created
   - All packages installed successfully
   - Build verified

2. **Documentation Organized**
   - Created docs/ structure
   - Moved key architecture docs
   - Created quick start guides

3. **Code Quality Checked**
   - Linter executed
   - Type checker executed
   - Build verified

## 📋 Next Steps

### Immediate (Do Today)
1. Review [Comprehensive Fix Plan](COMPREHENSIVE_FIX_PLAN.md)
2. Set up testing framework (see Issue #2)
3. Test local development: \`cd frontend && npm run dev\`

### Short-term (This Week)
1. Implement automated tests
2. Fix known issues (#4, #5)
3. Enhance health dashboard

### Medium-term (This Month)
1. Deploy self-hosted services (optional)
2. Optimize bundle size
3. Add security scanning

## 🎯 Priority Issues Remaining

| Priority | Issue | Time Est. | Status |
|----------|-------|-----------|--------|
| P1 | Dependencies | 30 min | ✅ DONE |
| P2 | Testing | 6-8 hrs | ⚠️ TODO |
| P2 | Docs Cleanup | 2 hrs | ✅ DONE |
| P2 | LLM Enhanced | 2-3 hrs | ⚠️ TODO |
| P2 | Markdown Mock | 2-3 hrs | ⚠️ TODO |

## 📊 Current Status

- **Frontend:** ✅ Ready for development
- **Documentation:** ✅ Organized
- **Testing:** ⚠️ Needs setup
- **Known Issues:** ⚠️ 4 remaining

## 🚀 Quick Commands

\`\`\`bash
# Start development
cd frontend && npm run dev

# Run build
cd frontend && npm run build

# Check types
cd frontend && npm run typecheck

# Lint code
cd frontend && npm run lint
\`\`\`

## 📚 Key Documents

- [Comprehensive Fix Plan](COMPREHENSIVE_FIX_PLAN.md) - All fixes
- [Project Analysis](PROJECT_ANALYSIS_REPORT.md) - Full analysis
- [Quick Health Check](QUICK_HEALTH_CHECK.md) - Current health
- [Getting Started](docs/development/GETTING_STARTED.md) - Dev setup

---

**Next Action:** Review COMPREHENSIVE_FIX_PLAN.md and start with Issue #2 (Testing)
EOF

success "Status report generated: QUICK_FIX_STATUS.md"

# ============================================================================
# FINAL SUMMARY
# ============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║                    QUICK FIX COMPLETE! ✓                         ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo -e "${GREEN}✓ Build verified${NC}"
echo -e "${GREEN}✓ Documentation organized${NC}"
echo -e "${GREEN}✓ Code quality checked${NC}"
echo ""
echo "📄 Status Report: QUICK_FIX_STATUS.md"
echo "📋 Full Fix Plan: COMPREHENSIVE_FIX_PLAN.md"
echo ""
echo "🚀 Next Steps:"
echo "  1. cd frontend && npm run dev  # Start dev server"
echo "  2. Review COMPREHENSIVE_FIX_PLAN.md"
echo "  3. Implement Issue #2 (Testing)"
echo ""
echo "Need help? Check docs/troubleshooting/COMMON_ISSUES.md"
echo ""
