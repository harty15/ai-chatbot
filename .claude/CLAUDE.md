# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start Development Server:**
```bash
pnpm dev
```

**Build & Production:**
```bash
pnpm build  # Runs database migration then builds
pnpm start  # Start production server
```

**Linting & Formatting:**
```bash
pnpm lint      # Next.js ESLint + Biome lint with auto-fix
pnpm lint:fix  # Fix linting issues
pnpm format    # Format code with Biome
```

**Database Operations:**
```bash
pnpm db:generate  # Generate Drizzle schema migrations
pnpm db:migrate   # Run database migrations
pnpm db:studio    # Open Drizzle Studio
pnpm db:push      # Push schema changes to database
```

**Testing:**
```bash
pnpm test  # Run Playwright tests (sets PLAYWRIGHT=True env var)
```

## Architecture Overview

This is a **Next.js 15 AI chatbot application** with the following key architectural components:

### Core Stack
- **Framework:** Next.js 15 with App Router and React Server Components
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** NextAuth.js v5 (beta)
- **AI Integration:** AI SDK supporting multiple providers (xAI default, OpenAI, Anthropic)
- **Storage:** Vercel Blob for file uploads
- **Styling:** Tailwind CSS with shadcn/ui components
- **Linting:** Biome (primary) + ESLint

### Directory Structure
- `app/(auth)/` - Authentication pages and configuration
- `app/(chat)/` - Main chat interface and API routes
- `components/` - Reusable UI components (shadcn/ui based)
- `lib/` - Core business logic, database schema, AI utilities
- `artifacts/` - Code execution and artifact handling
- `hooks/` - React hooks for state management
- `tests/` - Playwright e2e and API route tests

### Key Features
- **Multi-model AI Chat:** Supports xAI (default), OpenAI, Anthropic, Google models
- **Artifacts System:** Code execution with sandboxed environments
- **Memory & Context:** Long-term conversation memory with semantic search
- **File Processing:** PDF, Word, CSV parsing and analysis
- **Authentication:** Secure user sessions with social providers
- **Real-time Updates:** Server-sent events for streaming responses

### Database Schema
The application uses Drizzle ORM with PostgreSQL. Key entities:
- Users and authentication sessions
- Chat conversations and messages
- Memory fragments for context retention
- Document uploads and processing
- Voting and feedback systems

### Environment Configuration
Required environment variables (see `.env.example`):
- `AUTH_SECRET` - NextAuth.js session encryption
- `XAI_API_KEY` - Default AI model provider
- `ANTHROPIC_API_KEY` - Claude model access
- `POSTGRES_URL` - Database connection
- `BLOB_READ_WRITE_TOKEN` - File storage
- `REDIS_URL` - Caching and sessions

## Development Notes

### Code Quality
- Uses Biome for formatting and linting (primary)
- ESLint for Next.js specific rules
- TypeScript strict mode enabled
- Accessibility rules enforced via Biome config

### Testing Strategy
- Playwright for end-to-end testing
- Tests include chat functionality, artifacts, authentication
- Separate test configurations for e2e and API routes

### Database Migrations
The build process automatically runs database migrations via `tsx lib/db/migrate`. All schema changes should be generated using Drizzle Kit.

### Code Execution
The application includes a sophisticated artifacts system that can execute code in sandboxed environments, particularly for Python code execution using Pyodide.