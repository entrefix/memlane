# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mr.Brain (TodoMyDay) is a personal productivity application with AI-powered task management and a smart memories/notes system. It features a React + TypeScript frontend and a Go + Gin backend with SQLite database, vector search capabilities, and RAG (Retrieval-Augmented Generation) for intelligent search and Q&A.

## Development Commands

### Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm install              # Install dependencies
npm run dev             # Start dev server (http://localhost:3111)
npm run build           # Build for production (TypeScript check + Vite build)
npm run lint            # Run ESLint
npm run preview         # Preview production build
```

### Backend (Go + Gin)
```bash
cd backend
go mod download         # Download dependencies
go run ./cmd/server     # Run server directly (port 8099)
go build -o server ./cmd/server  # Build binary

# Development with hot reload (using Air)
air                     # Watches *.go files, rebuilds to ./tmp/server
```

### Docker
```bash
docker-compose up --build    # Build and run both services
# Frontend: http://localhost:3111
# Backend API: http://localhost:8099
```

### Testing
The codebase does not currently have a test suite. When adding tests:
- Frontend: Use standard React testing practices
- Backend: Use Go's built-in `testing` package

## Architecture

### High-Level Structure

**Monorepo with separate frontend and backend:**
- `frontend/` - React SPA with routing, contexts, and API client
- `backend/` - Go API server with repository pattern
- `data/` - SQLite database and vector storage (created at runtime)
- `docs/` - RAG system documentation and benchmarking guides

### Backend Architecture (Go)

**Entry Point:** `backend/cmd/server/main.go`
- Loads configuration from environment variables
- Initializes database connection and repositories
- Conditionally initializes RAG components (if `RAG_ENABLED=true` and `NIM_API_KEY` set)
- Sets up services with dependency injection
- Configures Gin router with CORS and middleware

**Layered Architecture:**
```
cmd/server/        # Application entry point
internal/
  ├── config/      # Environment configuration loading
  ├── crypto/      # Encryption for API keys
  ├── database/    # SQLite connection and migrations
  ├── middleware/  # JWT authentication middleware
  ├── models/      # Domain models (Todo, Memory, Group, RAG types)
  ├── repository/  # Data access layer
  │   ├── todo_repository.go
  │   ├── memory_repository.go
  │   ├── group_repository.go
  │   ├── user_repository.go
  │   ├── ai_provider_repository.go
  │   ├── vector_repository.go      # chromem-go vector DB
  │   └── fts_repository.go         # SQLite FTS5 full-text search
  ├── services/    # Business logic layer
  │   ├── auth_service.go           # JWT generation/validation
  │   ├── todo_service.go           # Todo CRUD + AI processing
  │   ├── memory_service.go         # Memory CRUD + categorization + web scraping
  │   ├── ai_service.go             # OpenAI/Anthropic/Google API client
  │   ├── ai_provider_service.go    # Multi-provider management
  │   ├── rag_service.go            # Hybrid search + Q&A
  │   ├── embedding_service.go      # NVIDIA NIM embeddings
  │   ├── scraper_service.go        # SearXNG web search
  │   ├── group_service.go          # Todo groups/categories
  │   ├── user_data_service.go      # Bulk data operations
  │   ├── file_parser_service.go    # Parse .txt, .md, .pdf, .json uploads
  │   └── document_chunker.go       # Text chunking for embeddings
  ├── handlers/    # HTTP handlers (Gin)
  └── router/      # Route registration
