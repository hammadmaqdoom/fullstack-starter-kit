# Frontend Setup Guide

This guide will help you set up the Next.js frontend with Better Auth integration.

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 20+ installed
- ✅ pnpm 9+ installed (required)
- ✅ Backend server set up and running (see `BACKEND-SETUP.md`)
- ✅ PostgreSQL database running (shared with backend)

## 🚀 Quick Start

### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
# Backend API URL (must match your backend URL)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Optional: Analytics and Monitoring
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
LOGTAIL_SOURCE_TOKEN=
ARCJET_KEY=
SENTRY_DSN=
```

**Important**: The `NEXT_PUBLIC_BACKEND_URL` must point to your running backend server.

### Step 4: Run Database Migrations

The frontend uses the same PostgreSQL database as the backend for Drizzle ORM:

```bash
pnpm db:migrate
```

### Step 5: Start Development Server

```bash
pnpm dev
```

The frontend will be available at: **http://localhost:3001**

## 🔐 Authentication Setup

The frontend is already configured to use Better Auth from your backend. No additional auth setup is needed!

### How It Works

1. **Better Auth Client**: Configured in `src/libs/BetterAuth.ts`
2. **Session Management**: Handled via HTTP-only cookies from backend
3. **Protected Routes**: Middleware in `src/proxy.ts` checks authentication
4. **Auth Components**: Custom sign-in/sign-up forms in `src/components/auth/`

### Testing Authentication

1. **Start Backend** (in separate terminal):
   ```bash
   cd ../backend
   pnpm start:dev
   ```

2. **Start Frontend**:
   ```bash
   cd ../frontend
   pnpm dev
   ```

3. **Visit Sign Up**: http://localhost:3001/sign-up
4. **Create Account**: Fill in the form
5. **Check Email**: Backend sends verification email (check MailDev at http://localhost:1080)
6. **Sign In**: http://localhost:3001/sign-in
7. **Access Dashboard**: http://localhost:3001/dashboard

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/[locale]/
│   │   ├── (auth)/              # Auth-related pages
│   │   │   ├── (center)/        # Centered layout (sign-in, sign-up)
│   │   │   │   ├── sign-in/
│   │   │   │   └── sign-up/
│   │   │   └── dashboard/       # Protected dashboard
│   │   └── (marketing)/         # Public pages
│   │
│   ├── components/
│   │   ├── auth/                # Auth components
│   │   │   ├── SignInForm.tsx   # Email/password sign-in
│   │   │   ├── SignUpForm.tsx   # User registration
│   │   │   ├── SignOutButton.tsx
│   │   │   └── UserProfile.tsx
│   │   └── ...
│   │
│   ├── libs/
│   │   ├── BetterAuth.ts        # Better Auth client config
│   │   ├── Env.ts               # Environment variables
│   │   └── ...
│   │
│   └── proxy.ts                 # Middleware (auth, security)
│
└── package.json
```

## 🔧 Configuration

### Backend URL

The frontend needs to know where your backend is running:

**Development**:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

**Production**:
```bash
NEXT_PUBLIC_BACKEND_URL=https://api.yourapp.com
```

### CORS Configuration

Ensure your backend allows requests from the frontend. In `backend/.env`:

```bash
CORS_ORIGIN=http://localhost:3001,https://yourapp.com
```

### Database Connection

The frontend uses Drizzle ORM with the same PostgreSQL database as the backend. Ensure your backend database is running and migrations are applied.

## 🧪 Testing

### Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm check:types

# Linting
pnpm lint
```

### Test Authentication Flow

1. Open http://localhost:3001/sign-up
2. Create a new account
3. Check MailDev (http://localhost:1080) for verification email
4. Click verification link
5. Sign in at http://localhost:3001/sign-in
6. Access protected dashboard at http://localhost:3001/dashboard

## 🌐 Internationalization

The app supports multiple languages (English and French by default).

### Switch Language

Use the language switcher in the navigation bar.

### Add a New Language

1. Update `src/utils/AppConfig.ts`:
   ```typescript
   export const AppConfig = {
     locales: ['en', 'fr', 'es'], // Add new locale
     defaultLocale: 'en',
   };
   ```

2. Create translation file: `src/locales/es.json`

3. Copy structure from `src/locales/en.json` and translate

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect repository to Vercel
3. Vercel will automatically detect pnpm (via packageManager field)
4. Set environment variables:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://api.yourapp.com
   ```
5. Deploy

### Docker

```bash
# Build image
docker build -t frontend .

# Run container
docker run -p 3001:3001 \
  -e NEXT_PUBLIC_BACKEND_URL=http://localhost:3000 \
  frontend
```

### Environment Variables for Production

```bash
# Required
NEXT_PUBLIC_BACKEND_URL=https://api.yourapp.com

# Optional but recommended
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
SENTRY_DSN=your-sentry-dsn
ARCJET_KEY=your-arcjet-key
```

## 🆘 Troubleshooting

### Issue: "Failed to sign in"

**Solution**:
1. Check backend is running: `curl http://localhost:3000/api/health`
2. Verify `NEXT_PUBLIC_BACKEND_URL` in `.env.local`
3. Check browser console for errors
4. Ensure CORS is configured in backend

### Issue: "Session not persisting"

**Solution**:
1. Check cookies are enabled in browser
2. Verify backend Redis is running
3. Check backend session configuration
4. Clear browser cookies and try again

### Issue: "Cannot connect to backend"

**Solution**:
1. Ensure backend is running on port 3000
2. Check `NEXT_PUBLIC_BACKEND_URL` matches backend URL
3. Verify firewall/network settings
4. Check backend logs for errors

### Issue: Build errors

**Solution**:
```bash
# Clear cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Rebuild
pnpm build
```

## 📚 Key Features

### Authentication

- ✅ Email/Password sign-in
- ✅ User registration
- ✅ Email verification (backend)
- ✅ Password reset (backend)
- ✅ Session management
- ✅ Protected routes
- ✅ OAuth providers (backend: GitHub, etc.)
- ✅ Magic links (backend)
- ✅ Passkeys (backend)
- ✅ Two-factor auth (backend)

### Frontend

- ✅ Server-side rendering (SSR)
- ✅ Static generation (SSG)
- ✅ Internationalization (i18n)
- ✅ Form validation (Zod)
- ✅ Type-safe environment variables
- ✅ Analytics (PostHog)
- ✅ Error tracking (Sentry)
- ✅ Security (Arcjet)
- ✅ Testing (Vitest + Playwright)

## 🔗 Integration with Backend

### Backend Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/sign-up/email` | User registration |
| `POST /api/auth/sign-in/email` | User sign-in |
| `POST /api/auth/sign-out` | User sign-out |
| `GET /api/auth/session` | Get current session |
| `POST /api/auth/verify-email` | Verify email |
| `POST /api/auth/reset-password` | Reset password |

### Session Management

Better Auth uses HTTP-only cookies for session management:

- **Cookie Name**: `better-auth.session_token`
- **Storage**: Redis (backend)
- **Expiry**: Configurable in backend
- **Security**: HTTP-only, Secure (in production), SameSite

## 📖 Next Steps

1. **Customize Design**: Update Tailwind config and components
2. **Add Features**: Build your app-specific features
3. **Set Up Analytics**: Configure PostHog
4. **Configure Monitoring**: Set up Sentry
5. **Write Tests**: Add tests for your features
6. **Deploy**: Deploy to Vercel or your hosting

## 🎯 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Better Auth Documentation](https://www.better-auth.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Backend Setup Guide](../BACKEND-SETUP.md)

---

**Need Help?** Check the backend logs and browser console for detailed error messages.

