# System Architecture

> **INSTRUCTIONS**: This document defines the technical architecture of your system. Include architecture diagrams, technology stack, design patterns, deployment strategy, and scalability plans.

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Users / Clients                         │
│              (Web Browsers, Mobile Apps, APIs)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                         CDN / Load Balancer                  │
│                    (CloudFlare, AWS CloudFront)              │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│   Frontend       │    │   Backend API    │
│   (Next.js)      │    │   (NestJS)       │
│   Port: 3001     │    │   Port: 3000     │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         │                       ├──────────┐
         │                       ▼          ▼
         │              ┌─────────────┐  ┌─────────────┐
         │              │ PostgreSQL  │  │   Redis     │
         │              │ (Database)  │  │  (Cache)    │
         │              └─────────────┘  └─────────────┘
         │                       │
         │                       ├──────────┐
         │                       ▼          ▼
         │              ┌─────────────┐  ┌─────────────┐
         │              │   AWS S3    │  │   BullMQ    │
         │              │  (Storage)  │  │  (Queue)    │
         │              └─────────────┘  └─────────────┘
         │                       │
         └───────────────────────┴──────────────────────┐
                                 ▼                       ▼
                        ┌─────────────────┐    ┌─────────────────┐
                        │  Email Service  │    │   Monitoring    │
                        │   (SendGrid)    │    │ (Prometheus)    │
                        └─────────────────┘    └─────────────────┘
