# Worker Architecture Guide

Complete guide for understanding and using the worker instance in this NestJS application.

## 🎯 Overview

This application uses a **dual-instance architecture**:

1. **Main API Server** - Handles HTTP requests, GraphQL, WebSockets
2. **Worker Instance** - Processes background jobs from Redis queue

Both instances share the same codebase but load different modules based on the `IS_WORKER` environment variable.

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Application                          │
│                                                             │
│  ┌─────────────────────┐         ┌─────────────────────┐  │
│  │   Main API Server   │         │  Worker Instance    │  │
│  │   (Port 3000)       │         │  (Port 3001)        │  │
│  │                     │         │                     │  │
│  │ ✅ REST API         │         │ ❌ REST API         │  │
│  │ ✅ GraphQL          │         │ ❌ GraphQL          │  │
│  │ ✅ WebSockets       │         │ ❌ WebSockets       │  │
│  │ ✅ Auth Routes      │         │ ❌ Auth Routes      │  │
│  │ ✅ Swagger Docs     │         │ ❌ Swagger Docs     │  │
│  │                     │         │                     │  │
│  │ ✅ Add Jobs         │         │ ✅ Process Jobs     │  │
│  │ ❌ Process Jobs     │         │ ✅ Send Emails      │  │
│  │                     │         │ ✅ Heavy Tasks      │  │
│  └──────────┬──────────┘         └──────────┬──────────┘  │
│             │                               │             │
└─────────────┼───────────────────────────────┼─────────────┘
              │                               │
              │      ┌───────────────┐        │
              └─────▶│  PostgreSQL   │◀───────┘
              │      └───────────────┘        │
              │                               │
              │      ┌───────────────┐        │
              └─────▶│     Redis     │◀───────┘
                     │  (Queue+Cache)│
                     └───────────────┘
```

## 🚀 Quick Start

### Running Locally

```bash
# Terminal 1: Main API Server
cd backend
pnpm start:dev

# Terminal 2: Worker Instance
cd backend
pnpm start:worker:dev
```

### Verify Both Are Running

```bash
# Check API Server
curl http://localhost:3000/api/health

# Check Worker
curl http://localhost:3001/api/health

# Monitor Jobs
open http://localhost:3000/api/queues
```

## 📋 How It Works

### 1. Main API Server Adds Jobs

```typescript
// src/api/user/user.service.ts
@Injectable()
export class UserService {
  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {}

  async createUser(dto: CreateUserDto) {
    const user = await this.userRepository.save(dto);
    
    // Add job to Redis queue
    await this.emailQueue.add('send-welcome-email', {
      userId: user.id,
      email: user.email,
    });
    
    return user;
  }
}
```

### 2. Worker Instance Processes Jobs

```typescript
// src/worker/queues/email/email.processor.ts
@Processor('email')
export class EmailProcessor {
  constructor(private readonly mailService: MailService) {}

  @Process('send-welcome-email')
  async handleWelcomeEmail(job: Job<{ userId: string; email: string }>) {
    console.log(`Processing welcome email for user ${job.data.userId}`);
    
    await this.mailService.sendWelcomeEmail(
      job.data.email,
      job.data.userId,
    );
    
    console.log(`Welcome email sent to ${job.data.email}`);
  }
}
```

## 🔧 Configuration

### Environment Variables

Both instances use the same `.env` file:

```bash
# App Configuration
NODE_ENV=development
APP_PORT=3000              # Main API port
APP_WORKER_PORT=3001       # Worker port
IS_WORKER=false            # Automatically set by npm scripts

# Database (shared)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=your_db_name

# Redis (shared - required!)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (required for worker)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@yourapp.com
```

### Module Loading Logic

The application loads different modules based on `IS_WORKER`:

```typescript
// src/main.ts
const appConfig = getAppConfig();
const isWorker = appConfig.isWorker;

