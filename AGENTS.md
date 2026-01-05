# AI Agent Configuration - Fullstack Starter Kit

> **👋 New here?** Start with `ai-config/START-HERE-AI-AGENTS.md` for a quick 5-minute introduction, then come back to this file for comprehensive guidelines.

This document provides comprehensive guidelines for AI agents (Cursor, Claude, GitHub Copilot, etc.) working on this project.

## 🎯 Project Overview

This is a **fullstack starter kit** for building any type of software project:
- **Frontend**: Next.js 16 with App Router, TypeScript, Tailwind CSS 4
- **Backend**: NestJS 10 with TypeORM, PostgreSQL, Redis, Better Auth
- **Documentation**: Specification-driven development system

## 📁 Project Structure

```
fullstack-starter-kit/
├── docs/              # Requirements & specifications (START HERE)
├── frontend/          # Next.js 16 application
├── backend/           # NestJS 10 API server
└── [Root configs]     # Project-wide configuration
```

## 🚨 Critical Rules

### 1. Requirements-First Development
- **ALWAYS** check `docs/project-requirements/` before implementing features
- **NEVER** implement features without documented requirements
- If requirements are missing, ask the user to define them first
- Use `docs/PROMPTS.md` for guidance on generating implementation code

### 2. Folder-Specific Context
When working in a specific folder, **READ** the local `AGENTS.md` or `.cursorrules`:
- `backend/AGENTS.md` - Backend-specific rules
- `frontend/AGENTS.md` - Frontend-specific rules
- `docs/AGENTS.md` - Documentation-specific rules

### 3. Tech Stack Awareness
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Better Auth client
- **Backend**: NestJS 10, TypeORM, PostgreSQL, Redis, Better Auth server
- **Never** suggest alternative frameworks unless explicitly requested
- **Always** use the existing patterns and conventions

### 4. Authentication Integration
- Backend uses **Better Auth** (NOT NextAuth)
- Frontend uses Better Auth client
- Sessions stored in Redis
- HTTP-only cookies for security
- See `INTEGRATION-GUIDE.md` for auth flow

### 5. Code Quality Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **Linting**: ESLint configured, fix before committing
- **Formatting**: Prettier configured, auto-format on save
- **Testing**: Write tests for new features (Jest for backend, Vitest for frontend)

## 🚀 Quick Start for AI Agents

**New to this project?** Follow this path:
1. **5 minutes**: Read `ai-config/START-HERE-AI-AGENTS.md` - Quick introduction
2. **10 minutes**: Read this file (`AGENTS.md`) - Comprehensive guidelines
3. **15 minutes**: Read folder-specific `AGENTS.md` for your work area
4. **5 minutes**: Check `docs/project-requirements/` for feature requirements

**Need quick reference?** Use `ai-config/AI-QUICK-REFERENCE.md` for fast lookups.

## 📋 Development Workflow

### Phase 1: Requirements Definition (docs/)
1. User fills out `docs/project-requirements/`
2. User fills out `docs/design-specs/` (if frontend)
3. AI generates documentation using `docs/PROMPTS.md`
4. Review and validate requirements

### Phase 2: Implementation (backend/ or frontend/)
1. Read requirements from `docs/`
2. Check local `AGENTS.md` for folder-specific rules
3. Implement following existing patterns
4. Write tests
5. Update documentation if needed

### Phase 3: Integration
1. Ensure frontend-backend communication works
2. Test authentication flow
3. Verify CORS and environment variables
4. Check `INTEGRATION-GUIDE.md` for details

## 🔍 Before Making Changes

### Always Check:
1. **Requirements**: Is this feature documented in `docs/project-requirements/`?
2. **Design Specs**: (Frontend only) Is the UI defined in `docs/design-specs/`?
3. **Existing Code**: Are there similar patterns already implemented?
4. **Tests**: Do existing tests need updates?
5. **Documentation**: Does documentation need updates?

### Never Do:
- ❌ Implement undocumented features
- ❌ Change tech stack without approval
- ❌ Break existing authentication flow
- ❌ Ignore TypeScript errors
- ❌ Skip writing tests
- ❌ Commit without linting

## 📝 File Naming Conventions

### Backend (NestJS)
- **Controllers**: `*.controller.ts` (e.g., `user.controller.ts`)
- **Services**: `*.service.ts` (e.g., `user.service.ts`)
- **Entities**: `*.entity.ts` (e.g., `user.entity.ts`)
- **DTOs**: `*.dto.ts` (e.g., `create-user.dto.ts`)
- **Modules**: `*.module.ts` (e.g., `user.module.ts`)
- **Guards**: `*.guard.ts` (e.g., `auth.guard.ts`)
- **Decorators**: `*.decorator.ts` (e.g., `current-user.decorator.ts`)

### Frontend (Next.js)
- **Pages**: `page.tsx` (in app router directories)
- **Layouts**: `layout.tsx`
- **Components**: `PascalCase.tsx` (e.g., `SignInForm.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Types**: `*.types.ts` or `*.d.ts`

### Documentation
- **Requirements**: `kebab-case.md` (e.g., `product-brief.md`)
- **Generated**: `UPPERCASE.md` or `UPPERCASE.sql` (e.g., `DATABASE_SCHEMA.sql`)

## 🎨 Code Style Guidelines

### TypeScript
```typescript
// ✅ Good: Explicit types, no any
interface User {
  id: string;
  email: string;
  name: string | null;
}

async function getUser(id: string): Promise<User> {
  // Implementation
}

// ❌ Bad: Using any
async function getUser(id: any): Promise<any> {
  // Implementation
}
```

### React Components (Frontend)
```typescript
// ✅ Good: Functional component with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={`btn-${variant}`}>
      {label}
    </button>
  );
}