```

**Key Dependencies:**
- `gin-gonic/gin` - HTTP web framework
- `modernc.org/sqlite` - Pure Go SQLite driver
- `philippgille/chromem-go` - Vector database for embeddings
- `golang-jwt/jwt/v5` - JWT authentication
- `golang.org/x/crypto` - bcrypt password hashing
- SQLite FTS5 - Full-text search with Porter stemming

**Database Schema:**
- SQLite with auto-migrations in `database.Connect()`
- Tables: `users`, `todos`, `groups`, `memories`, `ai_providers`
- FTS5 virtual tables: `todos_fts`, `memories_fts` (auto-synced via triggers)
- Vector storage: `./data/vectors` (chromem-go persistence)

### Frontend Architecture (React)

**Structure:**
```
src/
  ├── main.tsx              # Entry point, renders App
  ├── App.tsx               # Router + Providers (Auth, Theme)
  ├── routes/               # Route configuration
  ├── pages/                # Top-level page components
  │   ├── Dashboard.tsx     # Todo management with drag-and-drop
  │   ├── Memories.tsx      # Memory cards with categories/search
  │   ├── Chat.tsx          # RAG search/ask interface
  │   ├── Settings.tsx      # AI providers, user data management
  │   ├── Login.tsx
  │   └── Register.tsx
  ├── components/           # Reusable UI components
  │   ├── TodoList.tsx      # react-beautiful-dnd list
  │   ├── QuickAddInput.tsx # Todo creation with AI
  │   ├── StickyBottomInput.tsx  # Memory creation (floating input)
  │   ├── FilterBar.tsx     # Todo/Memory filtering UI
  │   ├── AIProviderForm.tsx
  │   ├── CreateTodoModal.tsx
  │   └── ...
  ├── contexts/             # React Context providers
  │   ├── AuthContext.tsx   # JWT auth state + httpOnly cookies
  │   └── ThemeContext.tsx  # Dark mode toggle
  ├── api/                  # Axios API client modules
  │   ├── client.ts         # Base axios instance with auth interceptor
  │   ├── auth.ts
  │   ├── todos.ts
  │   ├── memories.ts
  │   ├── groups.ts
  │   ├── aiProviders.ts
  │   ├── rag.ts
  │   └── userData.ts
  ├── types/                # TypeScript type definitions
  ├── hooks/                # Custom React hooks
  └── utils/                # Helper functions
```

**Key Frontend Patterns:**
- **Authentication:** JWT stored in httpOnly cookies, managed via `AuthContext`
- **API Client:** Centralized axios instance in `api/client.ts` with automatic token refresh
- **State Management:** React Context for global state (auth, theme); local state for components
- **Routing:** react-router-dom with protected routes
- **UI:** Tailwind CSS + Framer Motion animations
- **Drag & Drop:** @hello-pangea/dnd (react-beautiful-dnd fork) for todo reordering

### RAG System Architecture

**Overview:** Hybrid search combining vector similarity (semantic) and keyword matching (FTS5) using Reciprocal Rank Fusion (RRF).

**Components:**
1. **Embedding Service** (`embedding_service.go`)
   - NVIDIA NIM API integration (`nvidia/nv-embedqa-e5-v5`, 1024 dimensions)
   - Rate-limited to 40 RPM
   - Separate `EmbedQuery()` and `EmbedPassage()` methods for optimal retrieval
   - Text sanitization for special characters

2. **Vector Repository** (`vector_repository.go`)
   - Uses chromem-go for persistent vector storage
   - Stores documents with metadata (userID, contentType, contentID)
   - Cosine similarity search with user/type filtering

3. **FTS Repository** (`fts_repository.go`)
   - SQLite FTS5 virtual tables with Porter stemming
   - Auto-synced via triggers (`AFTER INSERT`, `AFTER UPDATE`, `AFTER DELETE`)
   - Returns highlighted snippets using `snippet()` function

4. **RAG Service** (`rag_service.go`)
   - **Hybrid Search:** Parallel vector + keyword search, merged with RRF
   - **Q&A:** Retrieves context, builds prompt, calls AI provider
   - **Auto-Indexing:** Triggered on todo/memory create/update/delete
   - Configurable vector weight (default: 70% vector, 30% keyword)

**Document Chunking:**
- `document_chunker.go` splits long texts (>2000 chars) with overlap
- Default: 2000 char chunks, 200 char overlap
- Preserves sentence boundaries when possible

**Indexing Flow:**
```
Todo/Memory Created → Service → RAG.IndexDocument() →
  1. Chunk text if needed
  2. Generate embeddings (NIM)
  3. Store in vector DB (chromem-go)
  4. Store in FTS5 (SQLite triggers handle this automatically)
```

**Search Flow:**
```
User Query → RAG.Search() →
  1. Parallel: vector search + FTS5 keyword search
  2. Merge results using RRF (Reciprocal Rank Fusion)
  3. Return top K with scores + highlights