const app = await NestFactory.create<NestFastifyApplication>(
  isWorker ? AppModule.worker() : AppModule.main(),
  // ...
);
```

```typescript
// src/app.module.ts
export class AppModule {
  static main(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        // Common modules (database, redis, cache, mail)
        ...AppModule.common().imports,
        // API-specific modules
        ApiModule,
        AuthModule,
        GraphQLModule,
        SocketModule,
        // ...
      ],
    };
  }

  static worker(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        // Only common modules + WorkerModule
        ...AppModule.common().imports,
        WorkerModule,
      ],
    };
  }
}
```

## 📦 Creating New Jobs

### Step 1: Create Queue Module

```bash
# Create new queue directory
mkdir -p src/worker/queues/my-queue
```

### Step 2: Create Processor

```typescript
// src/worker/queues/my-queue/my-queue.processor.ts
import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';

@Processor('my-queue')
export class MyQueueProcessor {
  @Process('my-job')
  async handleMyJob(job: Job<{ data: string }>) {
    console.log('Processing job:', job.id);
    console.log('Job data:', job.data);
    
    // Your processing logic here
    await this.doHeavyWork(job.data);
    
    console.log('Job completed:', job.id);
  }

  private async doHeavyWork(data: any) {
    // Heavy computation, API calls, etc.
  }
}
```

### Step 3: Create Queue Module

```typescript
// src/worker/queues/my-queue/my-queue.module.ts
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MyQueueProcessor } from './my-queue.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'my-queue',
    }),
  ],
  providers: [MyQueueProcessor],
  exports: [BullModule],
})
export class MyQueueModule {}
```

### Step 4: Register in WorkerModule

```typescript
// src/worker/worker.module.ts
import { Module } from '@nestjs/common';
import { EmailQueueModule } from './queues/email/email.module';
import { MyQueueModule } from './queues/my-queue/my-queue.module';

@Module({
  imports: [
    EmailQueueModule,
    MyQueueModule,  // Add your new queue
  ],
})
export class WorkerModule {}
```

### Step 5: Add Jobs from API

```typescript
// src/api/my-feature/my-feature.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MyFeatureService {
  constructor(
    @InjectQueue('my-queue')
    private readonly myQueue: Queue,
  ) {}

  async triggerBackgroundJob(data: any) {
    await this.myQueue.add('my-job', { data });
    return { message: 'Job queued successfully' };
  }
}
```

### Step 6: Register Queue in ApiModule (if needed)

```typescript
// src/api/my-feature/my-feature.module.ts
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'my-queue',  // Same name as worker
    }),
  ],
  // ...
})
export class MyFeatureModule {}
```

## 📊 Monitoring Jobs

### Bull Board UI

Access the queue monitoring dashboard:

**URL**: http://localhost:3000/api/queues

Features:
- ✅ View all queues
- ✅ See active, waiting, completed, and failed jobs
- ✅ Retry failed jobs manually
- ✅ View job details and logs
- ✅ Monitor queue metrics

### Health Checks

```bash
# API Server Health
curl http://localhost:3000/api/health

# Worker Health
curl http://localhost:3001/api/health
```

### Logs

```bash
# API Server Logs
# Check terminal running pnpm start:dev

# Worker Logs
# Check terminal running pnpm start:worker:dev
```

## 🚢 Production Deployment

### Option 1: PM2 (Recommended)

```json
// pm2.config.json
{
  "apps": [
    {
      "name": "api",
      "script": "dist/main.js",
      "instances": 2,
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production",
        "IS_WORKER": "false"
      }
    },
    {
      "name": "worker",
      "script": "dist/main.js",
      "instances": 3,
      "env": {
        "NODE_ENV": "production",
        "IS_WORKER": "true"
      }
    }
  ]
}
```

```bash
# Start both
pm2 start pm2.config.json

# Monitor
pm2 monit

# Scale workers
pm2 scale worker 5

# Restart
pm2 restart api
pm2 restart worker
```

### Option 2: Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - IS_WORKER=false
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 2

  worker:
    build: .
    environment:
      - NODE_ENV=production
      - IS_WORKER=true
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3

  postgres:
    image: postgres:14
    # ...

  redis:
    image: redis:7
    # ...
```

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Scale workers
docker-compose up -d --scale worker=5

