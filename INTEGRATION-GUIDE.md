# Frontend-Backend Integration Guide

Complete guide for integrating the Next.js frontend with the NestJS backend using Better Auth.

## 🎯 Overview

This project consists of:

- **Backend**: NestJS with Better Auth server, PostgreSQL, Redis
- **Frontend**: Next.js 16 with Better Auth client (Port 3001)
- **Authentication**: Better Auth (server runs in NestJS backend only)
- **Database**: PostgreSQL (accessed by backend only)

**Important**: All authentication is handled by the NestJS backend. The Next.js frontend has NO API routes or authentication logic - it only acts as a client.

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ Node.js 20+
- ✅ PostgreSQL 14+
- ✅ Redis 7+
- ✅ pnpm 9+ (required)

## 🚀 Quick Start (Both Services)

### Step 1: Start Backend

```bash
# Terminal 1: Backend API (includes Better Auth)
cd backend
pnpm install
pnpm migration:up
pnpm start:dev
```

Backend API will run on: **http://localhost:8000** (default, configurable via `APP_PORT`)

**Optional but Recommended - Start Worker:**

```bash
# Terminal 2: Backend Worker (for background jobs)
cd backend
pnpm start:worker:dev
```

Worker will run on: **http://localhost:8001** (default, configurable via `APP_WORKER_PORT`)

The worker processes background jobs like:
- ✉️ Sending emails
- 📊 Data processing
- 🔄 Scheduled tasks
- 📁 File processing

### Step 2: Start Frontend

```bash
# Terminal 3: Frontend (or Terminal 2 if not running worker)
cd frontend
pnpm install
pnpm dev
```

Frontend will run on: **http://localhost:3001** (default Next.js port)

**Note**: The frontend does NOT require:
- Database connection
- Redis connection
- Auth secrets
- Email configuration

All of these are managed by the NestJS backend.

### Step 3: Test Authentication

1. Open http://localhost:3001/sign-up
2. Create an account (calls `http://localhost:8000/api/auth/sign-up/email`)
3. Check MailDev at http://localhost:1080 for verification email
4. Sign in at http://localhost:3001/sign-in (calls `http://localhost:8000/api/auth/sign-in/email`)
5. Access dashboard at http://localhost:3001/dashboard

**All auth requests go to the NestJS backend at port 8000.**

## 🔐 Authentication Flow

### How It Works

```
┌─────────────────────────┐
│   Next.js Frontend      │
│   Port: 3001            │
│                         │
│   - Better Auth Client  │
│   - UI Components       │
│   - NO API routes       │
│   - NO database         │
└────────────┬────────────┘
             │
             │ All API calls
             │ (credentials: 'include')
             ▼
┌─────────────────────────┐
│   NestJS Backend        │
│   Port: 8000            │
│                         │
│   - Better Auth Server  │
│   - /api/auth/* routes  │
│   - Business logic      │
│   - Database access     │
└────────────┬────────────┘
             │
             ├──────────────┐
             │              │
             ▼              ▼
     ┌─────────────┐  ┌──────────┐
     │ PostgreSQL  │  │  Redis   │
     │             │  │          │
     │ - Users     │  │ Sessions │
     │ - Data      │  │ Cache    │
     └─────────────┘  └──────────┘
```

### Authentication Steps

1. **Sign Up** (Frontend → NestJS Backend):
   - User fills sign-up form on frontend
   - Frontend calls `authClient.signUp.email()`
   - Request sent to `POST http://localhost:8000/api/auth/sign-up/email`
   - NestJS backend creates user in PostgreSQL
   - NestJS backend queues verification email job
   - Worker processes email job and sends email

2. **Email Verification** (Backend):
   - User clicks link in email
   - Backend verifies email
   - User account is activated

3. **Sign In** (Frontend → NestJS Backend):
   - User fills sign-in form on frontend
   - Frontend calls `authClient.signIn.email()`
   - Request sent to `POST http://localhost:8000/api/auth/sign-in/email`
   - NestJS backend validates credentials against PostgreSQL
   - NestJS backend creates session in Redis
   - NestJS backend sets HTTP-only cookie: `better-auth.session_token`
   - Frontend receives user data and session

4. **Session Management**:
   - Cookie: `better-auth.session_token`
   - Stored in: Redis (backend)
   - Validated on: Every protected route

