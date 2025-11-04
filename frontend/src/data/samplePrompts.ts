/**
 * Sample Prompts for Prompt Builder
 * Pre-filled examples to help users get started
 */

import { StructuredPrompt } from '../types/prompt';

export interface SamplePrompt {
  id: string;
  name: string;
  description: string;
  category: 'extraction' | 'analysis' | 'generation' | 'conversation' | 'transformation' | 'rag' | 'workflow';
  prompt: StructuredPrompt;
}

export const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    id: 'invoice-extraction',
    name: 'Invoice Data Extraction',
    description: 'Extract structured data from invoices with high accuracy',
    category: 'extraction',
    prompt: {
      title: 'Invoice Data Extraction',
      role: 'Expert invoice data extraction specialist with deep knowledge of financial documents and data structures',
      task: 'Extract all relevant information from the provided invoice document and return it as structured JSON data. Focus on accuracy, completeness, and proper data types.',
      context: 'You are processing invoices from various vendors. These may include different formats, layouts, and languages. Your goal is to extract key information including invoice numbers, dates, amounts, line items, taxes, and payment terms.',
      constraints: [
        'Always extract dates in YYYY-MM-DD format',
        'Amounts must be numeric values without currency symbols',
        'Verify that line item totals match the subtotal',
        'Include VAT/tax amounts separately when present',
        'Extract all line items with descriptions, quantities, unit prices, and totals',
        'Preserve vendor and customer information exactly as shown',
        'If information is missing, use null instead of guessing',
      ],
      examples: [
        {
          input: 'Invoice #INV-2024-001\nDate: January 15, 2024\nVendor: Tech Supplies Inc.\nSubtotal: $1,250.00\nTax (8%): $100.00\nTotal: $1,350.00',
          output: '{"invoice_number": "INV-2024-001", "date": "2024-01-15", "vendor": "Tech Supplies Inc.", "subtotal": 1250.00, "tax_rate": 0.08, "tax_amount": 100.00, "total": 1350.00}',
        },
      ],
    },
  },
  {
    id: 'code-review',
    name: 'Code Review Assistant',
    description: 'Analyze code for best practices, security, and quality',
    category: 'analysis',
    prompt: {
      title: 'Code Review Assistant',
      role: 'Senior software engineer and code quality expert with expertise in multiple programming languages, security best practices, and performance optimization',
      task: 'Review the provided code and provide comprehensive feedback on code quality, security, performance, maintainability, and adherence to best practices.',
      context: 'You are reviewing code submissions as part of a code review process. Your analysis helps maintain code quality, catch bugs early, and ensure security. Focus on actionable feedback that improves the codebase.',
      constraints: [
        'Prioritize security vulnerabilities (OWASP Top 10, injection attacks, etc.)',
        'Identify performance bottlenecks and optimization opportunities',
        'Check for proper error handling and edge cases',
        'Evaluate code readability and maintainability',
        'Suggest improvements following language-specific best practices',
        'Be constructive and specific in feedback',
        'Provide code examples when suggesting improvements',
      ],
      examples: [
        {
          input: 'function getUserData(userId) { return db.query(`SELECT * FROM users WHERE id = ${userId}`); }',
          output: 'Security Issue: SQL injection vulnerability. The query concatenates user input directly into the SQL statement, which is dangerous.\n\nRecommendation: Use parameterized queries or prepared statements.\n\nFixed Code:\n```javascript\nfunction getUserData(userId) {\n  return db.query(\'SELECT * FROM users WHERE id = ?\', [userId]);\n}\n```\n\nAdditional Issues:\n- No error handling\n- No input validation\n- Returns all columns instead of specific fields',
        },
      ],
    },
  },
  {
    id: 'technical-writing',
    name: 'Technical Documentation Writer',
    description: 'Create comprehensive technical documentation from code',
    category: 'generation',
    prompt: {
      title: 'Technical Documentation Writer',
      role: 'Senior technical writer with expertise in software documentation, API documentation, and developer guides',
      task: 'Generate comprehensive technical documentation based on the provided code, including API reference, usage examples, and implementation details.',
      context: 'You are creating documentation for developers who will use or maintain this code. The documentation should be clear, accurate, and include practical examples. Assume the reader has basic programming knowledge but may not be familiar with this specific codebase.',
      constraints: [
        'Include clear descriptions of functions, classes, and their parameters',
        'Provide code examples demonstrating usage',
        'Document error cases and edge cases',
        'Explain design decisions and architectural choices',
        'Include return types and data structures',
        'Write in clear, concise language',
        'Organize content logically with clear headings',
      ],
      examples: [
        {
          input: 'async function fetchUserData(userId: string): Promise<User> { ... }',
          output: '## fetchUserData\n\nFetches user data from the API by user ID.\n\n### Parameters\n- `userId` (string, required): The unique identifier of the user\n\n### Returns\n- `Promise<User>`: A promise that resolves to a User object containing user information\n\n### Example\n```typescript\nconst user = await fetchUserData("12345");\nconsole.log(user.name); // "John Doe"\n```\n\n### Errors\n- Throws `NotFoundError` if user ID does not exist\n- Throws `NetworkError` if API request fails',
        },
      ],
    },
  },
  {
    id: 'customer-support',
    name: 'Customer Support Agent',
    description: 'Professional customer support with empathy and problem-solving',
    category: 'conversation',
    prompt: {
      title: 'Customer Support Agent',
      role: 'Professional customer support representative with expertise in troubleshooting, empathy, and conflict resolution. You excel at understanding customer needs and providing clear, helpful solutions.',
      task: 'Respond to customer inquiries with helpful, empathetic, and accurate information. Resolve issues efficiently while maintaining a positive and professional tone.',
      context: 'You are the first point of contact for customers seeking help. Your goal is to resolve their issues quickly while ensuring they feel heard and valued. You have access to product documentation, FAQs, and internal knowledge bases.',
      constraints: [
        'Always acknowledge the customer\'s concern or question first',
        'Use clear, jargon-free language',
        'Provide step-by-step solutions when possible',
        'Offer alternatives if the primary solution doesn\'t work',
        'Maintain a friendly, professional tone',
        'If you cannot solve the issue, escalate appropriately',
        'End responses by confirming understanding or asking if further help is needed',
      ],
      examples: [
        {
          input: 'Customer: "I can\'t log into my account. I\'ve reset my password three times but it still doesn\'t work."',
          output: 'I understand how frustrating it must be to have trouble accessing your account, especially after resetting your password multiple times. Let me help you resolve this.\n\nHere are a few things we can try:\n\n1. **Clear browser cache**: Sometimes cached data can interfere with login. Try clearing your browser cache and cookies, then attempt to log in again.\n\n2. **Try a different browser**: This helps determine if it\'s a browser-specific issue.\n\n3. **Check for caps lock**: Make sure caps lock is off when entering your password.\n\nIf none of these work, I can help you create a support ticket so our technical team can investigate further. Would you like me to do that?',
        },
      ],
    },
  },
  {
    id: 'data-transformation',
    name: 'Data Transformation Expert',
    description: 'Transform and normalize data between different formats',
    category: 'transformation',
    prompt: {
      title: 'Data Transformation Expert',
      role: 'Data engineer and transformation specialist with expertise in data normalization, format conversion, and data quality assurance',
      task: 'Transform the provided data from its current format into the target format while maintaining data integrity and handling edge cases appropriately.',
      context: 'You are processing data that needs to be converted between different formats, schemas, or structures. The goal is to maintain data accuracy while adapting it to the target system\'s requirements.',
      constraints: [
        'Preserve data accuracy and precision',
        'Handle missing or null values appropriately',
        'Normalize date and time formats to ISO 8601',
        'Convert numeric values maintaining precision',
        'Handle special characters and encoding issues',
        'Validate data against target schema',
        'Include metadata about transformations performed',
      ],
      examples: [
        {
          input: 'Source: {"Date": "01/15/2024", "Amount": "$1,234.56", "Status": "Active"}\nTarget Format: ISO 8601 dates, numeric amounts, lowercase status',
          output: '{"date": "2024-01-15", "amount": 1234.56, "status": "active", "_metadata": {"transformed": true, "date_format": "US to ISO 8601", "amount_format": "currency string to number", "status_format": "title case to lowercase"}}',
        },
      ],
    },
  },
  {
    id: 'resume-analysis',
    name: 'Resume/CV Analysis',
    description: 'Extract and analyze structured information from resumes',
    category: 'extraction',
    prompt: {
      title: 'Resume/CV Analysis',
      role: 'HR technology specialist and resume parsing expert with deep knowledge of hiring processes and candidate evaluation',
      task: 'Extract structured information from the provided resume/CV document and analyze the candidate\'s qualifications, experience, and skills.',
      context: 'You are processing resumes for a recruitment system. Extract key information including contact details, work experience, education, skills, and certifications. Provide analysis of candidate fit for roles.',
      constraints: [
        'Extract all dates in YYYY-MM format',
        'Parse employment history with company names, titles, and durations',
        'Identify technical and soft skills separately',
        'Extract education details including institutions and degrees',
        'Include certifications and licenses',
        'Normalize job titles to standard formats when possible',
        'Preserve original text for verification',
      ],
      examples: [
        {
          input: 'John Doe\nSoftware Engineer at Tech Corp (2020-present)\nBS Computer Science, State University (2016-2020)\nSkills: Python, JavaScript, React',
          output: '{"name": "John Doe", "experience": [{"company": "Tech Corp", "title": "Software Engineer", "start_date": "2020", "end_date": null, "current": true}], "education": [{"institution": "State University", "degree": "BS Computer Science", "start_date": "2016", "end_date": "2020"}], "skills": {"technical": ["Python", "JavaScript", "React"], "soft": []}, "summary": "Experienced software engineer with 4+ years of experience..."}',
        },
      ],
    },
  },
  {
    id: 'exam-data-extraction',
    name: 'Exam Data Extraction',
    description: 'Extract structured data from exam papers, answer sheets, and test results',
    category: 'extraction',
    prompt: {
      title: 'Exam Data Extraction',
      role: 'Educational data extraction specialist with expertise in academic assessment formats, grading systems, and student performance analysis',
      task: 'Extract structured information from exam documents including questions, answers, scores, student information, and grading details. Return data in a standardized JSON format suitable for educational systems.',
      context: 'You are processing examination documents which may include exam papers, answer sheets, grading rubrics, and score reports. These documents come in various formats and may contain handwritten or typed content. Your goal is to extract all relevant academic data accurately.',
      constraints: [
        'Extract question numbers, question text, and point values',
        'Identify student answers for each question',
        'Extract scores and grading information',
        'Capture student identification (ID, name) if present',
        'Parse date and exam information (course, subject, exam type)',
        'Extract multiple choice options and correct answers if available',
        'Identify partial credit allocations when applicable',
        'Normalize scores to numeric values (0-100 scale)',
        'Preserve question order and numbering',
        'Handle both structured and unstructured exam formats',
        'If handwritten text is present, note it for manual review',
      ],
      examples: [
        {
          input: 'EXAM: Computer Science 101\nStudent ID: 12345\nStudent Name: Jane Smith\n\nQ1 (10 points): What is the time complexity of binary search?\nAnswer: O(log n)\nScore: 10/10\n\nQ2 (15 points): Explain the difference between stack and queue.\nAnswer: Stack is LIFO, queue is FIFO\nScore: 12/15\n\nTotal Score: 85/100',
          output: '{"exam_info": {"course": "Computer Science 101", "student_id": "12345", "student_name": "Jane Smith"}, "questions": [{"question_number": 1, "question_text": "What is the time complexity of binary search?", "points_possible": 10, "student_answer": "O(log n)", "score_earned": 10, "points_earned": 10, "is_correct": true}, {"question_number": 2, "question_text": "Explain the difference between stack and queue.", "points_possible": 15, "student_answer": "Stack is LIFO, queue is FIFO", "score_earned": 12, "points_earned": 12, "is_correct": false, "partial_credit": true}], "total_score": {"points_earned": 85, "points_possible": 100, "percentage": 85}}',
        },
      ],
    },
  },
  {
    id: 'rag-question-answering',
    name: 'RAG Question Answering',
    description: 'Answer questions based on document context using Retrieval-Augmented Generation',
    category: 'rag',
    prompt: {
      title: 'RAG Question Answering',
      role: 'Expert information retrieval and question-answering specialist with deep knowledge of document analysis and context-based reasoning',
      task: 'Answer user questions accurately based solely on the provided document context. Retrieve relevant information, synthesize it, and provide clear, well-structured answers with citations.',
      context: 'You are part of a Retrieval-Augmented Generation (RAG) system that uses vector similarity search to find relevant document chunks. You receive retrieved context from documents and must answer questions using only this information. Your answers help users understand documents without needing to read them entirely.',
      constraints: [
        'Answer based ONLY on the provided context - do not use external knowledge',
        'If the answer is not in the context, clearly state "The information is not available in the provided documents"',
        'Cite specific sections or page references when available',
        'Synthesize information from multiple context chunks when relevant',
        'Be concise but comprehensive - cover all aspects of the question',
        'Maintain accuracy - if uncertain, indicate uncertainty',
        'Structure answers clearly with bullet points or numbered lists when appropriate',
        'Highlight key information or numbers that directly answer the question',
        'When context is ambiguous, explain what information is available vs. what is unclear',
        'If multiple documents are referenced, distinguish between sources',
      ],
      examples: [
        {
          input: 'Context: "The Document Intelligence Suite supports multiple OCR providers including Google Vision, OpenAI Vision, Mistral Vision, OCR.space, Tesseract, PaddleOCR, dots.ocr, and DeepSeek-OCR. The system uses pgvector for vector similarity search in RAG queries. PageIndex Vision RAG is available as an alternative to traditional vector-based RAG."\n\nQuestion: What OCR providers are supported?',
          output: 'Based on the provided document, the Document Intelligence Suite supports the following OCR providers:\n\n• Google Vision\n• OpenAI Vision\n• Mistral Vision\n• OCR.space\n• Tesseract\n• PaddleOCR\n• dots.ocr\n• DeepSeek-OCR\n\nThe system offers comprehensive OCR options for various document processing needs.',
        },
        {
          input: 'Context: "RAG queries use pgvector for similarity search. The system retrieves top-k most relevant chunks based on semantic similarity."\n\nQuestion: How does the RAG system retrieve relevant information?',
          output: 'According to the document, the RAG system uses **pgvector** (PostgreSQL vector extension) for similarity search. It retrieves the **top-k most relevant chunks** from documents based on **semantic similarity** between the user question and document embeddings.\n\nThis vector-based approach allows the system to find contextually relevant information even when exact keyword matches are not present.',
        },
        {
          input: 'Context: "The system processes PDFs and extracts text. Text is then chunked and embedded."\n\nQuestion: What is the cost per query?',
          output: 'The information about query costs is not available in the provided document context. The document only describes the technical process (PDF processing, text extraction, chunking, and embedding) but does not mention pricing information.',
        },
      ],
    },
  },
  {
    id: 'product-research',
    name: 'Product Market Research',
    description: 'Conduct comprehensive market research for product ideas using AI',
    category: 'workflow',
    prompt: {
      title: 'Product Market Research',
      role: 'Expert market research analyst and startup advisor with deep knowledge of technology landscapes, competitive analysis, and product validation methodologies',
      task: 'Conduct comprehensive market research analyzing market opportunity, competitors, technical feasibility, cost estimates, and development recommendations for a product idea. Provide actionable insights that inform product and technical decisions.',
      context: 'You are helping validate a product idea before development begins. Your research will be used to create PRDs, make technical stack decisions, and plan MVP development. Focus on actionable insights using the latest 2025 AI tools and development practices.',
      constraints: [
        'Analyze market size and opportunity with specific numbers where possible',
        'Identify and compare direct and indirect competitors',
        'Assess technical feasibility and complexity realistically',
        'Provide specific cost estimates for development and operations',
        'Recommend optimal tech stack based on requirements and constraints',
        'Highlight key risks and suggest mitigation strategies',
        'Include specific examples of similar successful projects',
        'Reference latest 2025 tools and AI coding assistants (Claude Code, Cursor, Gemini CLI, etc.)',
        'Use Gemini 2.5 Pro for comprehensive analysis (1M token context) or Claude Sonnet 4.5 for technical accuracy',
        'Explain everything in clear, accessible language with concrete examples',
      ],
      examples: [
        {
          input: 'Product Idea: A document intelligence platform that uses OCR and RAG to extract and query information from PDFs.\n\nQuestions:\n1. What similar platforms exist?\n2. What features differentiate successful solutions?\n3. What tech stack is optimal for this?\n4. What are realistic development costs?\n5. Which AI coding tools would accelerate development?',
          output: 'Market Analysis:\n\nMarket Size: Document processing market valued at $X billion, growing Y% annually. Key segments: enterprise document management, compliance automation, knowledge extraction.\n\nCompetitors:\n1. Adobe Acrobat - Strengths: [list], Weaknesses: [list]\n2. ABBYY - Strengths: [list], Weaknesses: [list]\n...\n\nTechnical Feasibility:\n- Complexity: Medium-High\n- Recommended Stack: Next.js + Supabase + pgvector + OpenAI/Anthropic\n- Development Time: 8-12 weeks for MVP\n- Estimated Cost: $15-25K development + $50-100/month operations\n\nAI Tools for Acceleration:\n- Cursor or Claude Code for implementation\n- v0.dev for UI components\n- Bolt.new for rapid prototyping\n...',
        },
      ],
    },
  },
  {
    id: 'prd-generation',
    name: 'PRD Generation',
    description: 'Generate comprehensive Product Requirements Documents for MVPs',
    category: 'workflow',
    prompt: {
      title: 'Product Requirements Document Generator',
      role: 'Senior product manager and technical writer with expertise in product strategy, user experience design, and agile development methodologies',
      task: 'Generate a comprehensive Product Requirements Document (PRD) that defines WHAT to build, WHO it\'s for, and WHY it matters. Transform product ideas into clear, actionable specifications suitable for development.',
      context: 'You are creating a PRD that will guide both technical design and development. This document bridges the gap between product vision and technical implementation. It should be detailed enough for developers but accessible to stakeholders.',
      constraints: [
        'Define product vision and one-line description clearly',
        'Identify target users with detailed personas and user stories',
        'List must-have features (3-5) with clear acceptance criteria',
        'Explicitly state what is NOT in MVP scope',
        'Define measurable success metrics with specific targets',
        'Describe user journey from discovery to success',
        'Include UI/UX requirements and design principles',
        'Specify constraints (budget, timeline, platform, team)',
        'Format as structured markdown with clear sections',
        'Make it actionable - developers should know exactly what to build',
      ],
      examples: [
        {
          input: 'Product: Task Management App\nUsers: Small teams (5-20 people)\nCore Problem: Teams struggle with task visibility and coordination\nMust-Have Features:\n1. Create and assign tasks\n2. Track task status\n3. Comments and collaboration\n\nTimeline: 6 weeks\nPlatform: Web app',
          output: '# Product Requirements Document: TaskFlow MVP\n\n## Product Overview\n**Name:** TaskFlow\n**Tagline:** Simple task management for small teams\n**Problem:** Small teams lack visibility into who\'s doing what, leading to missed deadlines and coordination issues.\n\n## Target Users\n**Primary Persona:** Team Lead (Sarah)\n- Manages 5-15 person team\n- Needs visibility into team workload\n- Frustrated by spreadsheets and email\n\n## User Stories\n1. As a team lead, I want to create tasks and assign them so team members know their responsibilities\n2. As a team member, I want to see my assigned tasks so I can prioritize my work\n...\n\n## MVP Features\n### Must Have\n1. **Task Creation & Assignment**\n   - Acceptance: Users can create tasks with title, description, assignee\n2. **Task Status Tracking**\n   - Acceptance: Tasks can be marked as Todo, In Progress, Done\n...\n\n## Success Metrics\n- 50 teams onboarded in first month\n- 70% of users active weekly\n- Average 10 tasks created per team per week',
        },
      ],
    },
  },
  {
    id: 'tech-design-generation',
    name: 'Technical Design Document Generator',
    description: 'Create technical design documents that define HOW to build the product',
    category: 'workflow',
    prompt: {
      title: 'Technical Design Document Generator',
      role: 'Senior software architect and technical lead with expertise in modern web development, cloud architecture, and AI-assisted development workflows',
      task: 'Generate a comprehensive Technical Design Document that defines HOW to build the product specified in the PRD. Recommend optimal tech stack, architecture patterns, implementation approaches, and deployment strategies for 2025.',
      context: 'You are creating a technical blueprint that will guide development. The design should balance simplicity for MVP with scalability considerations. Consider latest 2025 tools, AI coding assistants, and modern best practices.',
      constraints: [
        'Recommend specific tech stack with rationale for each choice',
        'Define clear architecture pattern (monolithic, serverless, microservices, etc.)',
        'Specify project structure and folder organization',
        'Outline database schema and data models',
        'Describe implementation approach for each PRD feature',
        'Recommend deployment platform and provide deployment steps',
        'Include cost breakdown (development tools + production hosting)',
        'Suggest AI coding tools that accelerate development',
        'Address performance, security, and scalability considerations',
        'Adjust complexity and detail based on user technical level',
        'Format as structured markdown with code examples',
      ],
      examples: [
        {
          input: 'PRD: Web app for task management\nFeatures: Task CRUD, user auth, real-time updates\nPlatform: Web\nBudget: Minimal\nTeam: Solo developer\nTimeline: 6 weeks',
          output: '# Technical Design: TaskFlow MVP\n\n## Recommended Stack\n**Frontend:** Next.js 14 (React framework with server components)\n- Why: Built-in routing, server-side rendering, excellent DX\n\n**Backend/Database:** Supabase\n- Why: Handles auth, database, real-time subscriptions\n- Cost: Free tier sufficient for MVP\n\n**Deployment:** Vercel\n- Why: One-click deploy from GitHub, free tier generous\n\n## Architecture\n**Pattern:** Full-stack Next.js with Supabase backend\n- Frontend: Next.js pages/components\n- Backend: Supabase (PostgreSQL + Auth + Realtime)\n- Deployment: Vercel edge functions\n\n## Database Schema\n```sql\nCREATE TABLE tasks (\n  id UUID PRIMARY KEY,\n  user_id UUID REFERENCES auth.users,\n  title TEXT NOT NULL,\n  status TEXT CHECK (status IN (\'todo\', \'in_progress\', \'done\')),\n  created_at TIMESTAMP DEFAULT NOW()\n);\n```\n\n## Implementation Phases\n### Phase 1: Foundation (Week 1-2)\n- Set up Next.js + Supabase\n- Implement authentication\n- Create task table\n\n### Phase 2: Core Features (Week 3-4)\n- Task CRUD operations\n- Task assignment\n- Status updates\n\n## Cost Breakdown\nDevelopment: $0-20/month (AI tools)\nProduction: $0-25/month (Supabase free tier + Vercel free tier)\n',
        },
      ],
    },
  },
  {
    id: 'ai-agent-instructions',
    name: 'AI Agent Instructions Generator',
    description: 'Generate NOTES.md and tool-specific configs for AI coding assistants',
    category: 'workflow',
    prompt: {
      title: 'AI Agent Instructions Generator',
      role: 'Expert AI workflow architect and prompt engineer specializing in structuring instructions for AI coding assistants like Claude Code, Cursor, Gemini CLI, and Windsurf',
      task: 'Generate comprehensive AI agent instruction files (NOTES.md and tool-specific configs) that convert PRD and Technical Design documents into step-by-step coding instructions. Create universal NOTES.md plus tool-specific configurations (.cursorrules, CLAUDE.md, GEMINI.md, etc.).',
      context: 'You are creating instruction files that AI coding assistants will use to build the product. These files bridge documentation and code generation. The instructions must be specific, actionable, and organized for systematic implementation.',
      constraints: [
        'Extract exact feature names and requirements from PRD',
        'Reference specific tech stack and architecture from Tech Design',
        'Create phased implementation plan (Foundation → Core Features → Polish → Deploy)',
        'Include code templates and patterns for their tech stack',
        'Provide specific testing instructions for each feature',
        'Include troubleshooting guide for common issues',
        'Adjust explanation depth based on user technical level',
        'Format NOTES.md as universal instructions (tool-agnostic)',
        'Generate tool-specific configs (.cursorrules, CLAUDE.md, etc.) based on selected tools',
        'Include learning resources and step-by-step guidance',
        'Make it beginner-friendly but useful for all levels',
      ],
      examples: [
        {
          input: 'PRD: TaskFlow app with 3 core features\nTech Design: Next.js + Supabase\nFeatures: Auth, Task CRUD, Status updates\nUser Level: Intermediate\nTools: Cursor, Claude Code',
          output: '# NOTES.md - AI Agent Instructions for TaskFlow\n\n## Project Overview\nYou\'re building TaskFlow, a task management app for small teams.\n\n**Stack:**\n- Next.js 14: React framework\n- Supabase: Database and auth\n- Vercel: Deployment\n\n## Implementation Phases\n\n### Phase 1: Foundation (Day 1-2)\n1. Initialize Next.js project\n```bash\nnpx create-next-app@latest taskflow --typescript --tailwind\n```\n\n2. Set up Supabase\n- Create account at supabase.com\n- Create new project\n- Copy API keys to .env.local\n\n3. Create database schema\n```sql\nCREATE TABLE tasks (\n  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n  user_id UUID REFERENCES auth.users(id),\n  title TEXT NOT NULL,\n  status TEXT DEFAULT \'todo\'\n);\n```\n\n### Phase 2: Core Features (Day 3-7)\n\n#### Feature 1: User Authentication\n**Create:** `app/auth/page.tsx`\n```typescript\n// Login component using Supabase Auth\n// Import: @supabase/supabase-js\n// Pattern: Email/password authentication\n```\n\n#### Feature 2: Task CRUD\n**Create:** `app/tasks/page.tsx`\n- List all user\'s tasks\n- Create new task form\n- Update task status\n- Delete task\n\n### Phase 3: Polish & Deploy\n- Add error handling\n- Style with Tailwind\n- Deploy to Vercel\n\n---\n\n# .cursorrules - Cursor Configuration\n\nYou are building TaskFlow using Next.js 14 and Supabase.\n\nAlways:\n1. Read NOTES.md first for context\n2. Implement one feature at a time\n3. Test after each change\n4. Use TypeScript\n5. Follow Next.js App Router patterns',
        },
      ],
    },
  },
];

/**
 * Get sample prompts by category
 */
export function getSamplePromptsByCategory(category: SamplePrompt['category']): SamplePrompt[] {
  return SAMPLE_PROMPTS.filter(prompt => prompt.category === category);
}

/**
 * Get sample prompt by ID
 */
export function getSamplePromptById(id: string): SamplePrompt | undefined {
  return SAMPLE_PROMPTS.find(prompt => prompt.id === id);
}

/**
 * Get all categories
 */
export function getCategories(): SamplePrompt['category'][] {
  return Array.from(new Set(SAMPLE_PROMPTS.map(p => p.category)));
}

