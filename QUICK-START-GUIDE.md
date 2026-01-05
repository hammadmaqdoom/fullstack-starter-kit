# Quick Start Guide

**Universal Projects Boilerplate** - Build any type of software project with proper requirements documentation.

## 🎯 What Can You Build?

- ✅ Static websites (no backend)
- ✅ Web applications (with backend)
- ✅ REST/GraphQL APIs (backend only)
- ✅ SaaS products (fullstack)
- ✅ Mobile app backends
- ✅ Any software project

## ⚡ Two Ways to Start

### Option 1: Start a New Project (Recommended)

**Define requirements first**, then build:
1. Fill out `docs/project-requirements/` templates
2. Add design specs (if frontend)
3. Generate documentation with AI
4. Build your project

**Time**: 4-10 hours for requirements, 20-60 hours for implementation

→ Continue to [New Project Workflow](#new-project-workflow)

---

### Option 2: Test the Boilerplate

**Try the included backend/frontend stack**:
1. Start backend (NestJS)
2. Start frontend (Next.js)
3. Test authentication
4. Explore features

**Time**: 15-30 minutes to test

→ Jump to [Testing the Stack](#testing-the-stack)

---

## New Project Workflow

### Step 1: Define Requirements (4-10 hours)

#### For ALL Projects:

1. **Product Brief** (`docs/project-requirements/product-brief.md`)
   - What you're building
   - Who it's for
   - Business goals
   - Key features

2. **SRS** (`docs/project-requirements/srs.md`)
   - Functional requirements
   - Non-functional requirements (performance, security, scalability)
   - System requirements
   - User requirements

3. **System Architecture** (`docs/project-requirements/system-architecture.md`)
   - Architecture diagrams
   - Technology stack
   - Design patterns
   - Deployment architecture

4. **User Stories** (`docs/project-requirements/user-stories.md`)
   - User stories with acceptance criteria
   - Priorities
   - Estimates

#### If Your Project Has a Database:

5. **Database Design** (`docs/project-requirements/database-design.md`)
   - ER diagrams
   - Tables, columns, data types
   - Relationships (1:1, 1:N, N:M)
   - Normalization (1NF, 2NF, 3NF, BCNF)
   - Indexes
   - Constraints

#### If Your Project Has an API:

6. **API Specification** (`docs/project-requirements/api-specification.md`)
   - Endpoints (method, path, description)
   - Request/response formats
   - Authentication
   - Rate limiting
   - Error handling

#### If Your Project Has a Frontend:

7. **Design System** (`docs/design-specs/design-system.md`)
   - Color palette (hex codes)
   - Typography (fonts, sizes, weights)
   - Spacing system
   - Component patterns
   - Breakpoints

8. **Wireframes** (`docs/design-specs/wireframes/`)
   - Page layouts
   - User flows
   - Mobile & desktop versions

9. **UI Specifications** (`docs/design-specs/ui-specifications/`)
   - Detailed specs per page
   - Component behavior
   - Responsive rules

---

### Step 2: Generate Documentation (30-60 minutes)

Use AI prompts from `docs/PROMPTS.md`:

```
1. Generate Technical Documentation
2. Generate Database Schema SQL
3. Generate API Contracts (OpenAPI/Swagger)
4. Generate Build Checklist
```

AI creates files in `docs/generated/`:
- `TECHNICAL_DOCS.md`
- `DATABASE_SCHEMA.sql`
- `API_CONTRACTS.yaml`
- `tasks.md`

---

### Step 3: Choose Your Stack

Based on your requirements:

#### Option A: Static Website
- **Use**: `frontend/` only
- **Skip**: `backend/`
- **Best for**: Marketing sites, portfolios, landing pages

#### Option B: Backend API Only
- **Use**: `backend/` only
- **Skip**: `frontend/`
- **Best for**: REST APIs, GraphQL APIs, mobile backends

#### Option C: Fullstack Application
- **Use**: Both `frontend/` and `backend/`
- **Best for**: SaaS apps, web applications, dashboards

#### Option D: Custom Stack
- **Use**: `docs/` system only
- **Build with**: Your own tech stack
- **Best for**: Projects with specific technology requirements

---

### Step 4: Implement (20-60 hours)

1. Use AI prompts to generate code from specs
2. Review and refine
3. Test against acceptance criteria
4. Deploy

---

## Testing the Stack

Want to see what the included backend/frontend can do?

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- pnpm or npm

### Quick Start

```bash
# 1. Clone
git clone <your-repo-url>
cd projects-boilerplate

# 2. Start Backend
cd backend
pnpm install
pnpm migration:up
pnpm start:dev
# Backend: http://localhost:3000

# 3. Start Frontend (new terminal)
cd frontend
pnpm install
pnpm dev
# Frontend: http://localhost:3001

# 4. Test Auth
# - Sign up: http://localhost:3001/sign-up
# - Check email: http://localhost:1080 (MailDev)
# - Sign in: http://localhost:3001/sign-in
# - Dashboard: http://localhost:3001/dashboard
```

### What's Included

**Backend**:
- ✅ NestJS 10 with TypeScript
- ✅ PostgreSQL + TypeORM
- ✅ Redis caching
- ✅ Better Auth (email, OAuth, 2FA, passkeys)
- ✅ REST API + GraphQL
- ✅ Email templates
- ✅ Swagger docs: http://localhost:3000/api/docs
- ✅ Monitoring: Prometheus + Grafana

**Frontend**:
- ✅ Next.js 16 with TypeScript
- ✅ Tailwind CSS 4
- ✅ Better Auth client
- ✅ i18n support
- ✅ Form validation (Zod)
- ✅ Analytics (PostHog)
- ✅ Error tracking (Sentry)

---

## Project Type Examples

### Example 1: Marketing Website (No Backend)

**What to fill out**:
- ✅ Product brief
- ✅ Design system
- ✅ Wireframes
- ✅ UI specifications (per page)
- ❌ Skip: SRS, database design, API specification

**What to use**:
- `frontend/` folder only

**Result**: Static marketing site with Next.js

---

### Example 2: REST API for Mobile App

**What to fill out**:
- ✅ Product brief
- ✅ SRS
- ✅ Database design (ER diagrams, normalization)
- ✅ API specification (all endpoints)
- ✅ System architecture
- ❌ Skip: Design specs

**What to use**:
- `backend/` folder only

**Result**: REST API with PostgreSQL database

---

### Example 3: SaaS Application

**What to fill out**:
- ✅ Product brief
- ✅ SRS
- ✅ Database design
- ✅ API specification
- ✅ System architecture
- ✅ User stories
- ✅ Design system
- ✅ Wireframes
- ✅ UI specifications

**What to use**:
- Both `frontend/` and `backend/`

**Result**: Complete fullstack application

---

### Example 4: Custom Tech Stack

**What to fill out**:
- ✅ All requirements docs
- ✅ All design specs (if frontend)

**What to use**:
- `docs/` system only
- Build with your own stack (Python/Django, Ruby/Rails, etc.)

**Result**: Requirements documentation that works with any technology

---

## Key Principles

### 1. Requirements First
**Always start with requirements** before writing code:
- Prevents scope creep
- Ensures proper database design
- Creates clear API contracts
- Reduces rework

### 2. Normalize Your Database
Use `database-design.md` to:
- Create ER diagrams
- Define relationships
- Achieve 3NF or BCNF
- Avoid data redundancy

### 3. Specify APIs Upfront
Use `api-specification.md` to:
- Define all endpoints
- Document request/response formats
- Plan authentication
- Consider rate limiting

### 4. Document Architecture
Use `system-architecture.md` to:
- Make technology decisions
- Plan for scalability
- Document security approach
- Design deployment strategy

### 5. Be Specific
In all documentation:
- Use exact data types (VARCHAR(255), INT, DECIMAL(10,2))
- Include hex codes for colors (#01FFFF)
- Specify constraints (NOT NULL, UNIQUE, CHECK)
- Provide examples (sample JSON, test data)

---

## Time Estimates

| Phase | Time | What You Do |
|-------|------|-------------|
| Requirements | 4-10 hrs | Fill out docs/project-requirements/ |
| Design Specs | 2-4 hrs | Fill out docs/design-specs/ (if frontend) |
| AI Generation | 30-60 min | Use prompts to generate docs |
| Implementation | 20-60 hrs | Build with AI assistance |
| **Total** | **27-75 hrs** | Complete project |

---

## Next Steps

### Ready to Start?

1. **Read the full guide**: `docs/GETTING-STARTED.md`
2. **Check the prompts**: `docs/PROMPTS.md`
3. **Understand the structure**: `docs/STRUCTURE.md`

### Need Help?

- **Integration Guide**: `INTEGRATION-GUIDE.md` (for fullstack)
- **Frontend Setup**: `FRONTEND-SETUP.md`
- **Backend Setup**: `BACKEND-SETUP.md`
- **Migration Plan**: `DOCS-MIGRATION-PLAN.md` (for contributors)

---

## FAQs

**Q: Can I use this for a simple website?**  
A: Yes! Just fill out design specs and skip backend docs.

**Q: Can I use this for an API-only project?**  
A: Yes! Fill out backend requirements and skip design specs.

**Q: Do I have to use the included Next.js/NestJS stack?**  
A: No! The `docs/` system works with any technology.

**Q: What if I don't need a database?**  
A: Skip `database-design.md` and focus on other requirements.

**Q: How detailed should my requirements be?**  
A: Very detailed. More detail = better AI output and fewer bugs.

**Q: Can I use this for enterprise projects?**  
A: Yes! The SRS and architecture docs scale to any project size.

---

**Ready to build?** Start with `docs/GETTING-STARTED.md` 🚀

