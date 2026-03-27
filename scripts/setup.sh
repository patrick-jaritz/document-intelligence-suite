#!/bin/bash

# Document Intelligence Suite - Setup Script
# This script handles the initial setup and configuration

set -e

echo "🔧 Document Intelligence Suite - Setup Script"
echo "============================================="

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
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Install Supabase CLI
install_supabase_cli() {
    print_status "Installing Supabase CLI..."
    
    if ! command -v supabase &> /dev/null; then
        npm install -g supabase
        print_success "Supabase CLI installed"
    else
        print_status "Supabase CLI already installed"
    fi
}

# Setup frontend dependencies
setup_frontend() {
    print_status "Setting up frontend dependencies..."
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        npm install
        print_success "Frontend dependencies installed"
    else
        print_status "Frontend dependencies already installed"
    fi
    
    cd ..
}

# Create environment files
create_env_files() {
    print_status "Creating environment files..."
    
    # Frontend .env.local
    if [ ! -f "frontend/.env.local" ]; then
        cat > frontend/.env.local << EOF
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Custom API endpoints
# VITE_API_BASE_URL=http://localhost:3001
EOF
        print_success "Created frontend/.env.local"
    else
        print_status "frontend/.env.local already exists"
    fi
    
    # Root .env.example
    if [ ! -f ".env.example" ]; then
        cat > .env.example << EOF
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# LLM Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
GOOGLE_GEMINI_API_KEY=...

# OCR Provider API Keys
GOOGLE_VISION_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
OCR_SPACE_API_KEY=...
EOF
        print_success "Created .env.example"
    else
        print_status ".env.example already exists"
    fi
}

# Initialize Supabase project
init_supabase() {
    print_status "Initializing Supabase project..."
    
    if [ ! -f "supabase/config.toml" ]; then
        print_error "Supabase config not found. Please ensure supabase/config.toml exists."
        exit 1
    fi
    
    print_success "Supabase project initialized"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p temp
    mkdir -p uploads
    
    print_success "Directories created"
}

# Setup Git hooks (optional)
setup_git_hooks() {
    print_status "Setting up Git hooks..."
    
    if [ -d ".git" ]; then
        # Create pre-commit hook
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Run linting and type checking before commit

echo "Running pre-commit checks..."

# Check frontend
cd frontend
npm run lint
npm run typecheck
cd ..

echo "Pre-commit checks passed!"
EOF
        
        chmod +x .git/hooks/pre-commit
        print_success "Git hooks configured"
    else
        print_warning "Not a Git repository, skipping Git hooks"
    fi
}

# Display next steps
show_next_steps() {
    echo ""
    print_success "Setup complete! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Configure your Supabase project:"
    echo "   - Create a new project at https://supabase.com"
    echo "   - Copy your project URL and keys to frontend/.env.local"
    echo ""
    echo "2. Set up your API keys:"
    echo "   - Get API keys from OpenAI, Anthropic, Mistral, etc."
    echo "   - Add them to your Supabase project secrets"
    echo ""
    echo "3. Run database migrations:"
    echo "   supabase db push"
    echo ""
    echo "4. Deploy Edge Functions:"
    echo "   supabase functions deploy"
    echo ""
    echo "5. Start development:"
    echo "   npm run dev"
    echo ""
    echo "For detailed instructions, see README.md"
}

# Main setup function
main() {
    echo ""
    print_status "Starting setup process..."
    echo ""
    
    check_dependencies
    install_supabase_cli
    setup_frontend
    create_env_files
    init_supabase
    create_directories
    setup_git_hooks
    
    show_next_steps
}

# Run main function
main "$@"
