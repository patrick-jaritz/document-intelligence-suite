# 📚 Document Intelligence Suite

A unified platform combining **RAG-powered Q&A** and **structured data extraction** from documents. Built with React, Supabase, and pgvector.

## ✨ Features

### 🔍 RAG-Powered Q&A
- Upload documents (PDF, images) or process from URLs
- Ask natural language questions about your documents
- Get AI-powered answers with source citations
- Support for multiple LLM providers (OpenAI, Anthropic, Mistral, Gemini)

### 📋 Structured Data Extraction
- Extract structured data using predefined templates
- Support for various document types (invoices, contracts, forms, etc.)
- Multiple OCR providers (Google Vision, AWS Textract, Azure, Mistral, OCR.space)
- Export results as JSON

### 🚀 Advanced Capabilities
- **URL Context Grounding** - Process documents directly from web URLs
- **Multi-provider OCR** - Choose the best OCR service for your needs
- **Vector Search** - Powered by pgvector for fast similarity search
- **Real-time Processing** - Live status updates and progress tracking

## 🏗️ Architecture

```
document-intelligence-suite/
├── frontend/                  # React app with unified UI
│   ├── src/
│   │   ├── components/        # Shared components
│   │   ├── pages/            # App pages (Home, Extract, Ask)
│   │   └── contexts/         # React contexts
├── supabase/
│   ├── functions/            # Edge Functions
│   │   ├── process-pdf-ocr  # OCR processing
│   │   ├── generate-structured-output # Data extraction
│   │   ├── generate-embeddings # RAG embeddings
│   │   └── rag-query        # RAG Q&A
│   └── migrations/          # Database schema
├── shared/                   # Shared utilities
│   └── ocr-provider.ts      # OCR provider abstraction
└── scripts/                 # Utility scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase CLI
- API keys for your chosen providers

### 1. Clone and Setup
```bash
git clone <your-repo>
cd document-intelligence-suite
npm run setup
```

### 2. Configure Supabase
```bash
# Start Supabase locally
supabase start

# Run migrations
supabase db reset

# Set environment variables
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set MISTRAL_API_KEY=...
supabase secrets set GOOGLE_VISION_API_KEY=...
```

### 3. Deploy Edge Functions
```bash
supabase functions deploy
```

### 4. Start Development
```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.local)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### Supabase Secrets
```bash
# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
GOOGLE_GEMINI_API_KEY=...

# OCR Providers
GOOGLE_VISION_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
OCR_SPACE_API_KEY=...
```

## 📖 Usage

### RAG Q&A Mode
1. Upload a document or enter a URL
2. Wait for processing (OCR + embedding generation)
3. Ask questions about the document
4. Get AI-powered answers with citations

### Extraction Mode
1. Upload a document
2. Select a template (invoice, contract, etc.)
3. Choose OCR and LLM providers
4. Get structured JSON output

## 🎯 Use Cases

- **Legal**: Contract analysis and Q&A
- **Finance**: Invoice processing and data extraction
- **Research**: Document analysis and information retrieval
- **Education**: Study material Q&A and content extraction
- **Business**: Report analysis and data mining

## 🔮 Future Enhancements

### Phase 2: Premium Features
- **Docling Integration** - Advanced document parsing
- **Multi-document Search** - Query across multiple documents
- **Chat History** - Persistent conversation history
- **Export Options** - PDF, Word, Excel export
- **Batch Processing** - Process multiple documents

### Phase 3: Enterprise Features
- **User Management** - Multi-user support with roles
- **API Access** - REST API for integrations
- **Custom Templates** - Template builder UI
- **Analytics** - Usage analytics and insights
- **White-labeling** - Custom branding options

## 🛠️ Development

### Project Structure
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL with pgvector extension
- **Storage**: Supabase Storage for documents
- **Auth**: Supabase Auth (optional)

### Key Technologies
- **Vector Search**: pgvector for similarity search
- **OCR**: Multiple providers with fallback
- **LLM**: OpenAI, Anthropic, Mistral, Gemini
- **Deployment**: Vercel (frontend) + Supabase (backend)

## 📊 Performance

- **OCR Processing**: 2-10 seconds per page
- **Embedding Generation**: 1-3 seconds per document
- **RAG Queries**: 1-5 seconds per question
- **Concurrent Users**: 100+ (depending on Supabase plan)

## 🔒 Security

- **API Keys**: Stored securely in Supabase secrets
- **CORS**: Configured for production domains
- **RLS**: Row-level security for data access
- **Rate Limiting**: Built-in provider rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: [Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)

## 🙏 Acknowledgments

- Built on [Supabase](https://supabase.com)
- Powered by [pgvector](https://github.com/pgvector/pgvector)
- OCR providers: Google Vision, AWS Textract, Azure, Mistral, OCR.space
- LLM providers: OpenAI, Anthropic, Mistral, Google Gemini

---

**Ready to transform your document workflow?** 🚀

Start with the [Quick Start Guide](#-quick-start) or explore the [API Documentation](docs/api.md).
