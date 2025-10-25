#!/bin/bash

# Development Setup Script
# This script helps set up the Document Intelligence Suite for development

set -e

echo "🚀 Document Intelligence Suite - Development Setup"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_info "Setting up Document Intelligence Suite for development..."

# 1. Check Node.js version
print_info "Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_status "Node.js $(node --version) is installed"
    else
        print_error "Node.js 18+ is required. Current version: $(node --version)"
        exit 1
    fi
else
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# 2. Install frontend dependencies
print_info "Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    print_status "Frontend dependencies installed"
else
    print_status "Frontend dependencies already installed"
fi

# 3. Check if Vercel CLI is installed
print_info "Checking Vercel CLI..."
if command -v vercel &> /dev/null; then
    print_status "Vercel CLI is installed"
else
    print_warning "Vercel CLI is not installed. Install with: npm install -g vercel"
fi

# 4. Check if Supabase CLI is installed
print_info "Checking Supabase CLI..."
if command -v supabase &> /dev/null; then
    print_status "Supabase CLI is installed"
else
    print_warning "Supabase CLI is not installed. Install with: npm install -g supabase"
fi

# 5. Check if Docker is installed (optional)
print_info "Checking Docker (optional)..."
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    print_status "Docker and Docker Compose are installed"
    DOCKER_AVAILABLE=true
else
    print_warning "Docker is not installed. Local AI services will not be available."
    print_info "The app will work fine using production APIs instead."
    DOCKER_AVAILABLE=false
fi

# 6. Build frontend
print_info "Building frontend..."
npm run build
print_status "Frontend built successfully"

cd ..

# 7. Create environment file if it doesn't exist
if [ ! -f "frontend/.env.local" ]; then
    print_info "Creating environment file..."
    cat > frontend/.env.local << EOF
VITE_SUPABASE_URL=https://joqnpibrfzqflyogrkht.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk
VITE_DISABLE_CLIENT_LOGS=true
EOF
    print_status "Environment file created"
fi

# 8. Test build
print_info "Testing production build..."
cd frontend
npm run build > /dev/null 2>&1
print_status "Production build test passed"

cd ..

# 9. Summary
echo ""
echo "🎉 Setup Complete!"
echo "=================="
print_status "Frontend dependencies installed"
print_status "Production build working"
print_status "Environment configured"

echo ""
echo "🚀 Next Steps:"
echo "=============="
echo "1. Start development server:"
echo "   cd frontend && npm run dev"
echo ""
echo "2. Access the application:"
echo "   - Local: http://localhost:5173"
echo "   - Health: http://localhost:5173/health"
echo "   - Production: https://document-intelligence-suite.vercel.app/"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "3. Optional - Start local AI services:"
    echo "   docker-compose --profile local-ai up -d"
    echo "   # Access at http://localhost:8080"
    echo ""
fi

echo "4. Deploy changes:"
echo "   git add . && git commit -m 'Update' && git push origin main"
echo ""

print_info "For detailed setup instructions, see DEVELOPMENT_SETUP.md"
print_info "For production deployment, the app is already live at:"
print_info "https://document-intelligence-suite.vercel.app/"

echo ""
print_status "Happy coding! 🚀"