// ❌ Bad: No types, unclear props
export function Button(props) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### NestJS Services (Backend)
```typescript
// ✅ Good: Injectable service with dependency injection
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}

// ❌ Bad: No error handling, unclear return type
@Injectable()
export class UserService {
  async findOne(id) {
    return this.userRepository.findOne({ where: { id } });
  }
}
```

## 🔐 Security Guidelines

### Environment Variables
- **NEVER** commit `.env` files
- **ALWAYS** use `.env.example` as template
- **VALIDATE** environment variables at startup (using @t3-oss/env-nextjs for frontend)

### Authentication
- **NEVER** store passwords in plain text
- **ALWAYS** use Better Auth for authentication
- **NEVER** expose sensitive data in API responses
- **ALWAYS** validate user permissions

### API Security
- **ALWAYS** validate input data (use DTOs with class-validator)
- **ALWAYS** sanitize user input
- **NEVER** trust client-side data
- **ALWAYS** use CORS properly

## 🧪 Testing Guidelines

### Backend Tests (Jest)
```typescript
// Unit test example
describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should find a user by id', async () => {
    const user = { id: '1', email: 'test@example.com' };
    jest.spyOn(repository, 'findOne').mockResolvedValue(user as User);

    expect(await service.findOne('1')).toEqual(user);
  });
});
```

### Frontend Tests (Vitest)
```typescript
// Component test example
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button label="Click me" onClick={onClick} />);
    screen.getByText('Click me').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

## 📚 Documentation Standards

### Code Comments
```typescript
// ✅ Good: Explain WHY, not WHAT
// Use exponential backoff to avoid overwhelming the API during high traffic
async function retryWithBackoff(fn: () => Promise<void>, maxRetries = 3) {
  // Implementation
}

// ❌ Bad: Obvious comments
// This function adds two numbers
function add(a: number, b: number): number {
  return a + b;
}
```

### JSDoc for Public APIs
```typescript
/**
 * Retrieves a user by their unique identifier.
 * 
 * @param id - The unique identifier of the user
 * @returns A promise that resolves to the user object
 * @throws {NotFoundException} When user is not found
 * 
 * @example
 * ```typescript
 * const user = await userService.findOne('123');
 * console.log(user.email);
 * ```
 */
async findOne(id: string): Promise<User> {
  // Implementation
}
```

## 🔄 Git Workflow

### Commit Messages
Follow Conventional Commits:
```
feat: add user profile page
fix: resolve authentication redirect loop
docs: update API documentation
refactor: simplify user service logic
test: add tests for user controller
chore: update dependencies
```

### Branch Naming
```
feature/user-profile
fix/auth-redirect-loop
docs/api-documentation
refactor/user-service
```

## 🚀 Deployment Considerations

### Environment-Specific Code
```typescript
// ✅ Good: Check environment
if (process.env.NODE_ENV === 'production') {
  // Production-only code
}

// ❌ Bad: Hardcoded values
const apiUrl = 'http://localhost:8000';
```

### Database Migrations
- **ALWAYS** create migrations for schema changes
- **NEVER** modify existing migrations
- **TEST** migrations in development first
- **BACKUP** database before running migrations in production

## 📞 Getting Help

### When Stuck:
1. Check the relevant `AGENTS.md` in the specific folder
2. Review `docs/GETTING-STARTED.md` for workflow guidance
3. Check `INTEGRATION-GUIDE.md` for frontend-backend issues
4. Review existing similar implementations in the codebase
5. Ask the user for clarification

### Common Issues:
- **CORS errors**: Check `backend/.env` CORS_ORIGIN setting
- **Auth not working**: Verify Better Auth configuration in both frontend and backend
- **Database errors**: Check migrations are up to date
- **Build errors**: Check TypeScript errors and dependencies

## 🎓 Learning Resources

### Project-Specific
- `docs/GETTING-STARTED.md` - Complete project walkthrough
- `docs/PROMPTS.md` - AI prompts for development
- `INTEGRATION-GUIDE.md` - Frontend-backend integration
- `BACKEND-SETUP.md` - Backend setup and features
- `FRONTEND-SETUP.md` - Frontend setup and features

### AI Configuration
- `ai-config/START-HERE-AI-AGENTS.md` - Quick start for AI agents
- `ai-config/AI-QUICK-REFERENCE.md` - Quick reference card
- `ai-config/AI-FILES-INDEX.md` - Navigation index
- `ai-config/AI-CONFIGURATION-DIAGRAM.md` - Visual guide

### External Resources
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Better Auth Documentation](https://www.better-auth.com)
- [TypeORM Documentation](https://typeorm.io)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## ✅ Pre-Implementation Checklist

Before implementing any feature:
- [ ] Requirements documented in `docs/project-requirements/`
- [ ] Design specs defined (if frontend) in `docs/design-specs/`
- [ ] Similar patterns reviewed in existing codebase
- [ ] Local `AGENTS.md` rules reviewed
- [ ] TypeScript types defined
- [ ] Test plan considered
- [ ] Error handling planned
- [ ] Security implications reviewed

## 🎯 Success Criteria

A successful implementation should:
- ✅ Match documented requirements
- ✅ Follow existing code patterns
- ✅ Include proper TypeScript types
- ✅ Have appropriate error handling
- ✅ Include tests (unit and/or integration)
- ✅ Pass linting and type checking
- ✅ Update documentation if needed
- ✅ Work with existing authentication
- ✅ Be secure and performant

---

**Remember**: This is a specification-driven development system. Always start with requirements, follow existing patterns, and maintain high code quality standards.

