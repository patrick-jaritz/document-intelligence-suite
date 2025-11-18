# Google Drive Integration - Architecture & Flow Diagrams

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (React)                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │     RAGView Component           │  │   DocumentSelector Component     │  │
│  │                                 │  │                                  │  │
│  │  • includeGoogle toggle         │  │  • Google checkbox               │  │
│  │  • question input               │  │  • GoogleConnect button          │  │
│  │  • Vision RAG provider select   │  │  • Result display                │  │
│  │                                 │  │                                  │  │
│  └──────────┬──────────────────────┘  └──────────────┬───────────────────┘  │
│             │                                         │                       │
│             │ includeGoogle + userId                 │ OAuth redirect        │
│             ▼                                         ▼                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                  callEdgeFunction('vision-rag-query')                 │  │
│  └──────────────────────────────────────┬─────────────────────────────────┘  │
│                                          │                                    │
└──────────────────────────────────────────┼────────────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
                    ▼                                             ▼
┌──────────────────────────────────────────┐  ┌────────────────────────────────┐
│  SUPABASE EDGE FUNCTIONS (Deno Runtime)  │  │  GOOGLE CLOUD SERVICES         │
├──────────────────────────────────────────┤  ├────────────────────────────────┤
│                                          │  │                                │
│  ┌────────────────────────────────────┐ │  │  ┌──────────────────────────┐  │
│  │  google-oauth-start                │ │  │  │  Google OAuth Server     │  │
│  │  ────────────────────────────────  │ │  │  │  (accounts.google.com)   │  │
│  │  • Builds consent URL              │ │  │  │  • Generates consent URL │  │
│  │  • Uses GOOGLE_CLIENT_ID           │ │  │  │  • Issues auth code      │  │
│  │  • Redirects to Google             │ │  │  │  • Exchanges for tokens  │  │
│  └────────────────────────────────────┘ │  │  └──────────────────────────┘  │
│           │                              │  │           ▲                     │
│           └──────────────────────────────┼──┼───────────┘                     │
│                                          │  │                                │
│  ┌────────────────────────────────────┐ │  │  ┌──────────────────────────┐  │
│  │  google-oauth-callback             │ │  │  │  Google Drive API        │  │
│  │  ────────────────────────────────  │ │  │  │  (googleapis.com)        │  │
│  │  • Receives auth code              │ │  │  │  • Returns file list     │  │
│  │  • Exchanges for tokens            │ │  │  │  • Returns file metadata │  │
│  │  • Stores in database              │ │  │  │  • Enforces permissions  │  │
│  │  • Validates state parameter       │ │  │  │                          │  │
│  └────────────────────────────────────┘ │  │  └──────────────────────────┘  │
│           │                              │  │           ▲                     │
│           └──────────────────────────────┼──┼───────────┘                     │
│                                          │  │                                │
│  ┌────────────────────────────────────┐ │  │                                │
│  │  google-connector                  │ │  │                                │
│  │  ────────────────────────────────  │ │  │                                │
│  │  • Receives userId + query         │ │  │                                │
│  │  • Looks up DB for tokens          │ │  │                                │
│  │  • Refreshes token if needed       │ │──┼────────────────────────────┐   │
│  │  • Searches Google Drive           │ │  │                            │   │
│  │  • Returns normalized results      │ │  │                            │   │
│  └────────┬───────────────────────────┘ │  │                            │   │
│           │                              │  │                            │   │
│           └──────────────────────────────┼──┼────────────────────────────┘   │
│                                          │  │                                │
│  ┌────────────────────────────────────┐ │  │                                │
│  │  vision-rag-query (UPDATED)        │ │  │                                │
│  │  ────────────────────────────────  │ │  │                                │
│  │  • Receives question + documentId  │ │  │                                │
│  │  • Calls PageIndex API             │ │  │                                │
│  │  • If includeGoogle=true:          │ │  │                                │
│  │    └─ Calls google-connector       │ │  │                                │
│  │    └─ Merges results               │ │  │                                │
│  │  • Generates VLM answer            │ │  │                                │
│  │  • Returns combined sources        │ │  │                                │
│  └────────┬───────────────────────────┘ │  │                                │
│           │                              │  │                                │
└───────────┼──────────────────────────────┤  └────────────────────────────────┘
            │                              │
            │                              │  ┌────────────────────────────────┐
            │                              │  │  EXTERNAL SERVICES             │
            │                              │  ├────────────────────────────────┤
            │                              │  │                                │
            │                              │  │  ┌──────────────────────────┐  │
            │                              │  │  │  PageIndex API           │  │
            │                              │  │  │  • Tree retrieval        │  │
            │                              │  │  │  • Status checks         │  │
            │                              │  │  └──────────────────────────┘  │
            │                              │  │                                │
            │                              │  │  ┌──────────────────────────┐  │
            │                              │  │  │  OpenAI API (VLM)        │  │
            │                              │  │  │  • Answer generation     │  │
            │                              │  │  │  • Reasoning extraction  │  │
            │                              │  │  └──────────────────────────┘  │
            │                              │  │                                │
            └──────────────────────────────┼──┼────────────────────────────────┘
                                           │  │
                    ┌──────────────────────┘  │
                    │                         │
                    ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│               SUPABASE DATABASE                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  external_account_integrations                            │   │
