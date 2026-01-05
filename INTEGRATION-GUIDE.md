# Frontend-Backend Integration Guide

Complete guide for integrating the Next.js frontend with the NestJS backend using Better Auth.

## 🎯 Overview

This project consists of:

- **Backend**: NestJS with Better Auth, PostgreSQL, Redis
- **Frontend**: Next.js 16 with Better Auth client
- **Authentication**: Better Auth (shared between frontend and backend)
- **Database**: PostgreSQL (shared)

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ Node.js 20+
- ✅ PostgreSQL 14+
- ✅ Redis 7+
- ✅ pnpm 9+ (required)

## 🚀 Quick Start (Both Services)

### Step 1: Start Backend

```bash
# Terminal 1: Backend
cd backend
pnpm install
pnpm migration:up
pnpm start:dev
```

Backend will run on: **http://localhost:3000**

### Step 2: Start Frontend

```bash
# Terminal 2: Frontend
cd frontend
pnpm install
pnpm dev
```

Frontend will run on: **http://localhost:3001**

**Note**: The frontend does NOT require a database connection. All data is managed by the backend.

### Step 3: Test Authentication

1. Open http://localhost:3001/sign-up
2. Create an account
3. Check MailDev at http://localhost:1080 for verification email
4. Sign in at http://localhost:3001/sign-in
5. Access dashboard at http://localhost:3001/dashboard

## 🔐 Authentication Flow

### How It Works

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│             │         │             │         │              │
│  Frontend   │────────▶│   Backend   │────────▶│  PostgreSQL  │
│  (Next.js)  │         │  (NestJS)   │         │              │
│             │◀────────│             │◀────────│              │
└─────────────┘         └─────────────┘         └──────────────┘
      │                       │
      │                       │
      │                       ▼
      │                 ┌──────────┐
      │                 │  Redis   │
      └─────────────────│ (Session)│
                        └──────────┘
```

### Authentication Steps

1. **Sign Up** (Frontend → Backend):
   - User fills sign-up form
   - Frontend calls `POST /api/auth/sign-up/email`
   - Backend creates user in PostgreSQL
   - Backend sends verification email

2. **Email Verification** (Backend):
   - User clicks link in email
   - Backend verifies email
   - User account is activated

3. **Sign In** (Frontend → Backend):
   - User fills sign-in form
   - Frontend calls `POST /api/auth/sign-in/email`
   - Backend validates credentials
   - Backend creates session in Redis
   - Backend sets HTTP-only cookie

4. **Session Management**:
   - Cookie: `better-auth.session_token`
   - Stored in: Redis (backend)
   - Validated on: Every protected route

5. **Protected Routes**:
   - Frontend middleware checks cookie
   - Backend validates session from Redis
   - User accesses protected content

## 🔧 Configuration

### Backend Configuration

File: `backend/.env`

```bash
# App
NODE_ENV=development
PORT=3000
API_PREFIX=api
APP_URL=http://localhost:3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=your_db_name

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# CORS (Allow frontend)
CORS_ORIGIN=http://localhost:3001,http://localhost:3000

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@yourapp.com
```

### Frontend Configuration

File: `frontend/.env.local`

```bash
# Backend URL (REQUIRED - must match backend)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

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
- The frontend does NOT need database credentials
- All authentication is handled by the backend
- All data fetching goes through the backend API
- Session cookies are managed automatically by Better Auth

## 🔗 API Endpoints

### Better Auth Endpoints (Backend)

All auth endpoints are available at `/api/auth/*`:

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

### Custom API Endpoints (Backend)

Add your custom endpoints in `backend/src/api/`:

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

### Calling Backend from Frontend

```typescript
// Frontend: src/components/MyComponent.tsx
'use client';

import { useSession } from '@/libs/BetterAuth';

export function MyComponent() {
  const { data: session } = useSession();

  const fetchData = async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/profile`,
      {
        credentials: 'include', // Include cookies
      }
    );
    const data = await response.json();
    return data;
  };

  // ...
}
```

## 🛡️ Security

### CORS Configuration

Backend must allow frontend origin:

```typescript
// backend/src/main.ts
app.enableCors({
  origin: ['http://localhost:3001', 'https://yourapp.com'],
  credentials: true, // Important for cookies
});
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

### Test Backend

```bash
# Check health
curl http://localhost:3000/api/health

# Test sign-up
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
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
# 1. Start backend
cd backend && pnpm start:dev

# 2. Start frontend (new terminal)
cd frontend && pnpm dev

# 3. Open browser
open http://localhost:3001/sign-up

# 4. Create account and verify flow
```

## 🐛 Troubleshooting

### Issue: CORS Error

**Error**: "Access to fetch at 'http://localhost:3000' from origin 'http://localhost:3001' has been blocked by CORS"

**Solution**:
1. Check `CORS_ORIGIN` in backend `.env`
2. Ensure it includes frontend URL
3. Restart backend server

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
1. Verify backend is running: `curl http://localhost:3000/api/health`
2. Check `NEXT_PUBLIC_BACKEND_URL` in frontend `.env.local`
3. Ensure no firewall blocking port 3000
4. Check backend logs for errors

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

- **Health Check**: http://localhost:3000/api/health
- **Swagger Docs**: http://localhost:3000/api/docs
- **GraphQL Playground**: http://localhost:3000/graphql
- **Bull Board** (Queues): http://localhost:3000/queues
- **Prometheus Metrics**: http://localhost:3000/metrics
- **Grafana**: http://localhost:3001 (if using Docker)

### Frontend Monitoring

- **PostHog**: Configure in `.env.local`
- **Sentry**: Configure in `.env.local`
- **Browser DevTools**: Network tab for API calls

## 🚢 Deployment

### Development

```bash
# Backend
cd backend && pnpm start:dev

# Frontend
cd frontend && pnpm dev
```

### Production

#### Backend (NestJS)

```bash
# Build
cd backend
pnpm build

# Start
pnpm start:prod
```

Or use Docker:

```bash
cd backend
docker-compose -f docker-compose.prod.yml up -d
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
APP_URL=https://api.yourapp.com
CORS_ORIGIN=https://yourapp.com
DATABASE_HOST=your-db-host
DATABASE_SSL_ENABLED=true
REDIS_HOST=your-redis-host
BETTER_AUTH_SECRET=strong-random-secret
```

#### Frontend

```bash
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
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
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

- [ ] Backend is running on port 3000
- [ ] Frontend is running on port 3001
- [ ] PostgreSQL is running and migrations applied
- [ ] Redis is running
- [ ] CORS is configured in backend
- [ ] `NEXT_PUBLIC_BACKEND_URL` is set in frontend
- [ ] Email service is configured (MailDev for dev)
- [ ] Can sign up a new user
- [ ] Can verify email
- [ ] Can sign in
- [ ] Can access protected dashboard
- [ ] Session persists across page refreshes
- [ ] Can sign out
- [ ] CMS migrations applied (`pnpm migration:up` in backend)
- [ ] Can access CMS admin UI (`/admin/cms/contents`)
- [ ] Analytics configs can be managed via admin UI
- [ ] Sitemap is accessible (`/sitemap.xml`)
- [ ] Robots.txt is accessible (`/robots.txt`)

## 🎉 Success!

If all checklist items are complete, your frontend and backend are fully integrated!

**Next Steps**:
1. Customize the design
2. Add your app-specific features
3. Configure production services
4. Deploy to production

---

**Need Help?** Check the backend and frontend logs for detailed error messages.

