# Project Structure

This document explains the complete structure of the Universal Projects Boilerplate.

## 📁 Root Structure

```
projects-boilerplate/
├── 📋 docs/                      # Requirements & specifications system
├── ⚙️  backend/                   # NestJS backend (optional)
├── 🎨 frontend/                  # Next.js frontend (optional)
├── 📄 Root documentation files
└── 🔧 Configuration files
```

## 🎯 Three Main Components

### 1. Documentation System (`docs/`)

**Purpose**: Universal requirements documentation for any project type

**Use for**: ALL projects (websites, APIs, SaaS, mobile backends, etc.)

```
docs/
├── README.md                    # System overview
├── GETTING-STARTED.md          # Step-by-step guide
├── PROMPTS.md                  # AI prompts
├── STRUCTURE.md                # Documentation organization
│
├── project-requirements/       # Core requirements (ALL projects)
│   ├── product-brief.md       # Product overview
│   ├── srs.md                 # Software Requirements Specification
│   ├── database-design.md     # DB schema, ER diagrams
│   ├── api-specification.md   # API endpoints & contracts
│   ├── system-architecture.md # Architecture decisions
│   └── user-stories.md        # User stories
│
├── design-specs/              # Design specs (frontend only)
│   ├── design-system.md      # Colors, typography, components
│   ├── wireframes/           # Wireframes & mockups
│   └── ui-specifications/    # UI specs per page
│
├── generated/                 # AI-generated docs
│   ├── TECHNICAL_DOCS.md     # Technical documentation
│   ├── DATABASE_SCHEMA.sql   # Database schema
│   ├── API_CONTRACTS.yaml    # OpenAPI specs
│   └── tasks.md              # Build checklist
│
└── _legacy/                   # Deprecated templates
    └── README.md             # Migration guide
```

**Key Features**:
- Works for any project type
- Includes SRS, database design, API specs
- Supports both backend and frontend projects
- AI-ready templates

---

### 2. Backend (`backend/`)

**Purpose**: Production-ready NestJS backend

**Use when**: Your project needs a backend API

**Optional**: Skip if building frontend-only or using different backend tech

```
backend/
├── src/
│   ├── api/                  # REST + GraphQL APIs
│   │   ├── user/            # User endpoints
│   │   ├── file/            # File upload
│   │   └── health/          # Health checks
│   │
│   ├── auth/                # Better Auth integration
│   │   ├── auth.guard.ts   # Auth guard
│   │   ├── auth.service.ts # Auth service
│   │   └── entities/       # Auth entities
│   │
│   ├── database/            # TypeORM + migrations
│   │   ├── migrations/     # Database migrations
│   │   └── seeds/          # Seed data
│   │
│   ├── shared/              # Shared modules
│   │   ├── cache/          # Redis caching
│   │   ├── mail/           # Email service
│   │   └── socket/         # WebSocket
│   │
│   ├── worker/              # Background jobs
│   │   └── queues/         # BullMQ queues
│   │
│   └── config/              # Configuration
│       ├── database/       # DB config
│       ├── auth/           # Auth config
│       └── ...
│
├── test/                    # E2E tests
├── docker-compose.yml       # Docker setup
└── package.json
```

**Tech Stack**:
- NestJS 10.x
- TypeScript 5.x
- PostgreSQL + TypeORM
- Redis + BullMQ
- Better Auth
- Fastify + GraphQL

**Features**:
- ✅ REST API + GraphQL
- ✅ Authentication (JWT, OAuth, 2FA, Passkeys)
- ✅ Database migrations
- ✅ Redis caching
- ✅ Background jobs
- ✅ Email templates
- ✅ WebSocket support
- ✅ Swagger documentation
- ✅ Monitoring (Prometheus + Grafana)

---

### 3. Frontend (`frontend/`)

**Purpose**: Production-ready Next.js frontend

**Use when**: Your project needs a user interface