│  │  ──────────────────────────────────                        │   │
│  │  • user_id (FK to auth.users)                            │   │
│  │  • provider (e.g., 'google')                             │   │
│  │  • access_token (encrypted)                              │   │
│  │  • refresh_token (encrypted)                             │   │
│  │  • expires_at (timestamp)                                │   │
│  │  • metadata (JSONB)                                      │   │
│  │  • RLS: Users can only access own integrations           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  rag_sessions (existing)                                 │   │
│  │  ─────────────────────                                   │   │
│  │  • Stores query results and sources                      │   │
│  │  • May include Google results in sources array           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## OAuth 2.0 Flow

```
USER BROWSER                FRONTEND APP              EDGE FUNCTION              GOOGLE
    │                            │                          │                      │
    │  1. Click "Connect Google"  │                          │                      │
    ├───────────────────────────>│                          │                      │
    │                            │  2. GET google-oauth-    │                      │
    │                            │     start                │                      │
    │                            ├─────────────────────────>│                      │
    │                            │                          │  3. Builds OAuth URL  │
    │                            │                          │     (with GOOGLE_     │
    │                            │                          │      CLIENT_ID)       │
    │                            │  4. Returns redirect URL │                      │
    │                            │<─────────────────────────┤                      │
    │  5. Redirects to Google    │                          │                      │
    ├──────────────────────────────────────────────────────────────────────────────>│
    │                            │                          │      6. Shows         │
    │                            │                          │         Consent       │
    │                            │                          │         Screen        │
    │  7. User grants permission │                          │                      │
    │     Returns auth code ────────────────────────────────────────────────────────>│
    │                            │                          │ (redirects with code) │
    │  8. Browser redirects with auth code                  │                      │
    ├───────────────────────────────────────────────────────>│                      │
    │                            │  9. POST auth code +      │                      │
    │                            │     client secret         │                      │
    │                            ├─────────────────────────>│  10. Exchange code   │
    │                            │                          ├─────────────────────>│
    │                            │                          │  for tokens           │
    │                            │                          │                      │
    │                            │                          │  11. Returns access  │
    │                            │                          │      + refresh tokens │
    │                            │                          │<─────────────────────┤
    │                            │  12. Stores tokens in    │                      │
    │                            │      database (RLS)      │                      │
    │                            │                          │                      │
    │  13. Success! Integration complete                    │                      │
    │<──────────────────────────────────────────────────────┤                      │
    │                            │                          │                      │

Key Security Points:
├─ State parameter prevents CSRF
├─ Client secret never exposed to browser
├─ Tokens stored on server (encrypted)
├─ RLS ensures user-only access
└─ Service-role used for server operations
```