5. **Protected Routes**:
   - Frontend checks session with `useSession()` hook
   - For API calls, cookie automatically sent with `credentials: 'include'`
   - NestJS backend validates session from Redis
   - User accesses protected content or receives 401

## 🔧 Configuration

### Backend Configuration

File: `backend/.env`

```bash
# App
NODE_ENV=development
APP_PORT=8000                    # NestJS backend port
APP_WORKER_PORT=8001             # Worker port
API_PREFIX=api
APP_URL=http://localhost:8000
IS_WORKER=false  # Automatically set by npm scripts

# Database (shared by API and Worker)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=your_db_name

# Redis (shared by API and Worker)
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:8000

# CORS (Allow frontend - REQUIRED)
APP_CORS_ORIGIN=http://localhost:3001

# Email (required for worker to send emails)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@yourapp.com
```

**Worker Configuration Notes:**
- The `IS_WORKER` environment variable is automatically set by npm scripts (`pnpm start:worker` or `pnpm start:worker:dev`)
- Worker uses `APP_WORKER_PORT` (default: 8001)
- Main API uses `APP_PORT` (default: 8000)
- Both share the same database and Redis instance
- Worker processes jobs from Redis queue (emails, tasks, etc.)
- Worker does NOT expose API routes, GraphQL, or Better Auth endpoints

### Frontend Configuration

File: `frontend/.env.local`

```bash
# Backend URL (REQUIRED - Points to NestJS backend)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Optional: Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Optional: Monitoring
LOGTAIL_SOURCE_TOKEN=
SENTRY_DSN=

# Optional: Security
ARCJET_KEY=
```

**Important Notes:**
- The frontend does NOT need database credentials, Redis credentials, or auth secrets
- All authentication is handled by the NestJS backend at port 8000
- All data fetching goes through the NestJS backend API
- Session cookies are managed automatically by Better Auth (server-side in NestJS)
- The frontend only needs `NEXT_PUBLIC_BACKEND_URL` to connect to the backend

## 🔗 API Endpoints

### Better Auth Endpoints (NestJS Backend)

All auth endpoints are served by the NestJS backend at `http://localhost:8000/api/auth/*`:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/sign-up/email` | Register new user |
| `POST` | `/api/auth/sign-in/email` | Sign in with email/password |
| `POST` | `/api/auth/sign-out` | Sign out user |
| `GET` | `/api/auth/session` | Get current session |
| `POST` | `/api/auth/verify-email` | Verify email address |
| `POST` | `/api/auth/reset-password` | Reset password |
| `POST` | `/api/auth/magic-link` | Send magic link |
| `POST` | `/api/auth/two-factor/enable` | Enable 2FA |
| `POST` | `/api/auth/passkey/register` | Register passkey |

### Custom API Endpoints (NestJS Backend)

Add your custom endpoints in `backend/src/api/`. They will be available at `http://localhost:8000/api/*`:

```typescript
// Example: backend/src/api/user/user.controller.ts
@Controller('users')
export class UserController {
  @Get('profile')
  @Auth() // Protected route
  getProfile(@CurrentUser() user: User) {
    return user;
  }
}
```

### Calling NestJS Backend from Frontend

```typescript
// Frontend: src/components/MyComponent.tsx
'use client';

import { useSession } from '@/libs/BetterAuth';
import { Env } from '@/libs/Env';

export function MyComponent() {
  const { data: session } = useSession();

  const fetchData = async () => {
    // All API calls go to NestJS backend at port 8000
    const response = await fetch(
      `${Env.NEXT_PUBLIC_BACKEND_URL}/api/users/profile`,
      {
        credentials: 'include', // ⚠️ IMPORTANT: Include cookies for auth
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    
    const data = await response.json();
    return data;
  };

  // ...
}
```

**⚠️ Critical**: Always use `credentials: 'include'` to send authentication cookies with requests.

## 🛡️ Security

### CORS Configuration

NestJS backend must allow frontend origin:

```typescript
// backend/src/main.ts (automatically configured from APP_CORS_ORIGIN)
app.enableCors({
  origin: ['http://localhost:3001', 'https://yourapp.com'],
  credentials: true, // ⚠️ CRITICAL: Required for cookies
  methods: ['GET', 'PATCH', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
});
```

