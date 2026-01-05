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
PORT=3000
API_PREFIX=api

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=your_db_name
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=100
DATABASE_SSL_ENABLED=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Auth (Better Auth)
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# AWS (if using S3)
AWS_S3_ACCESS_KEY_ID=
AWS_S3_SECRET_ACCESS_KEY=
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET=

# Mail
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

```bash
# Start with hot reload
pnpm start:dev

# Start with debug mode
pnpm start:debug
```

### Production Mode

```bash
# Build
pnpm build

# Start production server
pnpm start:prod
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

- **API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs
- **GraphQL Playground**: http://localhost:3000/graphql
- **Health Check**: http://localhost:3000/api/health
- **Bull Board** (Queue monitoring): http://localhost:3000/queues
- **Prometheus Metrics**: http://localhost:3000/metrics
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

## 🔄 Background Jobs

Uses **BullMQ** for queue management.

### Create New Job

```typescript
// Define job
@Processor('my-queue')
export class MyProcessor {
  @Process('my-job')
  async handleJob(job: Job) {
    // Process job
  }
}

// Add job to queue
await this.myQueue.add('my-job', { data: 'value' });
```

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

```bash
# Start with PM2
pm2 start pm2.config.json

# Monitor
pm2 monit

# Logs
pm2 logs
```

### Docker

```bash
# Build production image
docker build -t your-app .

# Run
docker run -p 3000:3000 your-app
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