## Vision RAG Query with Google Integration

```
CLIENT REQUEST:
┌────────────────────────────────────────┐
│ {                                      │
│   question: "...",                     │
│   documentId: "doc-123",               │
│   includeGoogle: true,        ◄──  NEW │
│   userId: "user-456"          ◄──  NEW │
│ }                                      │
└────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  VISION-RAG-QUERY FUNCTION                                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Step 1: Validate & Parse Request                   ││
│  │ • Check question, documentId present               ││
│  │ • Extract includeGoogle, userId (NEW)              ││
│  │ • Validate input lengths                            ││
│  └──────────────────────────────────────────────────────┘│
│       │                                                   │
│       ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Step 2: Query PageIndex (existing)                 ││
│  │ • Fetch document tree from PageIndex               ││
│  │ • Use VLM to select relevant nodes                 ││
│  │ • Extract page numbers                              ││
│  │ • Generate PDF page images (if available)           ││
│  │ Result: retrievedNodes array                        ││
│  └──────────────────────────────────────────────────────┘│
│       │                                                   │
│       ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Step 3: Build Sources Array (NEW)                  ││
│  │ • Initialize sources = [...retrievedNodes]          ││
│  │ • Will append Google results below                  ││
│  └──────────────────────────────────────────────────────┘│
│       │                                                   │
│       ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Step 4: Conditionally Call Google Connector (NEW)   ││
│  │ if (includeGoogle && userId) {                      ││
│  │   ├─ Get google-connector URL                       ││
│  │   ├─ POST { userId, query: question, pageSize: 5 } ││
│  │   ├─ Receive normalized Google Drive results        ││
│  │   └─ For each result:                               ││
│  │       sources.push({                                ││
│  │         nodeId: "google:" + file.id,                ││
│  │         title: file.title,                          ││
│  │         pageRange: "N/A",                           ││
│  │         summary: file.owner,                        ││
│  │         metadata: {                                 ││
│  │           webViewLink: file.webViewLink,            ││
│  │           mimeType: file.mimeType                   ││
│  │         }                                           ││
│  │       })                                            ││
│  │ }                                                   ││
│  └──────────────────────────────────────────────────────┘│
│       │                                                   │
│       ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Step 5: Generate Answer using VLM                  ││
│  │ • Use merged sources as context                     ││
│  │ • Generate comprehensive answer                    ││
│  │ • Include reasoning if available                    ││
│  └──────────────────────────────────────────────────────┘│
│       │                                                   │
│       ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Step 6: Construct Response (NEW)                    ││
│  │ {                                                   ││
│  │   answer: "...",                                   ││
│  │   reasoning: "...",                                ││
│  │   retrievedNodes: [...],    ◄── PageIndex only     ││
│  │   sources: [...],           ◄── Mixed sources! NEW ││
│  │     // Contains:                                    ││
│  │     // - PageIndex results (nodeId: "node-1", ...) ││
│  │     // - Google results (nodeId: "google:file-X")   ││
│  │     //   with metadata for opening in Drive        ││
│  │   model: "gpt-4o",                                 ││
│  │   processingTime: 5234                             ││
│  │ }                                                   ││
│  └──────────────────────────────────────────────────────┘│
│                                                            │
└────────────────────────────────────────────────────────────┘
         │
         ▼
RESPONSE SENT TO CLIENT:
┌────────────────────────────────────────────────────┐
│ Both PageIndex and Google results are returned!   │
├────────────────────────────────────────────────────┤
│ sources[0]:                                        │
│ {                                                  │
│   nodeId: "node-1",           ◄── PageIndex      │
│   title: "Section 1",                             │
│   pageRange: "1-2",                               │
│   summary: "..."                                  │
│ }                                                  │
│                                                    │
│ sources[1]:                                        │
│ {                                                  │
│   nodeId: "google:abc123",    ◄── Google        │
│   title: "Q3 Report.pdf",                         │
│   pageRange: "N/A",                               │
│   metadata: {                                      │
│     webViewLink: "https://drive.google.com/...",  │
│     mimeType: "application/pdf"                   │
│   }                                                │
│ }                                                  │
└────────────────────────────────────────────────────┘
         │
         ▼
FRONTEND DISPLAYS:
- Answer from VLM
- Source list with clickable Google Drive links
- Ability to open Google documents directly
```

