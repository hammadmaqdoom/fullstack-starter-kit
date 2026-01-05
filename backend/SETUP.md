# Backend Setup Guide

The backend is a production-ready NestJS boilerplate with all the features you need.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pnpm install
```

### 2. Setup Environment

Create `.env` file in the `backend/` directory:

```bash
# Copy example (if exists) or create new
cp .env.example .env
```

**Minimum required variables**:

```env
# App
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=your_db_name
DATABASE_SYNCHRONIZE=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth
BETTER_AUTH_SECRET=your-secret-key-change-this
BETTER_AUTH_URL=http://localhost:3000

# Mail (optional for development)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@yourapp.com
```

### 3. Start Dependencies (Docker)

The easiest way is using Docker Compose:

```bash
# Start PostgreSQL + Redis + Grafana + Prometheus
pnpm docker:dev:up
```

**Or manually**:
- PostgreSQL 14+
- Redis 7+

### 4. Run Migrations

```bash
# Run database migrations
pnpm migration:up

# (Optional) Seed database with test data
pnpm seed:run
```

### 5. Start Backend

#### Main API Server

```bash
# Development mode with hot reload
pnpm start:dev
```

Backend will be available at:
- **API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs
- **GraphQL**: http://localhost:3000/graphql
- **Health**: http://localhost:3000/api/health

#### Worker Instance (Optional but Recommended)

For background job processing (emails, data processing, etc.):

```bash
# In a new terminal
pnpm start:worker:dev
```

Worker will be available at:
- **Health Check**: http://localhost:3001/api/health
- **Processes**: Email jobs, scheduled tasks, heavy computations

**Why run a separate worker?**
- ✅ API stays responsive during heavy job processing
- ✅ Better resource utilization
- ✅ Independent scaling
- ✅ Improved monitoring and debugging

## 📋 What's Included

### ✅ Authentication (Better Auth)
- Email/Password login
- OAuth (Google, GitHub, etc.)
- Magic links
- Passkeys (WebAuthn)
- Two-factor authentication (2FA)
- Session management

### ✅ APIs
- **REST API** with Fastify
- **GraphQL** with Apollo Server
- Automatic Swagger documentation
- Request validation
- Error handling

### ✅ Database
- PostgreSQL with TypeORM
- Migrations system
- Seeds for test data
- Connection pooling

### ✅ Caching & Queues
- Redis caching
- BullMQ for background jobs
- Bull Board for queue monitoring
- **Dedicated Worker Instance** for job processing

### ✅ Email
- Nodemailer integration
- React Email templates
- Template preview in development
- Background email processing via worker

### ✅ Monitoring
- Prometheus metrics
- Grafana dashboards
- Health checks
- Sentry error tracking

### ✅ Real-time
- WebSocket support (Socket.IO)
- Redis adapter for scaling

### ✅ File Upload
- AWS S3 integration
- Local storage option
- Multipart upload support

### ✅ Security
- Helmet security headers
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention

### ✅ Worker Architecture
- **Separate worker instance** for background jobs
- Independent scaling of API and workers
- Better resource isolation
- Improved reliability and performance

## 🔧 Common Tasks

### Create New API Endpoint

```bash
# Generate module
nest g module api/products
nest g controller api/products
nest g service api/products
```

### Add Database Migration

```bash
# After changing entities
pnpm migration:generate src/database/migrations/AddProductsTable

# Run migration
pnpm migration:up
```

### Create Background Job

```bash
# Generate processor
nest g class worker/queues/email-processor
```

### Add Email Template

```bash
# Create in src/shared/mail/templates/
# Build templates
pnpm email:build

# Preview
pnpm email:dev
```

## 🔗 Connect to Frontend

### REST API

Frontend can call REST endpoints:

```typescript
// Frontend code
const response = await fetch('http://localhost:3000/api/users/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### GraphQL

Frontend uses Apollo Client:

```typescript
// Frontend code
import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:3000/graphql',
  cache: new InMemoryCache()
});
```

### WebSocket

Frontend connects via Socket.IO:

```typescript
// Frontend code
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
```

### Authentication

Use Better Auth client in frontend:

```typescript
// Frontend code
import { createAuthClient } from 'better-auth/client';

const authClient = createAuthClient({
  baseURL: 'http://localhost:3000'
});
```

## 📊 Monitoring

### Access Monitoring Tools

- **Bull Board** (Queue monitoring): http://localhost:3000/queues
- **Prometheus Metrics**: http://localhost:3000/metrics
- **Grafana** (if using Docker): http://localhost:3001
  - Username: `admin`
  - Password: `admin`

### Pre-configured Dashboards

1. **API Monitoring**: Request rates, response times, error rates
2. **Database Monitoring**: Query performance, connection pool
3. **Server Monitoring**: CPU, memory, disk usage

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

## 🚢 Production Deployment

### Build

```bash
pnpm build
```

### Environment Variables

Update `.env` for production:

```env
NODE_ENV=production
DATABASE_SSL_ENABLED=true
# ... other production configs
```

### Run with PM2

```bash
pm2 start pm2.config.json
```

### Docker

```bash
# Build image
docker build -t your-app .

# Run
docker run -p 3000:3000 your-app
```

## 📖 Customization

### Based on Your Product Requirements

After completing `docs/website-guidelines/product-brief.md`:

1. **Define your data models** in `src/api/`
2. **Create API endpoints** for your features
3. **Set up authentication flows** based on your needs
4. **Configure email templates** for your brand
5. **Add background jobs** for async tasks
6. **Customize monitoring** dashboards

### Remove Unused Features

If you don't need certain features:

```bash
# Remove GraphQL
pnpm remove @nestjs/graphql @nestjs/apollo

# Remove WebSockets
pnpm remove @nestjs/websockets socket.io

# Remove file upload
pnpm remove @aws-sdk/client-s3
```

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U postgres -d your_db_name
```

### Redis Connection Failed

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

### Migration Failed

```bash
# Show migration status
pnpm migration:show

# Revert last migration
pnpm migration:down

# Try again
pnpm migration:up
```

## 📚 Learn More

- **Full Documentation**: See `backend/README.md`
- **NestJS Docs**: https://docs.nestjs.com
- **Better Auth**: https://www.better-auth.com
- **TypeORM**: https://typeorm.io

---

## ✅ Checklist

Before building frontend:

- [ ] Backend dependencies installed
- [ ] `.env` file configured
- [ ] PostgreSQL running
- [ ] Redis running
- [ ] Migrations executed
- [ ] Backend starts successfully
- [ ] Can access Swagger docs
- [ ] Health check passes

Now you're ready to build the frontend and connect it to this backend!

