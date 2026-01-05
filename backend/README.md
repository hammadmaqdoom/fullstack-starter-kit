# Backend - NestJS Boilerplate

Production-ready NestJS backend with TypeORM, GraphQL, REST API, authentication, and monitoring.

## 🚀 Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Better Auth (JWT, OAuth, Passkeys, 2FA)
- **API**: REST (Fastify) + GraphQL (Apollo)
- **Caching**: Redis with cache-manager
- **Queue**: BullMQ with Redis
- **Email**: Nodemailer + React Email templates
- **Monitoring**: Prometheus + Grafana
- **Error Tracking**: Sentry
- **Testing**: Jest
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker + Docker Compose

## 📁 Project Structure

```
backend/
├── src/
│   ├── api/                    # API modules
│   │   ├── file/              # File upload/management
│   │   ├── health/            # Health checks
│   │   └── user/              # User management
│   │
│   ├── auth/                   # Authentication & authorization
│   │   ├── better-auth.service.ts
│   │   ├── auth.guard.ts
│   │   └── entities/          # Auth entities (User, Session, etc.)
│   │
│   ├── common/                 # Shared DTOs and types
│   │   ├── dto/               # Common DTOs (pagination, errors)
│   │   └── types/             # TypeScript types
│   │
│   ├── config/                 # Configuration modules
│   │   ├── app/               # App config
│   │   ├── auth/              # Auth config
│   │   ├── database/          # Database config
│   │   ├── mail/              # Email config
│   │   ├── redis/             # Redis config
│   │   └── ...
│   │
│   ├── database/               # Database setup
│   │   ├── migrations/        # TypeORM migrations
│   │   ├── seeds/             # Database seeds
│   │   └── models/            # Base models
│   │
│   ├── decorators/             # Custom decorators
│   │   ├── auth/              # Auth decorators
│   │   └── validators/        # Custom validators
│   │
│   ├── shared/                 # Shared modules
│   │   ├── cache/             # Cache module
│   │   ├── mail/              # Email module with templates
│   │   └── socket/            # WebSocket module
│   │
│   ├── services/               # External services
│   │   ├── aws/               # AWS S3 integration
│   │   └── gcp/               # Google Cloud integration
│   │
│   ├── worker/                 # Background jobs
│   │   └── queues/            # Job queues
│   │
│   ├── tools/                  # Dev tools
│   │   ├── grafana/           # Grafana dashboards
│   │   ├── logger/            # Logger setup
│   │   └── swagger/           # Swagger setup
│   │
│   ├── app.module.ts           # Root module
│   └── main.ts                 # Application entry
│
├── test/                       # E2E tests
├── scripts/                    # Utility scripts
├── docker-compose.yml          # Docker services
├── Dockerfile                  # Production Docker image
└── package.json
```

## 🔧 Setup & Installation

### Prerequisites

- Node.js 18+ (or 20+)
- pnpm 9.x
- PostgreSQL 14+
- Redis 7+
- Docker & Docker Compose (optional)

### Environment Variables

Create `.env` file in the backend directory:

```bash
# App
NODE_ENV=development
APP_PORT=3000
APP_WORKER_PORT=8001
API_PREFIX=api
APP_URL=http://localhost:8000
IS_WORKER=false  # Set to true for worker instance

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=your_db_name
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=100
DATABASE_SSL_ENABLED=false

# Redis (Required for both API and Worker)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Auth (Better Auth)
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:8000

# AWS (if using S3)
AWS_S3_ACCESS_KEY_ID=
AWS_S3_SECRET_ACCESS_KEY=
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET=

# Mail (Required for worker to send emails)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@yourapp.com

# Sentry (optional)
SENTRY_DSN=

# Grafana (optional)
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin
```

**Worker-Specific Configuration:**

When running the worker instance, the `IS_WORKER` environment variable is automatically set by the npm script. The worker:
- Uses `APP_WORKER_PORT` instead of `APP_PORT`
- Loads only `WorkerModule` (background jobs)
- Does NOT load API routes, GraphQL, or WebSocket adapters
- Shares the same database and Redis with the main API server

### Installation

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm migration:up

# Seed database (optional)
pnpm seed:run
```

## 🚀 Running the Application

### Development Mode

#### Main API Server

```bash
# Start with hot reload
pnpm start:dev

# Start with debug mode
pnpm start:debug
```

#### Worker Instance (Background Jobs)

The worker instance processes background jobs (emails, data processing, etc.) separately from the main API server:

```bash
# Start worker with hot reload
pnpm start:worker:dev