```

### 1.2 Architecture Style

Select your architecture style:
- [x] **Monolithic** (Single application)
- [ ] **Microservices** (Multiple services)
- [ ] **Serverless** (Functions as a service)
- [ ] **Hybrid** (Combination)

**Chosen**: Monolithic

**Justification**: 
- Simpler to develop and deploy initially
- Easier to maintain with small team
- Can migrate to microservices later if needed
- Sufficient for expected scale (< 100K users)

### 1.3 CMS Architecture

The system includes a comprehensive Content Management System (CMS) with the following architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    CMS Architecture                           │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Admin UI   │────────▶│   Backend    │────────▶│  PostgreSQL  │
│  (Next.js)   │         │   (NestJS)   │         │   (CMS DB)   │
└──────────────┘         └──────────────┘         └──────────────┘
      │                        │
      │                        ├──────────┐
      │                        ▼          ▼
      │                 ┌──────────┐  ┌──────────┐
      │                 │  Redis   │  │   S3     │
      │                 │ (Cache)  │  │ (Media)  │
      │                 └──────────┘  └──────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│              Build Time (SSG/ISR)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Metadata │  │ Analytics│  │   SEO    │  │  JSON-LD │   │
│  │ Generator│  │  Config  │  │ Metadata │  │ Generator│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       │             │             │             │            │
│       └─────────────┴─────────────┴─────────────┘            │
│                        │                                      │
│                        ▼                                      │
│              ┌──────────────────┐                            │
│              │  HTML Generation │                            │
│              │  (with injected  │                            │
│              │   metadata)      │                            │
│              └──────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│              Public Pages (Next.js)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Blog   │  │   Docs   │  │ Marketing│  │  Pages   │   │
│  │  Pages   │  │  Pages   │  │  Pages   │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       │             │             │             │            │
│       └─────────────┴─────────────┴─────────────┘            │
│                        │                                      │
│                        ▼                                      │
│              ┌──────────────────┐                            │
│              │  SEO Optimized   │                            │
│              │  HTML Output    │                            │
│              │  (Meta tags,     │                            │
│              │   JSON-LD,       │                            │
│              │   Analytics)     │                            │
│              └──────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

**Key Features**:
- **Database-First Configuration**: All analytics IDs, verification codes, and feature flags stored in database
- **Server-Side Metadata Injection**: Metadata fetched at build time and injected into HTML
- **Dynamic Content Generation**: SSG/ISR for optimal performance
- **Comprehensive SEO**: Meta tags, JSON-LD, sitemaps, robots.txt
- **Multi-Platform Analytics**: GTM, GA4, Facebook, Pinterest, Yandex

---

## 2. Technology Stack

### 2.1 Frontend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | Next.js | 16.x | React framework with SSR/SSG |
| Language | TypeScript | 5.x | Type-safe JavaScript |
| Styling | Tailwind CSS | 4.x | Utility-first CSS framework |
| State Management | React Context | - | Global state (auth, theme) |
| Forms | React Hook Form | 7.x | Form validation |
| Validation | Zod | 3.x | Schema validation |
| HTTP Client | Fetch API | - | API requests |
| i18n | next-intl | 3.x | Internationalization |
| Testing | Vitest + Playwright | - | Unit + E2E testing |

**Why Next.js?**
- SEO-friendly (SSR/SSG)
- Fast page loads
- Built-in routing
- API routes for BFF pattern
- Great developer experience

### 2.2 Backend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | NestJS | 10.x | Node.js framework |
| Language | TypeScript | 5.x | Type-safe JavaScript |
| Runtime | Node.js | 20.x | JavaScript runtime |
| HTTP Server | Fastify | 4.x | Fast web server |
| ORM | TypeORM | 0.3.x | Database ORM |
| Validation | class-validator | 0.14.x | DTO validation |
| Authentication | Better Auth | 1.x | Auth library |
| API Docs | Swagger | 7.x | OpenAPI documentation |
| Testing | Jest | 29.x | Unit + integration testing |

**Why NestJS?**
- Modular architecture
- Built-in dependency injection
- TypeScript-first
- Extensive ecosystem
- Great for scalable applications

### 2.3 Database & Storage

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Primary DB | PostgreSQL | 14.x | Relational database |
| Cache | Redis | 7.x | Session storage, caching |
| File Storage | AWS S3 | - | File uploads |
| Queue | BullMQ | 5.x | Background jobs |

**Why PostgreSQL?**
- ACID compliance
- Complex queries and joins
- JSON support when needed
- Mature and reliable
- Great performance

### 2.4 Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Hosting | AWS EC2 / Vercel | Application hosting |
| Database Hosting | AWS RDS | Managed PostgreSQL |
| Cache Hosting | AWS ElastiCache | Managed Redis |
| CDN | CloudFlare | Content delivery |
| DNS | CloudFlare | Domain management |
| SSL/TLS | Let's Encrypt | HTTPS certificates |
| Monitoring | Prometheus + Grafana | Metrics & dashboards |
| Logging | Winston + CloudWatch | Application logs |
| Error Tracking | Sentry | Error monitoring |

### 2.5 DevOps & CI/CD

| Component | Technology | Purpose |
|-----------|------------|---------|
| Version Control | Git + GitHub | Source code management |
| CI/CD | GitHub Actions | Automated testing & deployment |
| Containerization | Docker | Application containers |
| Orchestration | Docker Compose | Local development |
| Package Manager | pnpm (backend), npm (frontend) | Dependency management |
| Code Quality | ESLint + Prettier | Code formatting & linting |

---

## 3. Design Patterns & Principles

### 3.1 Backend Architecture Patterns

**Layered Architecture**:
```
┌─────────────────────────────────────┐
│         Controllers Layer            │  ← HTTP requests/responses
├─────────────────────────────────────┤
│          Services Layer              │  ← Business logic
├─────────────────────────────────────┤
│        Repositories Layer            │  ← Data access
├─────────────────────────────────────┤
│          Entities Layer              │  ← Database models
└─────────────────────────────────────┘
```

**Patterns Used**:
- **Dependency Injection**: For loose coupling
- **Repository Pattern**: Abstract data access
- **Service Layer**: Encapsulate business logic
- **DTO Pattern**: Data transfer objects for validation
- **Factory Pattern**: Create complex objects
- **Observer Pattern**: Event-driven architecture

### 3.2 Frontend Architecture Patterns

**Component Structure**:
```
src/
├── app/                    # Next.js app router
│   └── [locale]/          # Internationalized routes
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── features/         # Feature-specific components
│   └── layouts/          # Layout components
├── libs/                 # Core libraries
├── utils/                # Utility functions
└── types/                # TypeScript types
```

**Patterns Used**:
- **Component Composition**: Build complex UIs from simple components
- **Container/Presentational**: Separate logic from presentation
- **Custom Hooks**: Reusable stateful logic
- **Context API**: Global state management
- **Server Components**: Leverage Next.js server components

---

## 4. Data Flow

### 4.1 Request Flow (Read)

```
1. User opens page in browser
   ↓
2. Next.js renders page (SSR/SSG)
   ↓
3. Frontend makes API request
   GET /api/v1/posts
   Authorization: Bearer {token}
   ↓
4. Backend receives request
   ↓
5. Auth Guard validates token
   ↓
6. Controller calls Service
   ↓
7. Service checks Redis cache
   ├─ Cache HIT → Return cached data
   └─ Cache MISS ↓
8. Repository queries PostgreSQL
   ↓
9. Data returned up the chain
   ↓
10. Response cached in Redis
   ↓
11. JSON response sent to frontend
   ↓
12. Frontend updates UI
```

### 4.2 CMS Metadata Flow (Build Time)

```
1. Next.js build starts (SSG/ISR)
   ↓