# View logs
docker-compose logs -f worker
```

### Option 3: Kubernetes

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: your-app:latest
        env:
        - name: IS_WORKER
          value: "false"
        - name: APP_PORT
          value: "3000"
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"

---
# worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: your-app:latest
        env:
        - name: IS_WORKER
          value: "true"
        - name: APP_WORKER_PORT
          value: "3001"
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

## 🔍 Troubleshooting

### Issue: Jobs Not Processing

**Symptoms**: Jobs stuck in "waiting" state

**Solutions**:
1. Check worker is running: `curl http://localhost:3001/api/health`
2. Check Redis connection: `redis-cli ping`
3. Check worker logs for errors
4. Verify queue names match between API and worker

### Issue: Worker Crashes

**Symptoms**: Worker process exits unexpectedly

**Solutions**:
1. Check worker logs for error stack traces
2. Ensure database connection is stable
3. Add error handling in job processors:

```typescript
@Process('my-job')
async handleMyJob(job: Job) {
  try {
    await this.doWork(job.data);
  } catch (error) {
    console.error('Job failed:', error);
    throw error; // BullMQ will retry
  }
}
```

### Issue: Memory Leaks

**Symptoms**: Worker memory usage grows over time

**Solutions**:
1. Monitor with `pm2 monit`
2. Add memory limits in PM2 config:

```json
{
  "name": "worker",
  "max_memory_restart": "1G"
}
```

3. Use job concurrency limits:

```typescript
@Processor('my-queue', {
  concurrency: 5, // Process max 5 jobs simultaneously
})
```

### Issue: Duplicate Job Processing

**Symptoms**: Same job processed multiple times

**Solutions**:
1. Use job IDs to prevent duplicates:

```typescript
await this.myQueue.add('my-job', data, {
  jobId: `unique-${data.id}`, // Prevents duplicates
});
```

2. Check only one worker instance per queue (or use proper concurrency settings)

## 📈 Performance Tuning

### Job Concurrency

```typescript
@Processor('my-queue', {
  concurrency: 10, // Process 10 jobs in parallel
})
export class MyQueueProcessor {
  // ...
}
```

### Job Priority

```typescript
// High priority job
await this.myQueue.add('urgent-job', data, {
  priority: 1, // Lower number = higher priority
});

// Low priority job
await this.myQueue.add('background-job', data, {
  priority: 10,
});
```

### Job Retry Strategy

```typescript
await this.myQueue.add('my-job', data, {
  attempts: 3, // Retry up to 3 times
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2 seconds
  },
});
```

### Job Timeout

```typescript
@Process('my-job')
async handleMyJob(job: Job) {
  // Job will fail if it takes longer than 30 seconds
  return await Promise.race([
    this.doWork(job.data),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 30000)
    ),
  ]);
}
```

## 🎯 Best Practices

### 1. Keep Jobs Small and Focused

❌ **Bad**: One job does everything
```typescript
@Process('user-registration')
async handleRegistration(job: Job) {
  await this.createUser(job.data);
  await this.sendWelcomeEmail(job.data);
  await this.createProfile(job.data);
  await this.notifyAdmin(job.data);
}
```

✅ **Good**: Separate jobs for each task
```typescript
@Process('create-user')
async handleCreateUser(job: Job) {
  await this.createUser(job.data);
}

@Process('send-welcome-email')
async handleWelcomeEmail(job: Job) {
  await this.sendWelcomeEmail(job.data);
}
```

### 2. Add Proper Error Handling

```typescript
@Process('my-job')
async handleMyJob(job: Job) {
  try {
    await this.doWork(job.data);
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    
    // Log to monitoring service
    Sentry.captureException(error);
    
    // Re-throw to trigger retry
    throw error;
  }
}
```

### 3. Use Job Progress Tracking

```typescript
@Process('long-running-job')
async handleLongJob(job: Job) {
  const total = 100;
  
  for (let i = 0; i < total; i++) {
    await this.processItem(i);
    await job.updateProgress((i / total) * 100);
  }
}
```

### 4. Clean Up Completed Jobs

```typescript
await this.myQueue.add('my-job', data, {
  removeOnComplete: true, // Remove after completion
  removeOnFail: false,    // Keep failed jobs for debugging
});
```

## 📚 Additional Resources

- [BullMQ Documentation](https://docs.bullmq.io)
- [NestJS Queues](https://docs.nestjs.com/techniques/queues)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

**Questions?** Check the main [README.md](./README.md) or [SETUP.md](./SETUP.md) for more information.