# Start worker in production mode
pnpm start:worker
```

**Why separate worker?**
- ✅ Better resource isolation
- ✅ Independent scaling (scale API and workers separately)
- ✅ Improved reliability (API stays responsive during heavy job processing)
- ✅ Easier monitoring and debugging

**Running both simultaneously:**

```bash
# Terminal 1: Main API Server
pnpm start:dev

# Terminal 2: Worker Instance
pnpm start:worker:dev
```

### Production Mode

```bash
# Build
pnpm build

# Start production API server
pnpm start:prod

# Start production worker (in separate process/container)
pnpm start:worker
```

### Docker

```bash
# Development
pnpm docker:dev:up

# Production
pnpm docker:prod:up

# Stop containers
pnpm docker:dev:down
```

## 📊 Available Services

Once running, access:

- **API**: http://localhost:8000/api
- **Swagger Docs**: http://localhost:8000/api/docs
- **GraphQL Playground**: http://localhost:8000/graphql
- **Health Check**: http://localhost:8000/api/health
- **Bull Board** (Queue monitoring): http://localhost:8000/queues
- **Prometheus Metrics**: http://localhost:8000/metrics
- **Grafana**: http://localhost:3001 (if using Docker)

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

## 🗄️ Database

### Migrations

```bash
# Generate migration from entities
pnpm migration:generate src/database/migrations/MigrationName

# Create empty migration
pnpm migration:create src/database/migrations/MigrationName

# Run migrations
pnpm migration:up

# Revert last migration
pnpm migration:down

# Show migration status
pnpm migration:show
```

### Seeds

```bash
# Run all seeds
pnpm seed:run

# Create new seed
pnpm seed:create src/database/seeds/SeedName
```

### Generate ERD

```bash
# Generate Entity Relationship Diagram
pnpm erd:generate
```

## 🔐 Authentication

This boilerplate uses **Better Auth** which provides:

- ✅ Email/Password authentication
- ✅ OAuth providers (Google, GitHub, etc.)
- ✅ Magic links
- ✅ Passkeys (WebAuthn)
- ✅ Two-factor authentication (2FA)
- ✅ Session management
- ✅ Email verification

### Protected Routes

Use decorators to protect routes:

```typescript
import { Auth } from '@/decorators/auth/auth.decorator';

@Auth() // Requires authentication
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

## 📧 Email Templates

Email templates use **React Email** for beautiful, responsive emails.

### Create New Template

1. Create template in `src/shared/mail/templates/`
2. Build templates: `pnpm email:build`
3. Preview: `pnpm email:dev`

## 📈 Monitoring

### Prometheus Metrics

Automatically collects:
- HTTP request metrics
- Database query metrics
- Cache hit/miss rates
- Queue job metrics

### Grafana Dashboards

Pre-configured dashboards in `src/tools/grafana/dashboards/`:
- API monitoring
- Database monitoring
- Server monitoring

## 🔄 Background Jobs & Worker Architecture

Uses **BullMQ** for queue management with a dedicated worker instance.

### Architecture

```
┌─────────────────┐         ┌──────────┐         ┌─────────────────┐
│   Main API      │────────▶│  Redis   │◀────────│  Worker         │
│   (Port 8000)   │         │  Queue   │         │  (Port 8001)    │
│                 │         └──────────┘         │                 │
│ - REST API      │                              │ - Email Jobs    │
│ - GraphQL       │                              │ - Data Jobs     │
│ - WebSockets    │                              │ - Scheduled     │
│ - Adds Jobs     │                              │ - Processes     │
└─────────────────┘                              └─────────────────┘
```

### How It Works

1. **Main API Server** (`pnpm start:dev`):
   - Handles HTTP requests
   - Adds jobs to Redis queue
   - Does NOT process jobs

2. **Worker Instance** (`pnpm start:worker:dev`):
   - Processes jobs from Redis queue
   - Sends emails
   - Performs heavy computations
   - Does NOT handle HTTP requests

### Create New Job

```typescript
// 1. Define job processor (src/worker/queues/my-queue/)
@Processor('my-queue')
export class MyProcessor {
  @Process('my-job')
  async handleJob(job: Job<{ data: string }>) {
    console.log('Processing job:', job.data);
    // Process job logic here
  }
}

// 2. Add job to queue (from API controller/service)
@Injectable()
export class MyService {
  constructor(
    @InjectQueue('my-queue')
    private readonly myQueue: Queue,
  ) {}

  async triggerJob() {
    await this.myQueue.add('my-job', { data: 'value' });
  }
}
```

### Running Workers

**Development:**
```bash
# Terminal 1: API Server
pnpm start:dev

# Terminal 2: Worker
pnpm start:worker:dev
```