2. For each page, generateMetadata() is called
   ↓
3. Frontend fetches from backend API:
   - GET /api/v1/seo/metadata/:contentId
   - GET /api/v1/analytics/configs?active=true
   - GET /api/v1/seo/verification
   - GET /api/v1/structured-data/generate/:contentId
   ↓
4. Backend queries PostgreSQL for:
   - SEO metadata
   - Analytics configs
   - Verification codes
   - JSON-LD schemas
   ↓
5. Data cached in Redis (5 min TTL)
   ↓
6. Frontend generates Next.js Metadata object
   ↓
7. Metadata injected into HTML <head>
   ↓
8. Analytics scripts injected (GTM, GA4, etc.)
   ↓
9. JSON-LD scripts injected
   ↓
10. Verification meta tags added
   ↓
11. Static HTML generated with all metadata
```

### 4.3 Request Flow (Write)

```
1. User submits form
   ↓
2. Frontend validates with Zod
   ↓
3. Frontend makes API request
   POST /api/v1/posts
   Authorization: Bearer {token}
   Body: { title, content }
   ↓
4. Backend receives request
   ↓
5. Auth Guard validates token
   ↓
6. DTO validates request body
   ↓
7. Controller calls Service
   ↓
8. Service performs business logic
   ↓
9. Repository saves to PostgreSQL
   ↓
10. Cache invalidated in Redis
   ↓
11. Background job queued (if needed)
   ↓
12. Success response sent
   ↓
13. Frontend updates UI optimistically
```

### 4.3 Background Job Flow

```
1. Job queued in BullMQ (Redis)
   ↓
2. Worker picks up job
   ↓
3. Worker processes job
   (e.g., send email, process image)
   ↓
4. Job completed or retried on failure
   ↓
5. Result logged
```

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
1. User enters email/password
   ↓
2. Frontend sends to /api/auth/login
   ↓
3. Backend validates credentials
   ↓
4. Backend generates JWT tokens
   - Access Token (15 min)
   - Refresh Token (7 days)
   ↓
5. Tokens sent to frontend
   ↓
6. Frontend stores tokens
   - Access token in memory
   - Refresh token in httpOnly cookie
   ↓
7. Frontend includes access token in requests
   Authorization: Bearer {token}
   ↓
8. Backend validates token on each request
```

### 5.2 Authorization Model

**Role-Based Access Control (RBAC)**:

| Role | Permissions |
|------|-------------|
| Admin | Full access to all resources |
| Moderator | Can moderate content, view reports |
| User | Can create/edit own content |
| Guest | Read-only access to public content |

**Permission Checks**:
```typescript
// In controller
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'moderator')
@Delete('posts/:id')
async deletePost(@Param('id') id: string) {
  // Only admins and moderators can access
}
```

### 5.3 Security Measures

| Layer | Security Measure |
|-------|------------------|
| Network | HTTPS/TLS 1.3, Firewall rules |
| Application | Input validation, SQL injection prevention, XSS protection |
| Authentication | Bcrypt password hashing, JWT tokens, Rate limiting |
| Authorization | RBAC, Resource ownership checks |
| Data | Encryption at rest (AES-256), Encryption in transit (TLS) |
| API | Rate limiting, CORS, API key validation |
| Infrastructure | Security groups, VPC, WAF |

---

## 6. Scalability Strategy

### 6.1 Horizontal Scaling

**Frontend**:
- Deploy multiple Next.js instances
- Use load balancer (AWS ALB, CloudFlare)
- Serve static assets from CDN

**Backend**:
- Deploy multiple NestJS instances
- Stateless design (no in-memory sessions)
- Use Redis for shared state

**Database**:
- Read replicas for read-heavy workloads
- Connection pooling
- Query optimization

### 6.2 Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Add indexes
- Use caching aggressively

### 6.3 Caching Strategy

| Layer | Cache Type | TTL | Purpose |
|-------|------------|-----|---------|
| CDN | Static assets | 1 year | Images, CSS, JS |
| Application | Redis | 5-60 min | API responses, sessions |
| Database | Query cache | 1-5 min | Frequently accessed data |
| Client | Browser cache | Varies | Reduce network requests |

### 6.4 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 200ms | TBD |
| Page Load Time (p95) | < 2s | TBD |
| Database Query Time (p95) | < 50ms | TBD |
| Concurrent Users | 10,000 | TBD |
| Requests/Second | 1,000 | TBD |

---

## 7. Deployment Architecture

### 7.1 Development Environment

```
Developer Machine
├── Docker Compose
│   ├── PostgreSQL container
│   ├── Redis container
│   └── MailDev container
├── Backend (localhost:3000)
└── Frontend (localhost:3001)
```