**Set in `.env`:**
```bash
APP_CORS_ORIGIN=http://localhost:3001,https://yourapp.com
```

### Cookie Security

Better Auth uses HTTP-only cookies:

- **HTTP-only**: JavaScript cannot access
- **Secure**: HTTPS only (in production)
- **SameSite**: CSRF protection
- **Domain**: Shared between frontend/backend

### Environment Variables

Never commit sensitive values:

```bash
# ❌ Don't commit
BETTER_AUTH_SECRET=actual-secret

# ✅ Use .env.example
BETTER_AUTH_SECRET=your-secret-key-here
```

## 🧪 Testing Integration

### Test NestJS Backend

```bash
# Check health
curl http://localhost:8000/api/health

# Test sign-up
curl -X POST http://localhost:8000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Check Better Auth API reference
open http://localhost:8000/api/auth/reference
```

### Test Frontend

1. Open http://localhost:3001
2. Navigate to /sign-up
3. Fill in the form
4. Check browser Network tab
5. Verify request goes to backend
6. Check response and cookies

### Test Full Flow

```bash
# 1. Start backend API
cd backend && pnpm start:dev

# 2. Start backend worker (new terminal)
cd backend && pnpm start:worker:dev

# 3. Start frontend (new terminal)
cd frontend && pnpm dev

# 4. Open browser
open http://localhost:3001/sign-up

# 5. Create account and verify flow
# - Check MailDev at http://localhost:1080 for verification email
# - Worker processes the email job in the background
```

## 🐛 Troubleshooting

### Issue: CORS Error

**Error**: "Access to fetch at 'http://localhost:8000' from origin 'http://localhost:3001' has been blocked by CORS"

**Solution**:
1. Check `APP_CORS_ORIGIN` in `backend/.env` includes `http://localhost:3001`
2. Ensure `credentials: true` is set in CORS config (it is by default)
3. Restart NestJS backend server
4. Clear browser cache and cookies

### Issue: Session Not Persisting

**Error**: User signs in but is immediately signed out

**Solution**:
1. Check Redis is running: `redis-cli ping`
2. Verify `credentials: 'include'` in fetch calls
3. Check cookie settings in browser DevTools
4. Ensure backend and frontend use same domain (localhost)

### Issue: Cannot Connect to Backend

**Error**: "Failed to fetch" or "Network error"

**Solution**:
1. Verify NestJS backend is running: `curl http://localhost:8000/api/health`
2. Check `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local` is set to `http://localhost:8000`
3. Check `APP_PORT` in `backend/.env` matches the URL
4. Ensure no firewall blocking port 8000
5. Check NestJS backend logs for errors

### Issue: Email Not Sending

**Error**: Verification email not received

**Solution**:
1. Check MailDev is running: http://localhost:1080
2. Verify email config in backend `.env`
3. Check backend logs for email errors
4. For production, configure real SMTP

### Issue: Database Connection Failed

**Error**: "Connection refused" or "Database error"

**Solution**:
1. Check PostgreSQL is running: `psql -h localhost -U postgres`
2. Verify database exists: `\l` in psql
3. Check credentials in backend `.env`
4. Run migrations: `pnpm migration:up`

## 📊 Monitoring

### Backend Monitoring

**Main API Server (Port 8000):**
- **Health Check**: http://localhost:8000/api/health
- **Swagger Docs**: http://localhost:8000/api/docs
- **GraphQL Playground**: http://localhost:8000/graphql
- **Bull Board** (Queue Monitoring): http://localhost:8000/api/queues
- **Better Auth API Reference**: http://localhost:8000/api/auth/reference
- **Prometheus Metrics**: http://localhost:8000/metrics

**Worker Instance (Port 8001):**
- **Health Check**: http://localhost:8001/api/health
- **Worker Status**: Check Bull Board on main API at http://localhost:8000/api/queues

**Monitoring Tools (if using Docker):**
- **Grafana**: http://localhost:3002
- **MailDev** (Email testing): http://localhost:1080

### Frontend Monitoring

- **PostHog**: Configure in `.env.local`
- **Sentry**: Configure in `.env.local`
- **Browser DevTools**: Network tab for API calls

## 🚢 Deployment

### Development

```bash
# Backend API (Terminal 1)
cd backend && pnpm start:dev

# Backend Worker (Terminal 2)
cd backend && pnpm start:worker:dev

# Frontend (Terminal 3)
cd frontend && pnpm dev
```

