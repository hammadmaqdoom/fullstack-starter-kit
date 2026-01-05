# AI Agent Quick Reference Card

> **Quick access to the most important rules and patterns**

## 🚨 Critical Rules (Read First!)

### 1. Requirements-First Development
```
❌ DON'T: Start coding immediately
✅ DO: Check docs/project-requirements/ first
```

### 2. Better Auth (NOT NextAuth)
```
❌ DON'T: Use or reference NextAuth
✅ DO: Use Better Auth (backend + frontend)
```

### 3. Context-Aware Configuration
```
Working in backend/? → Read backend/AGENTS.md
Working in frontend/? → Read frontend/AGENTS.md
Working in docs/? → Read docs/AGENTS.md
```

### 4. TypeScript Strict Mode
```
❌ DON'T: Use 'any' types
✅ DO: Define proper interfaces and types
```

### 5. Test Everything
```
❌ DON'T: Skip writing tests
✅ DO: Write unit and e2e tests
```

## 📁 File Structure Quick Reference

```
Root Level
├── AGENTS.md              ← Read this for comprehensive guidelines
├── CLAUDE.md              ← Quick reference (points to AGENTS.md)
├── .cursorrules           ← Cursor IDE rules
└── AI-CONFIGURATION.md    ← Explains the system

Backend (NestJS)
└── backend/
    ├── AGENTS.md          ← Backend-specific rules
    └── src/
        ├── api/           ← REST + GraphQL endpoints
        ├── auth/          ← Better Auth integration
        ├── database/      ← Migrations, entities
        └── shared/        ← Cache, mail, socket

Frontend (Next.js)
└── frontend/
    ├── AGENTS.md          ← Frontend-specific rules
    └── src/
        ├── app/[locale]/  ← App Router pages
        ├── components/    ← React components
        └── libs/          ← Better Auth client

Documentation
└── docs/
    ├── AGENTS.md          ← Documentation rules
    ├── project-requirements/  ← YOU FILL THIS
    ├── design-specs/          ← YOU FILL THIS (frontend)
    └── generated/             ← AI GENERATES THIS
```

## 🎯 Tech Stack at a Glance

### Backend
- **Framework**: NestJS 10
- **Database**: PostgreSQL + TypeORM
- **Cache**: Redis
- **Queue**: BullMQ
- **Auth**: Better Auth
- **API**: REST (Fastify) + GraphQL (Apollo)
- **Testing**: Jest

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **Auth**: Better Auth client
- **Forms**: React Hook Form + Zod
- **i18n**: next-intl
- **Testing**: Vitest + Playwright

## 🔍 Quick Checks Before Coding

```
□ Requirements in docs/project-requirements/?
□ Design specs in docs/design-specs/? (if frontend)
□ Read folder-specific AGENTS.md?
□ Reviewed similar existing code?
□ TypeScript types defined?
□ Tests planned?
□ Security considered?
```

## 📝 File Naming Conventions

### Backend
```typescript
user.controller.ts    // Controllers
user.service.ts       // Services
user.entity.ts        // Entities
create-user.dto.ts    // DTOs
user.module.ts        // Modules
auth.guard.ts         // Guards
```

### Frontend
```typescript
page.tsx              // Pages (App Router)
layout.tsx            // Layouts
SignInForm.tsx        // Components (PascalCase)
formatDate.ts         // Utils (camelCase)
user.types.ts         // Types
```

### Documentation
```markdown
product-brief.md      // Requirements (kebab-case)
DATABASE_SCHEMA.sql   // Generated (UPPERCASE)
```

## 🎨 Code Style Quick Reference

### TypeScript
```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  name: string | null;
}

async function getUser(id: string): Promise<User> {
  // Implementation
}

// ❌ Bad
async function getUser(id: any): Promise<any> {
  // Implementation
}
```

### React Components
```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// ❌ Bad
export function Button(props) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### NestJS Services
```typescript
// ✅ Good
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

// ❌ Bad
@Injectable()
export class UserService {
  async findOne(id) {
    return this.userRepository.findOne({ where: { id } });
  }
}
```

## 🔐 Security Checklist

```
□ No .env files committed
□ All inputs validated (DTOs + class-validator)
□ User input sanitized
□ Better Auth used for authentication
□ Sensitive data not exposed in responses
□ CORS configured properly
```

## 🧪 Testing Patterns

### Backend (Jest)
```typescript
describe('UserService', () => {
  it('should find a user by id', async () => {
    const user = { id: '1', email: 'test@example.com' };
    jest.spyOn(repository, 'findOne').mockResolvedValue(user as User);
    expect(await service.findOne('1')).toEqual(user);
  });
});
```

### Frontend (Vitest)
```typescript
describe('Button', () => {
  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button label="Click" onClick={onClick} />);
    screen.getByText('Click').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

## 📚 Essential Documentation

| Document | Purpose |
|----------|---------|
| `AGENTS.md` | Comprehensive AI guidelines |
| `docs/GETTING-STARTED.md` | Project walkthrough |
| `docs/PROMPTS.md` | AI prompts for development |
| `INTEGRATION-GUIDE.md` | Frontend-backend integration |
| `BACKEND-SETUP.md` | Backend setup & features |
| `FRONTEND-SETUP.md` | Frontend setup & features |

## 🚀 Development Workflow

```
1. Check Requirements
   └─→ docs/project-requirements/

2. Read Rules
   └─→ Folder-specific AGENTS.md

3. Review Patterns
   └─→ Existing similar code

4. Implement
   └─→ Follow patterns

5. Test
   └─→ Write & run tests

6. Document
   └─→ Update docs if needed
```

## 🆘 Common Issues

### CORS Error
```bash
# Check backend .env
CORS_ORIGIN=http://localhost:3001

# Restart backend
cd backend && pnpm start:dev
```

### Auth Not Working
```bash
# Check Better Auth config
# Backend: src/auth/better-auth.service.ts
# Frontend: src/libs/BetterAuth.ts

# Verify Redis is running
redis-cli ping
```

### Database Connection
```bash
# Check PostgreSQL
docker ps | grep postgres

# Run migrations
cd backend && pnpm migration:up
```

### Build Errors
```bash
# Clear cache
rm -rf .next        # Frontend
rm -rf dist         # Backend

# Reinstall
rm -rf node_modules package-lock.json
npm install

# Type check
npm run check:types
```

## 💡 Pro Tips

1. **Always read requirements first** - Saves hours of rework
2. **Follow existing patterns** - Consistency is key
3. **Use TypeScript properly** - No 'any' types
4. **Write tests** - Catches bugs early
5. **Document as you go** - Future you will thank you

## 📞 Need More Details?

- **Comprehensive guidelines**: Read `AGENTS.md`
- **Backend specifics**: Read `backend/AGENTS.md`
- **Frontend specifics**: Read `frontend/AGENTS.md`
- **Documentation rules**: Read `docs/AGENTS.md`
- **Configuration system**: Read `AI-CONFIGURATION.md`

---

**Remember**: This is a specification-driven development system. Requirements first, then implementation.

