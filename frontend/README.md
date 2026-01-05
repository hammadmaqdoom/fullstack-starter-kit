# Frontend - Next.js with Better Auth

Modern Next.js 16 frontend integrated with Better Auth backend authentication.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4
- **Authentication**: Better Auth client (connects to backend)
- **Forms**: React Hook Form + Zod
- **Internationalization**: next-intl
- **Analytics**: PostHog (optional)
- **Error Tracking**: Sentry (optional)
- **Security**: Arcjet (optional)
- **Testing**: Vitest + Playwright
- **Data Management**: All data is managed by the backend API (no frontend database)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   └── [locale]/          # Internationalized routes
│   │       ├── (auth)/        # Auth-related pages
│   │       │   ├── (center)/  # Centered auth pages
│   │       │   │   ├── sign-in/
│   │       │   │   └── sign-up/
│   │       │   └── dashboard/ # Protected dashboard
│   │       └── (marketing)/   # Public marketing pages
│   │
│   ├── components/            # React components
│   │   ├── auth/             # Auth components
│   │   │   ├── SignInForm.tsx
│   │   │   ├── SignUpForm.tsx
│   │   │   ├── SignOutButton.tsx
│   │   │   └── UserProfile.tsx
│   │   └── ...
│   │
│   ├── libs/                  # Core libraries
│   │   ├── BetterAuth.ts     # Better Auth client config
│   │   ├── Env.ts            # Environment variables
│   │   └── ...
│   │
│   └── utils/                 # Utility functions
│
├── public/                    # Static assets
├── tests/                     # Tests
└── package.json
```

## 🔧 Setup & Installation

### Prerequisites

- Node.js 20+
- npm or pnpm
- Backend server running (see `../backend/README.md`)

### Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# Backend API URL (REQUIRED)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Optional: PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Optional: Logtail
LOGTAIL_SOURCE_TOKEN=

# Optional: Arcjet Security
ARCJET_KEY=

# Optional: Sentry Error Tracking
SENTRY_DSN=
```

**Important Notes:**
- The frontend does NOT connect to a database directly
- All data is fetched from the backend API
- Authentication is handled entirely by the backend
- Session cookies are managed automatically by Better Auth

See `ENV-SETUP.md` for detailed environment variable documentation.

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

## 🚀 Running the Application

### Prerequisites

**Before starting the frontend, ensure the backend is running:**

```bash
# In the backend directory
cd ../backend
pnpm install
pnpm migration:up
pnpm start:dev
```

Backend should be running on http://localhost:3000

### Development Mode

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:3001
```

### Production Mode

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔐 Authentication

This frontend uses **Better Auth** client to connect to the NestJS backend.

### Authentication Flow

1. **Sign Up**: Users create an account via `/sign-up`
2. **Email Verification**: Backend sends verification email
3. **Sign In**: Users sign in via `/sign-in`
4. **Session Management**: Better Auth handles sessions via cookies
5. **Protected Routes**: Dashboard routes require authentication

### Using Authentication in Components

```typescript
'use client';

import { useSession } from '@/libs/BetterAuth';

export function MyComponent() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not signed in</div>;

  return <div>Hello {session.user.email}</div>;
}
```

### Sign In

```typescript
import { authClient } from '@/libs/BetterAuth';

await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123',
});
```

### Sign Up

```typescript
import { authClient } from '@/libs/BetterAuth';

await authClient.signUp.email({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe',
});
```

### Sign Out

```typescript
import { authClient } from '@/libs/BetterAuth';

await authClient.signOut();
```

## 📊 Available Features

### Authentication Features

- ✅ Email/Password authentication
- ✅ Session management
- ✅ Protected routes
- ✅ Email verification (backend)
- ✅ Password reset (backend)
- ✅ OAuth providers (backend: GitHub, etc.)
- ✅ Magic links (backend)
- ✅ Passkeys/WebAuthn (backend)
- ✅ Two-factor authentication (backend)

### Frontend Features

- ✅ Server-side rendering (SSR)
- ✅ Static site generation (SSG)
- ✅ Internationalization (i18n)
- ✅ Form validation with Zod
- ✅ Type-safe environment variables
- ✅ Analytics integration (PostHog)
- ✅ Error tracking (Sentry)
- ✅ Security (Arcjet)
- ✅ Testing (Vitest + Playwright)

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Type checking
npm run check:types

# Linting
npm run lint
```

## 🌐 Internationalization

The app supports multiple languages (currently English and French).

### Adding a New Language

1. Add locale to `src/utils/AppConfig.ts`:
```typescript
export const AppConfig = {
  locales: ['en', 'fr', 'es'], // Add 'es'
  defaultLocale: 'en',
};
```

2. Create translation file: `src/locales/es.json`

3. Add translations for all keys

## 🔄 Integration with Backend

### API Communication

The frontend communicates with the backend via:

1. **Better Auth API**: `/api/auth/*` endpoints
2. **REST API**: `/api/*` endpoints (custom)
3. **GraphQL**: `/graphql` endpoint (if needed)

### Backend URL Configuration

Set `NEXT_PUBLIC_BACKEND_URL` in `.env.local`:

```bash
# Development
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Production
NEXT_PUBLIC_BACKEND_URL=https://api.yourapp.com
```

### CORS Configuration

Ensure your backend allows requests from the frontend URL. In backend `.env`:

```bash
CORS_ORIGIN=http://localhost:3001,https://yourapp.com
```

## 📝 Key Files

### Authentication

- `src/libs/BetterAuth.ts` - Better Auth client configuration
- `src/components/auth/SignInForm.tsx` - Sign in form
- `src/components/auth/SignUpForm.tsx` - Sign up form
- `src/components/auth/SignOutButton.tsx` - Sign out button
- `src/components/auth/UserProfile.tsx` - User profile display

### Middleware

- `src/proxy.ts` - Middleware for route protection and security

### Environment

- `src/libs/Env.ts` - Type-safe environment variables

## 🚢 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Docker

```bash
# Build Docker image
docker build -t frontend .

# Run container
docker run -p 3001:3001 frontend
```

### Environment Variables for Production

```bash
NEXT_PUBLIC_BACKEND_URL=https://api.yourapp.com
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
SENTRY_DSN=your-sentry-dsn
ARCJET_KEY=your-arcjet-key
```

## 🔗 Backend Integration Checklist

- [ ] Backend is running on `http://localhost:3000`
- [ ] Backend CORS allows frontend URL
- [ ] Environment variable `NEXT_PUBLIC_BACKEND_URL` is set
- [ ] Database migrations are run on backend
- [ ] Email service is configured on backend (for verification)

## 🆘 Troubleshooting

### Authentication Not Working

1. Check backend is running: `curl http://localhost:3000/api/health`
2. Verify `NEXT_PUBLIC_BACKEND_URL` in `.env.local`
3. Check browser console for errors
4. Verify CORS settings in backend

### Session Not Persisting

1. Check cookies are enabled in browser
2. Verify backend session configuration
3. Check if backend Redis is running (for session storage)

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Better Auth Documentation](https://www.better-auth.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Hook Form Documentation](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)

## 🎯 Next Steps

1. **Customize Design**: Update colors, fonts, and layout in Tailwind config
2. **Add Features**: Build your app-specific features
3. **Configure Analytics**: Set up PostHog for user tracking
4. **Set Up Error Tracking**: Configure Sentry for production
5. **Add Tests**: Write tests for your components and pages
6. **Deploy**: Deploy to Vercel or your preferred hosting

---

**Note**: This frontend is designed to work seamlessly with the NestJS backend in `../backend/`. Make sure the backend is running before starting the frontend.