**Optional**: Skip if building API-only or using different frontend tech

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   └── [locale]/       # Internationalized routes
│   │       ├── (auth)/     # Protected routes
│   │       └── (unauth)/   # Public routes
│   │
│   ├── components/          # React components
│   │   ├── auth/           # Auth components
│   │   └── ui/             # UI components
│   │
│   ├── libs/                # Core libraries
│   │   └── BetterAuth.ts  # Better Auth client
│   │
│   ├── styles/              # Global styles
│   └── utils/               # Utilities
│
├── public/                  # Static assets
├── tests/                   # Tests
│   ├── e2e/                # Playwright E2E
│   └── integration/        # Integration tests
│
└── package.json
```

**Tech Stack**:
- Next.js 16
- TypeScript 5.x
- Tailwind CSS 4
- Better Auth client
- React Hook Form + Zod
- Vitest + Playwright

**Features**:
- ✅ Server-side rendering (SSR)
- ✅ Static generation (SSG)
- ✅ Internationalization (i18n)
- ✅ Authentication integration
- ✅ Form validation
- ✅ Testing setup
- ✅ Analytics (PostHog)
- ✅ Error tracking (Sentry)

---

## 📄 Root Documentation Files

### Essential Files

**README.md**
- Main project overview
- Quick start guide
- What's included
- How to use the boilerplate

**QUICK-START-GUIDE.md**
- Quick reference for getting started
- Choose your path (new project vs testing)
- Step-by-step workflows
- Examples for different project types

**MIGRATION-COMPLETE.md**
- Record of the migration to universal system
- What was accomplished
- What's documented
- Remaining tasks

### Setup Guides

**BACKEND-SETUP.md**
- Backend setup instructions
- Environment configuration
- Database setup
- Running the backend

**FRONTEND-SETUP.md**
- Frontend setup instructions
- Environment configuration
- Running the frontend

**INTEGRATION-GUIDE.md**
- How frontend and backend integrate
- Authentication flow
- API communication
- Deployment

### Utility Files

**start-dev.sh**
- Script to start both backend and frontend
- Automated development setup

---

## 🎯 How to Use This Structure

### For Different Project Types

#### Static Website (No Backend)
```
Use:
✅ docs/project-requirements/ (basic requirements)
✅ docs/design-specs/ (complete design system)
✅ frontend/ (Next.js for static site)

Skip:
❌ backend/
❌ database-design.md
❌ api-specification.md
```

#### API Service (Backend Only)
```
Use:
✅ docs/project-requirements/ (all files)
✅ backend/ (NestJS API)

Skip:
❌ docs/design-specs/
❌ frontend/
```

#### Fullstack Application
```
Use:
✅ docs/project-requirements/ (all files)
✅ docs/design-specs/ (all files)
✅ backend/ (NestJS)
✅ frontend/ (Next.js)
```

#### Custom Tech Stack
```
Use:
✅ docs/ (requirements system only)

Skip:
❌ backend/ (use your own)
❌ frontend/ (use your own)
```

---

## 📊 File Statistics

**Documentation**:
- 7 requirement templates
- 4 design spec templates
- 15+ README/guide files
- 1 example UI specification

**Backend**:
- ~150 TypeScript files
- Complete NestJS application
- Production-ready

**Frontend**:
- ~50 TypeScript/TSX files
- Complete Next.js application
- Production-ready

**Total**: ~200+ files, ~20,000+ lines of code and documentation

---

## 🔗 Key Relationships

### Documentation → Implementation

```
docs/project-requirements/database-design.md
    ↓
backend/src/database/migrations/
    ↓
backend/src/database/models/
```

```
docs/project-requirements/api-specification.md
    ↓
backend/src/api/
    ↓
Swagger documentation
```

```
docs/design-specs/design-system.md
    ↓
frontend/src/styles/
    ↓
frontend/src/components/
```

### Frontend ↔ Backend Integration

```
frontend/src/libs/BetterAuth.ts
    ↓ (HTTP requests)
backend/src/auth/better-auth.service.ts
    ↓ (validates)
backend/src/database/ (PostgreSQL)
    ↓ (sessions)
Redis
```

---

## 🚀 Getting Started

### 1. For New Projects

Start with documentation:
```bash
cd docs/
# Read README.md
# Fill out project-requirements/
# Fill out design-specs/ (if frontend)
# Generate documentation with AI
```

### 2. For Testing the Boilerplate

Test the fullstack:
```bash
# Start backend
cd backend && pnpm install && pnpm start:dev

# Start frontend (new terminal)
cd frontend && npm install && npm run dev
```

### 3. For Understanding the System

Read in this order:
1. `README.md` (root)
2. `docs/README.md`
3. `docs/GETTING-STARTED.md`
4. This file (`PROJECT-STRUCTURE.md`)

---

## 📝 Notes

### Modular Design

Each component is independent:
- Use docs/ system with any tech stack
- Use backend/ without frontend
- Use frontend/ without backend
- Mix and match as needed

### Production Ready

Both backend and frontend are:
- ✅ Fully tested
- ✅ Production-configured
- ✅ Docker-ready
- ✅ Monitoring-enabled
- ✅ Security-hardened

### Scalable

The structure supports:
- Small projects (single developer)
- Medium projects (small team)
- Large projects (multiple teams)
- Enterprise projects (with modifications)

---

## ✅ Quick Reference

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `docs/` | Requirements documentation | Always (all projects) |
| `backend/` | NestJS API | When you need a backend |
| `frontend/` | Next.js UI | When you need a frontend |
| Root docs | Setup guides | For understanding/setup |

---

**Need more details?** Check the README.md in each folder for specific documentation.