### 7.2 Production Environment

```
┌─────────────────────────────────────────────────────────┐
│                      CloudFlare CDN                      │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│   Vercel         │    │   AWS            │
│   (Frontend)     │    │   (Backend)      │
│                  │    │                  │
│   - Next.js      │    │   - EC2 + ALB    │
│   - Auto-scale   │    │   - Auto-scaling │
│   - Edge network │    │   - Multi-AZ     │
└──────────────────┘    └────────┬─────────┘
                                 │
                     ┌───────────┼───────────┐
                     ▼           ▼           ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │ AWS RDS  │  │ElastiCache│  │  AWS S3  │
            │(Postgres)│  │  (Redis)  │  │ (Files)  │
            │Multi-AZ  │  │Multi-AZ   │  │          │
            └──────────┘  └──────────┘  └──────────┘
```

### 7.3 Deployment Process

**CI/CD Pipeline** (GitHub Actions):

```yaml
1. Push to main branch
   ↓
2. Run tests (unit + integration)
   ↓
3. Build Docker image
   ↓
4. Push to container registry
   ↓
5. Deploy to staging
   ↓
6. Run E2E tests
   ↓
7. Manual approval
   ↓
8. Deploy to production
   ↓
9. Health check
   ↓
10. Rollback if failed
```

### 7.4 Environment Configuration

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local development | localhost:3000/3001 |
| Staging | Pre-production testing | staging.yourapp.com |
| Production | Live application | yourapp.com |

---

## 8. Monitoring & Observability

### 8.1 Metrics

**Application Metrics** (Prometheus):
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (errors/second)
- Active users
- Database query time
- Cache hit rate

**Infrastructure Metrics**:
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

### 8.2 Logging

**Log Levels**:
- ERROR: Critical errors requiring immediate attention
- WARN: Warning conditions
- INFO: Informational messages
- DEBUG: Debug information (development only)

**Log Format** (JSON):
```json
{
  "timestamp": "2026-01-05T10:30:00Z",
  "level": "ERROR",
  "message": "Database connection failed",
  "userId": "uuid-here",
  "requestId": "req_abc123",
  "stack": "..."
}
```

### 8.3 Alerting

**Alert Conditions**:
- Error rate > 1% for 5 minutes
- Response time p95 > 1 second for 5 minutes
- CPU usage > 80% for 10 minutes
- Database connections > 90% of pool
- Disk usage > 85%

**Alert Channels**:
- Email
- Slack
- PagerDuty (critical alerts)

---

## 9. Disaster Recovery

### 9.1 Backup Strategy

**Database Backups**:
- Automated daily backups (AWS RDS)
- Retention: 30 days
- Point-in-time recovery available
- Backups stored in separate region

**File Backups**:
- S3 versioning enabled
- Cross-region replication
- Lifecycle policies for old files

### 9.2 Recovery Procedures

**Database Failure**:
1. Automatic failover to standby (Multi-AZ)
2. RTO: < 5 minutes
3. RPO: < 1 minute

**Application Failure**:
1. Auto-scaling replaces failed instances
2. Load balancer routes to healthy instances
3. RTO: < 2 minutes

**Region Failure**:
1. Manual failover to backup region
2. RTO: < 30 minutes
3. RPO: < 5 minutes

---

## 10. Cost Estimation

### 10.1 Monthly Infrastructure Costs

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Frontend (Vercel) | Pro | $20 |
| Backend (AWS EC2) | t3.medium x2 | $60 |
| Database (AWS RDS) | db.t3.medium | $70 |
| Redis (ElastiCache) | cache.t3.micro | $15 |
| S3 Storage | 100GB | $3 |
| CloudFlare | Pro | $20 |
| Monitoring | Basic | $10 |
| **Total** | | **~$200/month** |

**Scaling Costs**:
- 10K users: ~$200/month
- 100K users: ~$500/month
- 1M users: ~$2,000/month

---

## ✅ Completion Checklist

Before moving to the next document:

- [ ] Architecture diagrams are clear and complete
- [ ] Technology stack is documented with justifications
- [ ] Design patterns are identified
- [ ] Data flow is documented
- [ ] Security architecture is defined
- [ ] Scalability strategy is planned
- [ ] Deployment architecture is documented
- [ ] Monitoring and alerting are planned
- [ ] Disaster recovery procedures are defined
- [ ] Cost estimation is provided

---

**Next Steps**:

1. **Continue to**: `user-stories.md`
2. **Review**: All project requirements documents
3. **Generate**: Use AI to create technical documentation from these specs