### Production

#### Backend (NestJS)

**Option 1: Manual (with PM2)**

```bash
# Build
cd backend
pnpm build

# Start both API and Worker with PM2
pm2 start pm2.config.json

# Monitor
pm2 monit

# Scale workers if needed
pm2 scale worker 3
```

**Option 2: Docker Compose (Recommended)**

```bash
cd backend
docker-compose -f docker-compose.prod.yml up -d

# This starts:
# - API server (port 3000)
# - Worker instance(s) (auto-scaled)
# - PostgreSQL
# - Redis
# - Grafana
```

**Option 3: Separate Processes**

```bash
# Terminal 1: API
cd backend
pnpm build
pnpm start:prod

# Terminal 2: Worker
cd backend
pnpm start:worker
```

#### Frontend (Next.js)

Deploy to Vercel:

```bash
# Install Vercel CLI (optional, can use Vercel Dashboard)
pnpm add -g vercel

# Deploy
cd frontend
vercel --prod
```

Or build manually:

```bash
cd frontend
pnpm build
pnpm start
```

### Environment Variables (Production)

#### Backend

```bash
NODE_ENV=production
APP_PORT=8000                    # Or your production port
APP_WORKER_PORT=8001             # Or your production worker port
APP_URL=https://api.yourapp.com
APP_CORS_ORIGIN=https://yourapp.com
DATABASE_HOST=your-db-host
DATABASE_SSL_ENABLED=true
REDIS_HOST=your-redis-host
BETTER_AUTH_SECRET=strong-random-secret
BETTER_AUTH_URL=https://api.yourapp.com

# Worker will use IS_WORKER=true (set by deployment script)
```

#### Frontend

```bash
# Points to your NestJS backend
NEXT_PUBLIC_BACKEND_URL=https://api.yourapp.com
```

## 📝 CMS Integration

### CMS Overview

The boilerplate includes a complete Content Management System (CMS) with:
- Content management (blog, pages, docs, changelog)
- SEO optimization (meta tags, JSON-LD, sitemaps)
- Analytics management (GTM, GA4, Facebook, Pinterest, Yandex)
- Media library
- Dynamic navigation menus

### CMS Configuration

**Important**: All CMS configuration is stored in the **database**, not environment variables:

- Analytics tracking IDs (GTM, GA4, etc.)
- Site verification codes (Google, Bing, Yandex, etc.)
- Feature flags
- Custom scripts

This allows:
- Dynamic updates without redeployment
- Admin UI management
- Environment-specific configs
- A/B testing

### CMS API Endpoints

All CMS endpoints are prefixed with `/api/v1/`:

**Content**:
- `GET /api/v1/contents` - List contents
- `GET /api/v1/contents/slug/:slug` - Get by slug
- `POST /api/v1/contents` - Create content (admin)
- `PATCH /api/v1/contents/:id` - Update content (admin)
- `POST /api/v1/contents/:id/publish` - Publish content (admin)

**Analytics**:
- `GET /api/v1/analytics/configs` - Get analytics configs (public)
- `POST /api/v1/analytics/configs` - Create config (admin)
- `GET /api/v1/analytics/verification` - Get verification codes (public)
- `GET /api/v1/analytics/custom-scripts` - Get custom scripts (public)

**SEO**:
- `GET /api/v1/seo/metadata/:contentId` - Get SEO metadata (public)
- `GET /api/v1/seo/sitemap.xml` - Generate sitemap (public)
- `GET /api/v1/seo/robots.txt` - Generate robots.txt (public)

**Structured Data**:
- `GET /api/v1/structured-data/generate/:contentId` - Generate JSON-LD (public)

### Frontend CMS Usage

#### Server-Side Metadata Generation

```typescript
// frontend/src/app/[locale]/(marketing)/blog/[slug]/page.tsx
import { generateContentMetadata } from '@/libs/metadata-generator';

export async function generateMetadata({ params }) {
  return await generateContentMetadata(params.slug, params.locale);
}
```

#### Analytics Injection

Analytics are automatically injected in the root layout:

```typescript
// frontend/src/app/[locale]/layout.tsx
const config = await loadRuntimeConfig();
// GTM, GA4, verification tags automatically injected
```

