# AI Agent Configuration — Frontend (Polaris / Next.js)

Frontend guidelines for **Polaris** (Digitaro HRMS). Read `../AGENTS.md` and `../docs/AGENTS.md` first.

## Polaris frontend rules

| Rule | Detail |
|---|---|
| **UI library** | PrimeReact (Styled mode) + Digitaro theme — see `../docs/design-specs/primereact-setup.md` |
| **Layout** | `AuthenticatedShell` + `AppSidebar`; mobile bottom tabs, desktop sidebar |
| **Screens** | Match `../docs/design-specs/ui-specifications/` + wireframes |
| **Hub** | Unified inbox — not per-module request lists (UX §5.1) |
| **Workflows** | Status tracker on every request-bearing flow |
| **Daily actions** | One-tap check-in, swipe approve |
| **States** | skeleton, empty, error, offline, success |
| **Responsive** | Employee flows: 375px, 768px, 1280px |
| **Auth UI** | Entra SSO button + contractor email tab |
| **i18n** | **English only** — `locales/en.json` only; do not edit `ar.json`/`fr.json` (starter-kit leftovers) |
| **PWA** | Service worker + offline queue for check-in (Phase 1) |
| **Phase** | Phase 0 — People Ops worker screens; see `../docs/generated/tasks.md` |

**Per screen:** ui-specification → wireframe → PRD §6.x → implement → Playwright smoke test.

## Frontend overview

- **Framework**: Next.js 16 (App Router), React 19, TypeScript strict
- **Components**: PrimeReact + Tailwind 4 (layout/spacing)
- **Icons**: Lucide React only — see [Icons](#-icons-lucide-react)
- **Auth**: Better Auth client + Entra OIDC
- **Forms**: React Hook Form + Zod
- **i18n**: next-intl — **English only** (`locales/en.json`; ignore `ar.json`/`fr.json`)
- **Testing**: Vitest + Playwright
- **No frontend DB** — all data from `/api/v1/`

## Frontend structure

```
frontend/src/
├── app/[locale]/
│   ├── (auth)/                    # Authenticated Polaris app
│   │   ├── (center)/              # Sign-in (Entra + contractor)
│   │   ├── employee/              # Employee portal (Phase 1)
│   │   ├── manager/               # Manager cockpit (Phase 1)
│   │   ├── people-ops/            # HR admin (Phase 0)
│   │   ├── finance/               # Finance (Phase 2)
│   │   └── hub/                   # Unified inbox (Phase 1)
│   └── page.tsx                   # Marketing landing
├── components/
│   ├── AppSidebar.tsx
│   ├── AuthenticatedShell.tsx
│   └── shared/                    # StatusTracker, etc.
├── libs/BetterAuth.ts
└── locales/en.json
```

## 🚨 Critical Frontend Rules

### 1. App Router (NOT Pages Router)
```typescript
// ✅ Correct: App Router structure
// app/[locale]/(auth)/dashboard/page.tsx
export default function DashboardPage() {
  return <div>Dashboard</div>;
}

// ❌ Wrong: Pages Router (old Next.js)
// pages/dashboard.tsx - Don't use this!
```

### 2. Server vs Client Components
```typescript
// ✅ Good: Server Component (default)
// app/[locale]/page.tsx
export default async function HomePage() {
  const data = await fetchData(); // Can fetch on server
  return <div>{data}</div>;
}

// ✅ Good: Client Component (when needed)
// components/Counter.tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// ❌ Bad: Using 'use client' unnecessarily
'use client'; // Don't add this unless you need client-side features!

export default function StaticPage() {
  return <div>Static content</div>;
}
```

### 3. Better Auth Client
```typescript
// ✅ Correct: Using Better Auth client
import { authClient } from '@/libs/BetterAuth';

// Sign in
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123',
});

// Get session
const { data: session } = useSession();

// ❌ Wrong: Never reference NextAuth
import { signIn } from 'next-auth/react'; // This is WRONG!
```

### 4. Internationalization
```typescript
// ✅ Good: Using next-intl
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('Common');
  return <h1>{t('welcome')}</h1>;
}

// ❌ Bad: Hardcoded strings
export function MyComponent() {
  return <h1>Welcome</h1>; // Should be translated!
}
```

### 5. Type-Safe Environment Variables
```typescript
// ✅ Good: Using Env.ts
import { Env } from '@/libs/Env';

const apiUrl = Env.NEXT_PUBLIC_BACKEND_URL;

// ❌ Bad: Direct process.env access
const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL; // No type safety!
```

### 6. No Frontend Database
```typescript
// ✅ Good: Fetching data from backend API
import { Env } from '@/libs/Env';

async function getUsers() {
  const response = await fetch(`${Env.NEXT_PUBLIC_BACKEND_URL}/api/users`, {
    credentials: 'include', // Important for cookies
  });
  return response.json();
}

// ❌ Bad: Direct database access in frontend
import { db } from '@/libs/DB'; // This should NOT exist!
const users = await db.query.users.findMany();
```

## 🎨 Component Patterns

### Functional Components
```typescript
// ✅ Good: Typed functional component
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {label}
    </button>
  );
}

// ❌ Bad: No types, unclear props
export function Button(props) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### Client Components with Hooks
```typescript
// ✅ Good: Client component with proper hooks
'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/libs/BetterAuth';

export function UserProfile() {
  const { data: session, isPending } = useSession();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user.id).then(setProfile);
    }
  }, [session]);

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Please sign in</div>;
  }

  return <div>Hello {profile?.name}</div>;
}
```

### Server Components with Data Fetching
```typescript
// ✅ Good: Server component with async data
// app/[locale]/posts/page.tsx
async function getPosts() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/posts`, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });
  return res.json();
}

export default async function PostsPage() {
  const posts = await getPosts();
  
  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  );
}
```

