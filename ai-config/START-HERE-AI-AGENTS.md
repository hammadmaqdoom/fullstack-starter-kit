# 🤖 START HERE - AI Agents

> **Welcome! This is your entry point to understanding this project.**

## ⚡ Quick Start (2 minutes)

### 1. What is this project?
**Fullstack Starter Kit** - A comprehensive starter kit for building any type of software project.

### 2. Tech Stack
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **Backend**: NestJS 10 + TypeORM + PostgreSQL + Better Auth
- **Documentation**: Specification-driven development system

### 3. Critical Rules (Must Know!)
1. ⚠️ **Requirements First**: ALWAYS check `docs/project-requirements/` before coding
2. ⚠️ **Better Auth**: This project uses Better Auth (NOT NextAuth)
3. ⚠️ **TypeScript Strict**: No `any` types allowed
4. ⚠️ **Context-Aware**: Read folder-specific `AGENTS.md` for your work area

## 📚 What to Read Next

### If you have 5 minutes:
→ Read: `AI-QUICK-REFERENCE.md`

### If you have 15 minutes:
→ Read: `AGENTS.md` (root)

### If you have 30 minutes:
→ Read: `AGENTS.md` (root) + folder-specific `AGENTS.md`

## 📁 Where Am I Working?

### Working on Backend?
1. Read: `backend/AGENTS.md` (15 min)
2. Check: `docs/project-requirements/database-design.md`
3. Check: `docs/project-requirements/api-specification.md`

### Working on Frontend?
1. Read: `frontend/AGENTS.md` (15 min)
2. Check: `docs/design-specs/design-system.md`
3. Check: `docs/design-specs/ui-specifications/`

### Working on Documentation?
1. Read: `docs/AGENTS.md` (12 min)
2. Check: `docs/GETTING-STARTED.md`
3. Check: `docs/STRUCTURE.md`

### Not Sure?
1. Read: `AGENTS.md` (root) (10 min)
2. Then read folder-specific `AGENTS.md`

## 🎯 Quick Decision Tree

```
Are requirements documented?
├─ Yes → Continue to implementation
└─ No → Ask user to document requirements first

Which area am I working in?
├─ Backend → Read backend/AGENTS.md
├─ Frontend → Read frontend/AGENTS.md
├─ Docs → Read docs/AGENTS.md
└─ General → Read AGENTS.md (root)

Do I need a quick reference?
├─ Yes → Use AI-QUICK-REFERENCE.md
└─ No → Use comprehensive AGENTS.md files

Need to find a specific file?
├─ Yes → Use AI-FILES-INDEX.md
└─ No → Continue with current file
```

## 🚨 Critical "Don'ts"

### NEVER Do These:
1. ❌ Implement features without documented requirements
2. ❌ Use or reference NextAuth (use Better Auth)
3. ❌ Use `any` types in TypeScript
4. ❌ Skip writing tests
5. ❌ Ignore linting errors
6. ❌ Commit `.env` files
7. ❌ Break existing authentication flow
8. ❌ Change tech stack without approval

## ✅ Always Do These:

### Before Coding:
1. ✅ Check `docs/project-requirements/` for requirements
2. ✅ Read folder-specific `AGENTS.md` for patterns
3. ✅ Review similar existing code
4. ✅ Understand the tech stack

### While Coding:
1. ✅ Follow existing patterns
2. ✅ Use TypeScript properly (no `any`)
3. ✅ Validate inputs (DTOs + Zod)
4. ✅ Handle errors properly
5. ✅ Write tests

### After Coding:
1. ✅ Run linter and fix errors
2. ✅ Run tests
3. ✅ Update documentation if needed
4. ✅ Review your changes

## 📖 Essential Files

### Must Read (Priority Order)
1. **`AGENTS.md`** (root) - Comprehensive guidelines
2. **Folder-specific `AGENTS.md`** - Detailed patterns
3. **`AI-QUICK-REFERENCE.md`** - Quick lookups

### Quick Access
4. **`AI-FILES-INDEX.md`** - Find the right file
5. **`AI-CONFIGURATION-DIAGRAM.md`** - Visual guide

### Tool-Specific
6. **`.cursorrules`** - Cursor IDE rules
7. **`CLAUDE.md`** - Claude AI quick reference

## 🎨 Code Style Quick Reference

### TypeScript
```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
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
async findOne(id) {
  return this.userRepository.findOne({ where: { id } });
}
```

## 🔍 Common Patterns

### Authentication
```typescript
// Backend (NestJS)
import { Auth } from '@/decorators/auth/auth.decorator';

@Auth()
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}

// Frontend (Next.js)
import { authClient } from '@/libs/BetterAuth';

await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123',
});
```

### Form Validation
```typescript
// Using Zod
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type UserFormData = z.infer<typeof userSchema>;
```

### API Calls
```typescript
// Frontend to Backend
const res = await fetch(`${Env.NEXT_PUBLIC_BACKEND_URL}/api/users`, {
  credentials: 'include', // Important for cookies
  headers: { 'Content-Type': 'application/json' },
});
```

## 🆘 Common Issues

### "CORS Error"
→ Check `backend/.env` CORS_ORIGIN setting

### "Auth Not Working"
→ Verify Better Auth config in both frontend and backend

### "Database Connection Failed"
→ Check PostgreSQL is running: `docker ps | grep postgres`

### "Build Errors"
→ Clear cache: `rm -rf .next` (frontend) or `rm -rf dist` (backend)

## 📞 Need More Help?

### For Comprehensive Guidelines:
→ Read: `AGENTS.md` (root)

### For Backend Specifics:
→ Read: `backend/AGENTS.md`

### For Frontend Specifics:
→ Read: `frontend/AGENTS.md`

### For Documentation:
→ Read: `docs/AGENTS.md`

### For Quick Lookups:
→ Use: `AI-QUICK-REFERENCE.md`

### For Navigation:
→ Use: `AI-FILES-INDEX.md`

### For Visual Guide:
→ Use: `AI-CONFIGURATION-DIAGRAM.md`

## 🚀 Ready to Start?

### Checklist Before Coding:
- [ ] Read this file (START-HERE-AI-AGENTS.md) ✓
- [ ] Read `AGENTS.md` (root)
- [ ] Read folder-specific `AGENTS.md`
- [ ] Check requirements in `docs/project-requirements/`
- [ ] Understand the tech stack
- [ ] Know the critical rules

### Once Ready:
1. ✅ Configuration understood
2. ✅ Requirements checked
3. ✅ Patterns reviewed
4. ✅ Start implementing!

## 🎯 Success Path

```
1. Read this file (5 min)
   ↓
2. Read AGENTS.md (10 min)
   ↓
3. Read folder-specific AGENTS.md (15 min)
   ↓
4. Check requirements (5 min)
   ↓
5. Review existing code (10 min)
   ↓
6. Start implementing! 🚀
```

## 💡 Pro Tips

1. **Bookmark** `AI-QUICK-REFERENCE.md` for quick lookups
2. **Always** check requirements before coding
3. **Follow** existing patterns in the codebase
4. **Use** TypeScript properly (no `any`)
5. **Write** tests for new features
6. **Ask** user when requirements are unclear

## 🎉 You're Ready!

You now have everything you need to start working effectively on this project. 

### Next Steps:
1. Read `AGENTS.md` (root) for comprehensive guidelines
2. Read folder-specific `AGENTS.md` for your work area
3. Check `docs/project-requirements/` for feature requirements
4. Start implementing following the patterns

---

**Remember**: This is a specification-driven development system. Requirements first, then implementation!

**Happy Coding! 🚀**

