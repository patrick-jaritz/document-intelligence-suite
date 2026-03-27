#!/bin/bash

# Document Intelligence Suite - Deployment Script
# This script handles the complete deployment process

set -e

echo "🚀 Document Intelligence Suite - Deployment Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Please install it first:"
        echo "npm install -g supabase"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Setup frontend dependencies
setup_frontend() {
    print_status "Setting up frontend dependencies..."
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_status "Frontend dependencies already installed"
    fi
    
    cd ..
    print_success "Frontend setup complete"
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    cd frontend
    
    npm run build
    
    cd ..
    print_success "Frontend build complete"
}

# Deploy Supabase functions
deploy_supabase() {
    print_status "Deploying Supabase Edge Functions..."
    
    # Check if user is logged in to Supabase
    if ! supabase projects list &> /dev/null; then
        print_error "Not logged in to Supabase. Please run 'supabase login' first."
        exit 1
    fi
    
    # Deploy functions
    supabase functions deploy generate-embeddings
    supabase functions deploy rag-query
    supabase functions deploy process-pdf-ocr
    supabase functions deploy generate-structured-output
    
    print_success "Supabase functions deployed"
}

# Deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Deploy frontend
    cd frontend
    vercel --prod --yes
    
    cd ..
    print_success "Frontend deployed to Vercel"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Check if we're connected to a project
    if ! supabase status &> /dev/null; then
        print_error "Not connected to a Supabase project. Please run 'supabase link' first."
        exit 1
    fi
    
    # Run migrations
    supabase db push
    
    print_success "Database migrations complete"
}

# Set environment variables
set_env_vars() {
    print_status "Setting up environment variables..."
    
    echo ""
    echo "Please set the following environment variables in your Supabase project:"
    echo ""
    echo "Required API Keys:"
    echo "- OPENAI_API_KEY"
    echo "- ANTHROPIC_API_KEY"
    echo "- MISTRAL_API_KEY"
    echo "- GOOGLE_GEMINI_API_KEY"
    echo ""
    echo "OCR Provider Keys (choose based on your needs):"
    echo "- GOOGLE_VISION_API_KEY"
    echo "- AWS_ACCESS_KEY_ID"
    echo "- AWS_SECRET_ACCESS_KEY"
    echo "- AZURE_DOCUMENT_INTELLIGENCE_KEY"
    echo "- OCR_SPACE_API_KEY"
    echo ""
    echo "To set these, run:"
    echo "supabase secrets set KEY_NAME=your_key_value"
    echo ""
    
    read -p "Press Enter when you've set the environment variables..."
}

# Main deployment function
main() {
    echo ""
    print_status "Starting deployment process..."
    echo ""
    
    # Parse command line arguments
    DEPLOY_FRONTEND=true
    DEPLOY_SUPABASE=true
    DEPLOY_VERCEL=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --frontend-only)
                DEPLOY_SUPABASE=false
                DEPLOY_VERCEL=false
                shift
                ;;
            --supabase-only)
                DEPLOY_FRONTEND=false
                DEPLOY_VERCEL=false
                shift
                ;;
            --no-vercel)
                DEPLOY_VERCEL=false
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --frontend-only    Deploy only the frontend"
                echo "  --supabase-only    Deploy only Supabase functions"
                echo "  --no-vercel        Skip Vercel deployment"
                echo "  --help             Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_dependencies
    
    if [ "$DEPLOY_FRONTEND" = true ]; then
        setup_frontend
        build_frontend
    fi
    
    if [ "$DEPLOY_SUPABASE" = true ]; then
        set_env_vars
        run_migrations
        deploy_supabase
    fi
    
    if [ "$DEPLOY_VERCEL" = true ]; then
        deploy_vercel
    fi
    
    echo ""
    print_success "Deployment complete! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Set up your domain in Vercel (if needed)"
    echo "2. Configure CORS settings in Supabase"
    echo "3. Test your deployment"
    echo ""
    echo "For support, check the README.md file"
}

# Run main function
main "$@"
