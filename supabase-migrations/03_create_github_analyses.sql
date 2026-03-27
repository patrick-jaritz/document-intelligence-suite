-- Create github_analyses table
CREATE TABLE IF NOT EXISTS github_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    repository_url TEXT NOT NULL,
    repository_name TEXT NOT NULL,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_github_analyses_repository_url ON github_analyses(repository_url);
CREATE INDEX IF NOT EXISTS idx_github_analyses_repository_name ON github_analyses(repository_name);
CREATE INDEX IF NOT EXISTS idx_github_analyses_created_at ON github_analyses(created_at);

-- Enable Row Level Security
ALTER TABLE github_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view github analyses" ON github_analyses
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert github analyses" ON github_analyses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert sample data
INSERT INTO github_analyses (repository_url, repository_name, analysis_data, created_at) VALUES
(
    'https://github.com/amaiya/onprem',
    'amaiya/onprem',
    '{
        "metadata": {
            "stars": 8500,
            "forks": 450,
            "watchers": 1200,
            "openIssues": 23,
            "size": 125000,
            "language": "Python",
            "license": "Apache-2.0",
            "topics": ["ai", "on-premise", "llm", "deployment"]
        },
        "summary": {
            "tldr": "OnPrem is a powerful open-source platform for deploying and managing LLMs on-premises with enterprise-grade security and scalability.",
            "technicalSummary": "Modern Python-based architecture with Docker containerization, RESTful APIs, and comprehensive monitoring.",
            "businessSummary": "High commercial potential targeting enterprise customers needing secure, private AI deployments.",
            "executiveSummary": "Strong investment opportunity with clear market demand for private AI infrastructure."
        },
        "technicalAnalysis": {
            "techStack": ["Python", "Docker", "FastAPI", "PostgreSQL", "Redis"],
            "architecture": "Microservices-based with container orchestration",
            "codeQuality": "High - well-structured, documented, and tested",
            "testing": "Comprehensive test coverage with CI/CD pipeline",
            "security": "Enterprise-grade with encryption and access controls",
            "documentation": "Excellent documentation and examples"
        },
        "useCases": {
            "primary": ["Enterprise AI Deployment", "Private LLM Hosting", "Secure AI Infrastructure"],
            "secondary": ["Research Platforms", "Government AI Systems", "Healthcare AI"],
            "integrations": ["Kubernetes", "AWS/GCP/Azure", "Enterprise SSO"],
            "industries": ["Enterprise Software", "Government", "Healthcare", "Finance"],
            "targetAudience": ["Enterprise IT Teams", "AI Researchers", "Security-Conscious Organizations"],
            "businessModels": ["Open Source with Enterprise Support", "SaaS Platform", "Consulting Services"],
            "marketOpportunities": ["Growing demand for private AI", "Enterprise security requirements", "Regulatory compliance needs"],
            "competitiveAdvantages": ["Open source transparency", "Enterprise features", "Active community"],
            "scalingPotential": "High - cloud-native architecture supports massive scale",
            "monetizationStrategies": ["Enterprise licensing", "Professional support", "Managed services"],
            "partnershipOpportunities": ["Cloud providers", "Enterprise software vendors", "Security companies"],
            "investmentPotential": "Strong - clear market demand and scalable technology",
            "exitStrategies": ["Strategic acquisition by major cloud provider", "IPO after enterprise market penetration"]
        },
        "recommendations": {
            "strengths": ["Strong technical foundation", "Clear market need", "Active development"],
            "improvements": ["Enhanced UI/UX", "More integrations", "Better documentation"],
            "risks": ["Competition from cloud providers", "Market saturation", "Technology changes"],
            "adoptionPotential": "High - addresses real enterprise needs"
        }
    }',
    NOW() - INTERVAL '1 day'
),
(
    'https://github.com/microsoft/vscode',
    'microsoft/vscode',
    '{
        "metadata": {
            "stars": 150000,
            "forks": 26000,
            "watchers": 8500,
            "openIssues": 8500,
            "size": 2500000,
            "language": "TypeScript",
            "license": "MIT",
            "topics": ["editor", "typescript", "electron", "development"]
        },
        "summary": {
            "tldr": "Visual Studio Code is a lightweight, powerful source code editor with extensive extension ecosystem and cross-platform support.",
            "technicalSummary": "Electron-based desktop application with TypeScript/JavaScript core, plugin architecture, and comprehensive API.",
            "businessSummary": "Dominant position in developer tools market with strong monetization through extensions and enterprise features.",
            "executiveSummary": "Market leader with sustainable competitive advantage and strong revenue potential."
        },
        "technicalAnalysis": {
            "techStack": ["TypeScript", "Electron", "Node.js", "CSS", "HTML"],
            "architecture": "Modular architecture with extension system",
            "codeQuality": "Excellent - Microsoft-grade development practices",
            "testing": "Comprehensive automated testing",
            "security": "Regular security updates and vulnerability management",
            "documentation": "Extensive documentation and community resources"
        },
        "useCases": {
            "primary": ["Code Development", "Web Development", "Scripting", "Documentation"],
            "secondary": ["Data Analysis", "DevOps", "Learning", "Prototyping"],
            "integrations": ["Git", "Docker", "Azure", "GitHub", "Extensions"],
            "industries": ["Software Development", "Web Development", "Education", "Enterprise"],
            "targetAudience": ["Developers", "Students", "IT Professionals", "Designers"],
            "businessModels": ["Open-source with paid extensions", "Support and services", "Enterprise licensing"],
            "marketOpportunities": ["Growing developer population", "Remote work trends", "AI-assisted development"],
            "competitiveAdvantages": ["Market leadership", "Extensive ecosystem", "Cross-platform support"],
            "scalingPotential": "Massive - already serving millions of developers globally",
            "monetizationStrategies": ["Extension marketplace", "Enterprise features", "Cloud services"],
            "partnershipOpportunities": ["Extension developers", "Cloud providers", "Enterprise customers"],
            "investmentPotential": "Exceptional - market leader with strong moats",
            "exitStrategies": ["Already owned by Microsoft - strategic asset"]
        },
        "recommendations": {
            "strengths": ["Market leadership", "Strong ecosystem", "Microsoft backing"],
            "improvements": ["Performance optimization", "AI integration", "Mobile support"],
            "risks": ["Competition from web-based editors", "Platform dependencies", "Market saturation"],
            "adoptionPotential": "Universal - industry standard tool"
        }
    }',
    NOW() - INTERVAL '2 days'
),
(
    'https://github.com/openai/openai-python',
    'openai/openai-python',
    '{
        "metadata": {
            "stars": 25000,
            "forks": 4200,
            "watchers": 1800,
            "openIssues": 150,
            "size": 85000,
            "language": "Python",
            "license": "MIT",
            "topics": ["openai", "python", "ai", "api", "machine-learning"]
        },
        "summary": {
            "tldr": "Official Python library for OpenAI API, providing easy access to GPT models, embeddings, and other AI services.",
            "technicalSummary": "Well-maintained Python SDK with comprehensive API coverage, async support, and type hints.",
            "businessSummary": "Critical infrastructure for AI application development with strong adoption in the developer community.",
            "executiveSummary": "Essential tool for AI development with significant market influence and revenue potential."
        },
        "technicalAnalysis": {
            "techStack": ["Python", "httpx", "pydantic", "typing", "asyncio"],
            "architecture": "Clean SDK architecture with modular design",
            "codeQuality": "Excellent - professional Python development practices",
            "testing": "Comprehensive test suite with high coverage",
            "security": "Secure API handling with proper authentication",
            "documentation": "Extensive documentation and examples"
        },
        "useCases": {
            "primary": ["AI Application Development", "Chatbot Development", "Content Generation"],
            "secondary": ["Research Projects", "Educational Tools", "Prototyping"],
            "integrations": ["FastAPI", "Django", "Flask", "Streamlit", "Jupyter"],
            "industries": ["AI/ML", "Education", "Healthcare", "Finance", "Entertainment"],
            "targetAudience": ["AI Developers", "Data Scientists", "Researchers", "Students"],
            "businessModels": ["Open source with premium API access", "Developer ecosystem support", "Enterprise partnerships"],
            "marketOpportunities": ["AI development boom", "Enterprise AI adoption", "Educational AI tools"],
            "competitiveAdvantages": ["Official OpenAI support", "Comprehensive API coverage", "Active community"],
            "scalingPotential": "Very high - supports millions of developers",
            "monetizationStrategies": ["API usage fees", "Enterprise support", "Premium features"],
            "partnershipOpportunities": ["Framework integrations", "Cloud providers", "Enterprise software"],
            "investmentPotential": "Exceptional - core infrastructure for AI revolution",
            "exitStrategies": ["Strategic acquisition unlikely (already owned by OpenAI)", "Continued growth and expansion"]
        },
        "recommendations": {
            "strengths": ["Official support", "Comprehensive features", "Active development"],
            "improvements": ["Better error handling", "More examples", "Performance optimization"],
            "risks": ["API dependency", "Competition from alternatives", "Rate limiting"],
            "adoptionPotential": "Very high - essential for OpenAI development"
        }
    }',
    NOW() - INTERVAL '3 days'
);