#### Admin UI

Access admin UI at:
- `/admin/cms/contents` - Content management
- `/admin/cms/analytics` - Analytics configuration
- `/admin/cms/seo` - SEO settings
- `/admin/cms/media` - Media library

### CMS Database Setup

After installing dependencies, generate and run migrations:

```bash
# Backend
cd backend
pnpm install
pnpm migration:generate src/database/migrations/CreateCmsTables
pnpm migration:up

# Frontend (if using Drizzle)
cd frontend
pnpm install
```

This creates all CMS tables:
- `analytics_configs`, `site_verification`, `custom_scripts`, `feature_flags`
- `contents`, `categories`, `tags`, `content_versions`
- `seo_metadata`, `json_ld_schemas`, `structured_data_templates`
- `content_redirects`, `media`, `navigation_menus`, `geo_settings`

### CMS Environment Variables

Add to `.env` files:

```bash
# Backend
FRONTEND_URL=http://localhost:3001
SITE_NAME=Your Site Name

# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

**Note**: Analytics IDs and verification codes are stored in the database, not in `.env` files.

### CMS Features

#### Content Management
- Create/edit/delete content
- Publishing workflow (draft → review → published)
- Version history with rollback
- Categories and tags
- Reading time calculation

#### SEO Features
- Complete meta tags (title, description, keywords)
- Open Graph tags
- Twitter Card tags
- JSON-LD structured data (23+ schema types)
- Dynamic sitemap.xml
- Dynamic robots.txt
- Hreflang support
- Canonical URLs

#### Analytics Features
- Google Tag Manager (GTM)
- Google Analytics 4 (GA4)
- Facebook Pixel
- Pinterest Tag
- Yandex Metrica
- Custom scripts injection
- Site verification codes

See [`CMS_IMPLEMENTATION_SUMMARY.md`](../CMS_IMPLEMENTATION_SUMMARY.md) for complete details.

## 📚 Additional Resources

- [Backend Setup Guide](./BACKEND-SETUP.md)
- [Frontend Setup Guide](./FRONTEND-SETUP.md)
- [Better Auth Documentation](https://www.better-auth.com)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)

## ✅ Integration Checklist

### Backend Setup
- [ ] NestJS backend API is running on port 8000 (or configured port)
- [ ] Backend Worker is running on port 8001 (optional but recommended)
- [ ] PostgreSQL is running and migrations applied
- [ ] Redis is running (required for both API and Worker)
- [ ] CORS is configured in backend (`APP_CORS_ORIGIN` includes frontend URL)
- [ ] Email service is configured (MailDev for dev, SMTP for production)
- [ ] Better Auth is accessible at `/api/auth/*`
- [ ] Bull Board is accessible at `/api/queues`
- [ ] Health checks pass for both API and Worker

### Frontend Setup
- [ ] Frontend is running on port 3001 (default Next.js port)
- [ ] `NEXT_PUBLIC_BACKEND_URL` is set to `http://localhost:8000` in `frontend/.env.local`
- [ ] NO API routes exist in `frontend/src/app/[locale]/api/`
- [ ] Better Auth client is configured to use `NEXT_PUBLIC_BACKEND_URL`

### Authentication Flow
- [ ] Can sign up a new user
- [ ] Verification email is sent (check MailDev or worker logs)
- [ ] Can verify email
- [ ] Can sign in
- [ ] Can access protected dashboard
- [ ] Session persists across page refreshes
- [ ] Can sign out

### CMS Integration
- [ ] CMS migrations applied (`pnpm migration:up` in backend)
- [ ] Can access CMS admin UI (`/admin/cms/contents`)
- [ ] Analytics configs can be managed via admin UI
- [ ] Sitemap is accessible (`/sitemap.xml`)
- [ ] Robots.txt is accessible (`/robots.txt`)

### Worker Verification
- [ ] Worker processes email jobs (check Bull Board)
- [ ] Failed jobs can be retried from Bull Board
- [ ] Worker logs show job processing
- [ ] No jobs stuck in "active" state

## 🎉 Success!

If all checklist items are complete, your frontend and backend are fully integrated!

**Next Steps**:
1. Customize the design
2. Add your app-specific features
3. Configure production services
4. Deploy to production

---

**Need Help?** Check the backend and frontend logs for detailed error messages.