## 🔐 Authentication Patterns

### Protected Pages
```typescript
// ✅ Good: Protected page with redirect
// app/[locale]/(auth)/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/libs/BetterAuth';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/sign-in');
  }

  return <div>Welcome {session.user.email}</div>;
}
```

### Sign In Form
```typescript
// ✅ Good: Sign in form with validation
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authClient } from '@/libs/BetterAuth';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignInForm = z.infer<typeof signInSchema>;

export function SignInForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInForm) => {
    try {
      await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });
      // Redirect handled by Better Auth
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="input"
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="input"
        />
        {errors.password && (
          <p className="text-red-500 text-sm">{errors.password.message}</p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

## 🎨 Icons (Lucide React)

**Always use [Lucide React](https://lucide.dev) for icons.** `lucide-react` is already installed. Do not use emoji, inline SVGs, or other icon libraries.

```typescript
// ✅ Good: Lucide icon with Tailwind sizing
import { Check, ChevronDown, LogOut } from 'lucide-react';

export function SignOutButton() {
  return (
    <button type="button" aria-label="Sign out">
      <LogOut className="size-5" aria-hidden />
    </button>
  );
}

// ✅ Good: Pass LucideIcon type to reusable components
import type { LucideIcon } from 'lucide-react';

type NavItemProps = {
  icon: LucideIcon;
  label: string;
};

export function NavItem({ icon: Icon, label }: NavItemProps) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="size-5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

// ❌ Bad: Emoji as icon
<span className="text-2xl">🚀</span>

// ❌ Bad: Other icon libraries
import { FaRocket } from 'react-icons/fa';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';
```

**Sizing:** `size-4` (16px inline), `size-5` (20px default UI), `size-6` (24px cards), `size-8` (32px nav/hero).

**Accessibility:** Decorative icons get `aria-hidden`. If the icon conveys meaning without adjacent text, put `aria-label` on the interactive parent.

Full token reference: `../docs/design-specs/design-system.md` → Icons.

## 🎨 Styling with Tailwind CSS

### Component Styling
```typescript
// ✅ Good: Tailwind classes with proper organization
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      {children}
    </div>
  );
}

// ✅ Good: Conditional classes
export function Button({ variant, disabled }: ButtonProps) {
  return (
    <button
      className={`
        px-4 py-2 rounded-md font-medium transition-colors
        ${variant === 'primary' 
          ? 'bg-blue-600 text-white hover:bg-blue-700' 
          : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      disabled={disabled}
    >
      Click me
    </button>
  );
}

// ❌ Bad: Inline styles
export function Button() {
  return (
    <button style={{ backgroundColor: 'blue', padding: '10px' }}>
      Click me
    </button>
  );
}
```

### Responsive Design
```typescript
// ✅ Good: Mobile-first responsive design
export function Hero() {
  return (
    <section className="
      px-4 py-8           // Mobile
      md:px-8 md:py-16    // Tablet
      lg:px-16 lg:py-24   // Desktop
    ">
      <h1 className="
        text-2xl           // Mobile
        md:text-4xl        // Tablet
        lg:text-6xl        // Desktop
        font-bold
      ">
        Welcome
      </h1>
    </section>
  );
}
```

## 📝 Form Validation

### Zod Schemas
```typescript
// ✅ Good: Reusable Zod schemas
// validations/user.ts
import { z } from 'zod';

export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export type UserFormData = z.infer<typeof userSchema>;

// Using in component
import { userSchema, type UserFormData } from '@/validations/user';

export function UserForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });
  
  // ...
}
```

## 🌐 API Communication

### Fetching from Backend
```typescript
// ✅ Good: Type-safe API calls
import { Env } from '@/libs/Env';

interface User {
  id: string;
  email: string;
  name: string | null;
}

async function getUser(id: string): Promise<User> {
  const res = await fetch(`${Env.NEXT_PUBLIC_BACKEND_URL}/api/users/${id}`, {
    credentials: 'include', // Important for cookies
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user: ${res.statusText}`);
  }

  return res.json();
}