```

**Q&A Flow:**
```
User Question → RAG.Ask() →
  1. Search for relevant documents (hybrid)
  2. Build context from top results
  3. Generate prompt with sources
  4. Call AI provider (user's configured provider or default)
  5. Return answer + source attribution
```

## Configuration

**Environment Variables:** See `.env.example` for full list.

**Critical Settings:**
- `JWT_SECRET` - Required, min 32 chars
- `ENCRYPTION_KEY` - Required for production, 32 chars
- `NIM_API_KEY` - Required if `RAG_ENABLED=true` (get from https://build.nvidia.com)
- `OPENAI_API_KEY` - Optional, for AI features (can use custom providers via UI)

**RAG Configuration:**
- `RAG_ENABLED=true` - Enable RAG features (requires NIM_API_KEY)
- `VECTOR_DB_PATH=./data/vectors` - Vector storage location
- `NIM_MODEL=nvidia/nv-embedqa-e5-v5` - Embedding model
- `NIM_EMBEDDING_DIM=1024` - Must match model dimension

**Web Search (Optional):**
- `SEARXNG_URLS=http://localhost:8080` - Comma-separated SearXNG instances for auto web search in memories

## AI Provider System

The app supports multiple AI providers configured per-user via the Settings UI:

**Supported Providers:**
- OpenAI (default via env vars or user-configured)
- Anthropic (Claude)
- Google (Gemini)
- Custom OpenAI-compatible APIs

**Storage:** API keys are encrypted using `crypto.Encryptor` with `ENCRYPTION_KEY` before storing in `ai_providers` table.

**Usage:**
- Todo creation: Uses AI to clean up title and extract tags
- Memory categorization: Auto-categorizes into 10+ categories
- Weekly digest: Generates AI summary of memories
- RAG Q&A: Uses configured provider for answer generation
- Web scraping: Summarizes fetched web content

## Key Features & Flows

### Todo Management
1. User creates todo via `QuickAddInput` or modal
2. Frontend POSTs to `/api/todos`
3. Backend: `todo_service.ProcessTodoWithAI()` cleans up text (if AI configured)
4. Backend: `ragService.IndexDocument()` adds to vector + FTS5 index
5. Todo saved to DB, returned to frontend

### Memory Creation with Auto-Processing
1. User enters text/URL in `StickyBottomInput`
2. Backend detects intent:
   - URL: Scrapes content, generates summary
   - Search query ("search about X"): Fetches from SearXNG, summarizes
   - Plain text: Categorizes using AI
3. Backend: Auto-indexes in RAG system
4. Memory saved with metadata (category, source URL, etc.)

### RAG Search/Ask
1. User types query in Chat page
2. **Search Mode:** Returns ranked documents with highlights
3. **Ask Mode:** Returns AI-generated answer with source citations
4. Uses hybrid search (vector + keyword) for best results

### File Upload for Memories
1. User uploads .txt, .md, .pdf, or .json file
2. Backend: `file_parser_service.go` extracts text
3. Text is processed as new memory (categorized, indexed)
4. Large files automatically chunked

## Common Patterns

### Adding a New API Endpoint

1. **Define route** in `backend/internal/router/router.go`
2. **Create handler** in `backend/internal/handlers/` (e.g., `my_handler.go`)
3. **Add service method** in `backend/internal/services/` if business logic needed
4. **Update repository** in `backend/internal/repository/` if DB access needed
5. **Add frontend API call** in `frontend/src/api/`
6. **Use in component** with error handling + toast notifications

### Adding RAG-Indexed Content

To make new content searchable via RAG:
1. Call `ragService.IndexDocument()` in your service after create/update
2. Call `ragService.DeleteDocument()` after delete
3. Ensure FTS triggers exist for the table (see `fts_repository.go`)

### Working with AI Providers

To add AI functionality:
1. Use `aiProviderService.GetUserProviderOrDefault()` to get configured provider
2. Call `aiProviderService.CallAI()` with prompt
3. Handle errors gracefully (user may not have AI configured)

## Development Tips

- **Database migrations:** Auto-run on startup, schema defined in `database/database.go`
- **CORS:** Configured for `http://localhost:3111` by default
- **Authentication:** All `/api/*` routes except `/api/auth/register` and `/api/auth/login` require JWT
- **Error handling:** Backend returns structured JSON errors, frontend shows toast notifications
- **Logging:** Backend uses `log.Printf()` for debugging, check console output
- **Vector DB:** Persisted to disk, can be deleted to rebuild index (will lose embeddings)

## Troubleshooting

**RAG not working:**
- Check `NIM_API_KEY` is set and valid
- Verify `RAG_ENABLED=true`
- Check logs for embedding errors
- Ensure vector DB path is writable

**AI features not working:**
- Check user has AI provider configured in Settings
- Verify API keys are not expired
- Check rate limits (NIM: 40 RPM)

**Frontend can't reach backend:**
- Verify `VITE_API_URL` matches backend URL
- Check CORS `ALLOWED_ORIGINS` includes frontend URL
- Ensure backend is running on port 8099

**Docker issues:**
- Rebuild images after changing dependencies: `docker-compose up --build`
- Check `.env` file is present (not `.env.example`)
- Verify ports 3111 and 8099 are not in use
