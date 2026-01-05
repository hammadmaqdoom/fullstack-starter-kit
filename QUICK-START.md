# Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

This guide will help you start the fullstack application with authentication.

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- pnpm 9+

## ⚡ Quick Setup

### 1. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set:

```bash
# App
APP_PORT=8000
APP_URL=http://localhost:8000

# Auth
BETTER_AUTH_SECRET=your-secret-key-here-min-32-chars
BETTER_AUTH_URL=http://localhost:8000

# CORS - Allow frontend
APP_CORS_ORIGIN=http://localhost:3001

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=your_db_name

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 2. Configure Frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local` and set:

```bash
# Backend URL - Points to NestJS backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 3. Start Services

**Terminal 1: NestJS Backend (includes Better Auth)**
```bash
cd backend
pnpm install
pnpm migration:up
pnpm start:dev
```

✅ Backend running at: **http://localhost:8000**

**Terminal 2: Worker (Optional but recommended)**
```bash
cd backend
pnpm start:worker:dev
```

✅ Worker running at: **http://localhost:8001**

**Terminal 3: Next.js Frontend**
```bash
cd frontend
pnpm install
pnpm dev
```

✅ Frontend running at: **http://localhost:3001**

## 🧪 Test Authentication

1. Open http://localhost:3001/sign-up
2. Create an account
3. Check MailDev at http://localhost:1080 for verification email
4. Sign in at http://localhost:3001/sign-in
5. Access dashboard at http://localhost:3001/dashboard

## 📊 Monitoring & Tools

- **Backend API**: http://localhost:8000/api/health
- **Swagger Docs**: http://localhost:8000/api/docs
- **GraphQL**: http://localhost:8000/graphql
- **Bull Board** (Jobs): http://localhost:8000/api/queues
- **Better Auth Docs**: http://localhost:8000/api/auth/reference
- **MailDev** (Emails): http://localhost:1080

## 🎯 Architecture Overview

```
Frontend (3001) → NestJS Backend (8000) → PostgreSQL + Redis
                       ↓
                  Worker (8001)
```

- **Frontend**: Next.js client, NO API routes, NO database
- **Backend**: NestJS with Better Auth, handles ALL authentication
- **Worker**: Background jobs (emails, tasks)

## 🔐 How Authentication Works

1. **Frontend** calls `authClient.signUp.email()` or `authClient.signIn.email()`
2. Request goes to **NestJS backend** at `http://localhost:8000/api/auth/*`
3. **Backend** validates, creates session in Redis, sets HTTP-only cookie
4. **Frontend** automatically includes cookie in future requests with `credentials: 'include'`

## 🐛 Common Issues

### "Cannot connect to backend"
- Check backend is running: `curl http://localhost:8000/api/health`
- Verify `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` in `frontend/.env.local`

### "CORS error"
- Check `APP_CORS_ORIGIN=http://localhost:3001` in `backend/.env`
- Restart backend server

### "Session not persisting"
- Check Redis is running: `redis-cli ping`
- Ensure `credentials: 'include'` in fetch calls

### "Email not sending"
- Check worker is running
- Check MailDev at http://localhost:1080
- Check Bull Board at http://localhost:8000/api/queues

## 📚 Next Steps

- Read [AUTH-ARCHITECTURE.md](./AUTH-ARCHITECTURE.md) for detailed auth flow
- Read [INTEGRATION-GUIDE.md](./INTEGRATION-GUIDE.md) for complete setup
- Read [backend/AGENTS.md](./backend/AGENTS.md) for backend development
- Read [frontend/AGENTS.md](./frontend/AGENTS.md) for frontend development

## ✅ Verification Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3001
- [ ] PostgreSQL running
- [ ] Redis running
- [ ] Worker running (optional)
- [ ] Can sign up
- [ ] Can sign in
- [ ] Session persists
- [ ] Can access dashboard

---

**Need help?** Check the troubleshooting section or read the full documentation.