## Component Interaction Diagram

```
┌─────────────────────────────┐
│   RAGView.tsx (NEW)         │
│ ─────────────────────────── │
│ State:                      │
│ • includeGoogle: boolean    │
│ • ragProvider: string       │
│ • selectedDocument: string  │
│                             │
│ On Query Submit:            │
│ • If ragProvider ===        │
│   "pageindex-vision":       │
│   - Pass includeGoogle: t   │
│   - Pass userId: u          │
│ • Else: ignore includeGoogle
│                             │
└────────────┬────────────────┘
             │
             │ calls callEdgeFunction()
             │ with updated payload
             │
             ▼
┌─────────────────────────────┐
│   Supabase Client           │
│   callEdgeFunction()        │
│                             │
│   • POST to:                │
│     /vision-rag-query       │
│   • Headers: Auth token     │
│   • Body: question, ....,   │
│     includeGoogle, userId   │
│                             │
└────────────┬────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│   vision-rag-query Function          │
│   (Supabase Edge Function)           │
│                                      │
│   • Parse includeGoogle, userId      │
│   • If both present:                 │
│     - Call google-connector          │
│     - Merge results                  │
│   • Return combined sources          │
│                                      │
└────────────┬───────────────────────┬─┘
             │                       │
             │ calls                 │ calls
             │ PageIndex API         │ google-connector
             │                       │
             ▼                       ▼
    ┌──────────────────┐   ┌─────────────────────┐
    │  PageIndex API   │   │ google-connector Fn │
    │                  │   │                     │
    │ Returns: tree    │   │ • Look up tokens DB │
    │ selections       │   │ • Call Drive API    │
    │                  │   │ • Return files      │
    └──────────────────┘   └─────────────────────┘
             │                       │
             └───────────┬───────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   vision-rag-query            │
         │   Merges both results         │
         │   Returns response            │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   Frontend receives response   │
         │   • Displays answer            │
         │   • Shows mixed sources        │
         │   • Links to Google Drive      │
         └───────────────────────────────┘
```

## Data Structure - Source Objects

```
┌────────────────────────────────────────────────────────────────────┐
│                        SOURCES ARRAY                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  PAGEINDEX RESULT                                           │ │
│  │  ────────────────────────────────────────────────────────── │ │
│  │  {                                                          │ │
│  │    nodeId: "node-1",           ◄── PageIndex node ID      │ │
│  │    title: "Section 1",         ◄── Section title          │ │
│  │    pageRange: "1-2",           ◄── Pages in document      │ │
│  │    summary: "Content...",      ◄── Section summary        │ │
│  │    metadata: undefined         ◄── Optional (not used)    │ │
│  │  }                                                          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  GOOGLE DRIVE RESULT (NEW)                                  │ │
│  │  ────────────────────────────────────────────────────────── │ │
│  │  {                                                          │ │
│  │    nodeId: "google:file-abc123", ◄── google: prefix       │ │
│  │    title: "Q3_Report.pdf",       ◄── File name            │ │
│  │    pageRange: "N/A",             ◄── N/A for online files │ │
│  │    summary: "user@example.com",  ◄── File owner           │ │
│  │    metadata: {                   ◄── NEW FILE             │ │
│  │      webViewLink: "https://...   ◄── Opens in Google Drive│ │
│  │      mimeType: "application/pdf" ◄── File type            │ │
│  │    }                                                        │ │
│  │  }                                                          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  Notes:                                                           │
│  • PageIndex results: pages available, metadata absent           │
│  • Google results: pages N/A, metadata present                   │
│  • Both clickable in UI                                          │
│  • Google results open external link                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

**Diagrams Version:** 1.0  
**Last Updated:** November 17, 2025