// ❌ Bad: No error handling, no types
async function getUser(id) {
  const res = await fetch(`http://localhost:8000/api/users/${id}`);
  return res.json();
}
```

### POST Requests
```typescript
// ✅ Good: POST with error handling
async function createPost(data: { title: string; content: string }) {
  try {
    const res = await fetch(`${Env.NEXT_PUBLIC_BACKEND_URL}/api/posts`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to create post');
    }

    return res.json();
  } catch (error) {
    console.error('Create post error:', error);
    throw error;
  }
}
```

## 🧪 Testing Patterns

### Component Tests (Vitest)
```typescript
// ✅ Good: Component test
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button label="Click me" onClick={onClick} />);
    
    fireEvent.click(screen.getByText('Click me'));
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);
    
    const button = screen.getByText('Click me');
    expect(button).toBeDisabled();
  });
});
```

### E2E Tests (Playwright)
```typescript
// ✅ Good: E2E test
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should sign in successfully', async ({ page }) => {
    await page.goto('/sign-in');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

## 🌍 Internationalization

### Adding Translations
```json
// locales/en.json
{
  "Common": {
    "welcome": "Welcome",
    "signIn": "Sign In",
    "signOut": "Sign Out"
  },
  "Dashboard": {
    "title": "Dashboard",
    "greeting": "Hello, {name}!"
  }
}

// locales/fr.json
{
  "Common": {
    "welcome": "Bienvenue",
    "signIn": "Se connecter",
    "signOut": "Se déconnecter"
  },
  "Dashboard": {
    "title": "Tableau de bord",
    "greeting": "Bonjour, {name}!"
  }
}
```

### Using Translations
```typescript
// ✅ Good: Using translations
import { useTranslations } from 'next-intl';

export function Dashboard({ userName }: { userName: string }) {
  const t = useTranslations('Dashboard');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('greeting', { name: userName })}</p>
    </div>
  );
}
```

## 🎯 Performance Optimization

### Image Optimization
```typescript
// ✅ Good: Using Next.js Image
import Image from 'next/image';

export function Avatar({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="rounded-full"
    />
  );
}

// ❌ Bad: Regular img tag
export function Avatar({ src, alt }) {
  return <img src={src} alt={alt} className="rounded-full" />;
}
```

### Dynamic Imports
```typescript
// ✅ Good: Code splitting with dynamic import
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false, // Disable SSR if not needed
});

export function Page() {
  return (
    <div>
      <HeavyComponent />
    </div>
  );
}
```

### Caching
```typescript
// ✅ Good: Using Next.js caching
// Revalidate every 60 seconds
async function getData() {
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 60 },
  });
  return res.json();
}

// Cache indefinitely (until redeployed)
async function getStaticData() {
  const res = await fetch('https://api.example.com/static', {
    cache: 'force-cache',
  });
  return res.json();
}

// Never cache (always fresh)
async function getDynamicData() {
  const res = await fetch('https://api.example.com/dynamic', {
    cache: 'no-store',
  });
  return res.json();
}
```

## 🔍 Error Handling

### Error Boundaries
```typescript
// ✅ Good: Error boundary
'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }

    return this.props.children;
  }
}
```

### Loading States
```typescript
// ✅ Good: Proper loading states
'use client';

import { useState, useEffect } from 'react';

export function UserList() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## 📱 Accessibility

### Semantic HTML
```typescript
// ✅ Good: Semantic HTML with accessibility
export function Navigation() {
  return (
    <nav aria-label="Main navigation">
      <ul>
        <li>
          <a href="/" aria-current="page">
            Home
          </a>
        </li>
        <li>
          <a href="/about">About</a>
        </li>
      </ul>
    </nav>
  );
}
```

### Form Accessibility
```typescript
// ✅ Good: Accessible form
export function ContactForm() {
  return (
    <form>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          required
          aria-required="true"
          aria-describedby="name-error"
        />
        <span id="name-error" className="error" role="alert">
          Name is required
        </span>
      </div>

      <button type="submit" aria-label="Submit contact form">
        Submit
      </button>
    </form>
  );
}
```

## ✅ Pre-Implementation Checklist

Before implementing a frontend feature:
- [ ] Requirements documented in `../docs/project-requirements/`
- [ ] Design specs defined in `../docs/design-specs/`
- [ ] Component structure planned
- [ ] Types/interfaces defined
- [ ] Validation schemas created (Zod)
- [ ] Translations added (if applicable)
- [ ] Accessibility considered
- [ ] Responsive design planned
- [ ] Loading/error states handled
- [ ] Tests planned

## 🆘 Common Issues

### Authentication Not Working
```bash
# Check backend is running
curl http://localhost:8000/api/health

# Verify environment variable
echo $NEXT_PUBLIC_BACKEND_URL

# Check browser cookies
# Open DevTools > Application > Cookies
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Type check
pnpm check:types
```

### CORS Issues
- Ensure backend CORS_ORIGIN includes frontend URL
- Use `credentials: 'include'` in fetch calls
- Check browser console for specific CORS errors

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Better Auth Documentation](https://www.better-auth.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Hook Form Documentation](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)
- [next-intl Documentation](https://next-intl-docs.vercel.app)

---

**Remember**: Use App Router, prefer Server Components, validate with Zod, style with Tailwind, and always consider accessibility and performance.