**Production:**
```bash
# Using PM2 (recommended)
pm2 start pm2.config.json

# Or manually
pnpm build
pnpm start:prod  # API Server
pnpm start:worker  # Worker (separate process)
```

**Docker:**
```yaml
# docker-compose.yml includes both services
services:
  api:
    command: pnpm start:prod
  worker:
    command: pnpm start:worker
```

### Monitoring Jobs

Access Bull Board at: http://localhost:8000/api/queues

Features:
- View active, waiting, completed, and failed jobs
- Retry failed jobs
- View job details and logs
- Monitor queue metrics

## 🌐 WebSockets

Real-time communication with Socket.IO + Redis adapter for horizontal scaling.

```typescript
@WebSocketGateway()
export class MyGateway {
  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any) {
    // Handle message
  }
}
```

## 📝 API Documentation

### Swagger

Automatically generated from decorators:

```typescript
@ApiTags('users')
@Controller('users')
export class UserController {
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}
```

### GraphQL

Schema auto-generated from resolvers and types.

## 🔧 Utilities

### Code Quality

```bash
# Lint
pnpm lint

# Format
pnpm format

# Dependency graph
pnpm graph:app

# Find circular dependencies
pnpm graph:circular
```

## 🚢 Deployment

### PM2 (Production)

The `pm2.config.json` is configured to run both API and Worker instances:

```bash
# Start both API and Worker
pm2 start pm2.config.json

# Monitor both processes
pm2 monit

# View logs
pm2 logs

# Restart specific instance
pm2 restart api
pm2 restart worker

# Scale workers (if needed)
pm2 scale worker 3  # Run 3 worker instances
```

**PM2 Configuration** (`pm2.config.json`):
```json
{
  "apps": [
    {
      "name": "api",
      "script": "dist/main.js",
      "instances": 1,
      "env": {
        "NODE_ENV": "production",
        "IS_WORKER": "false"
      }
    },
    {
      "name": "worker",
      "script": "dist/main.js",
      "instances": 2,
      "env": {
        "NODE_ENV": "production",
        "IS_WORKER": "true"
      }
    }
  ]
}
```

### Docker

#### Single Container (Development)

```bash
# Build production image
docker build -t your-app .

# Run API
docker run -p 3000:3000 your-app

# Run Worker (separate container)
docker run -e IS_WORKER=true -p 3001:3001 your-app
```

#### Docker Compose (Recommended)

```bash
# Start all services (API + Worker + PostgreSQL + Redis)
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f api
docker-compose logs -f worker

# Scale workers
docker-compose up -d --scale worker=3
```

**Docker Compose Configuration** (`docker-compose.prod.yml`):
```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - IS_WORKER=false
    depends_on:
      - postgres
      - redis

  worker:
    build: .
    environment:
      - IS_WORKER=true
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 2  # Run 2 worker instances
```

### Kubernetes

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: your-app:latest
        env:
        - name: IS_WORKER
          value: "false"
        ports:
        - containerPort: 3000

---
# worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  replicas: 5  # Scale workers independently
  template:
    spec:
      containers:
      - name: worker
        image: your-app:latest
        env:
        - name: IS_WORKER
          value: "true"
```

## 📚 Key Features

### ✅ Production Ready
- Graceful shutdown
- Health checks
- Error handling with Sentry
- Request validation
- Rate limiting
- CORS configuration
- Helmet security headers
- Compression

### ✅ Developer Experience
- Hot reload
- TypeScript
- ESLint + Prettier
- Husky git hooks
- Commitlint
- Automated testing
- API documentation

### ✅ Scalability
- Redis caching
- Queue system
- WebSocket clustering
- Database connection pooling
- Horizontal scaling ready

### ✅ Observability
- Structured logging (Pino)
- Prometheus metrics
- Grafana dashboards
- Sentry error tracking
- Request tracing

## 🔗 Integration with Frontend

This backend is designed to work with the frontend in `../frontend/`:

1. **REST API**: Frontend calls `/api` endpoints
2. **GraphQL**: Frontend uses Apollo Client
3. **WebSockets**: Real-time features
4. **Authentication**: Better Auth client integration

See frontend documentation for integration details.

## 📖 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Better Auth Documentation](https://www.better-auth.com)
- [TypeORM Documentation](https://typeorm.io)
- [BullMQ Documentation](https://docs.bullmq.io)
- [React Email Documentation](https://react.email)

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U postgres -d your_db_name
```

### Redis Connection Issues
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

### Migration Issues
```bash
# Drop database and recreate (CAUTION: Development only!)
pnpm typeorm schema:drop
pnpm migration:up
```

---

**Note**: This backend boilerplate is production-ready and includes all necessary features for building scalable applications. Customize based on your product requirements defined in `../docs/`.
