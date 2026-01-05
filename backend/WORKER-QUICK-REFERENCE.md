# Worker Quick Reference

Quick reference for working with the worker instance.

## 🚀 Commands

```bash
# Development
pnpm start:dev          # API Server (Port 3000)
pnpm start:worker:dev   # Worker Instance (Port 3001)

# Production
pnpm build              # Build both
pnpm start:prod         # API Server
pnpm start:worker       # Worker Instance

# PM2 (Production)
pm2 start pm2.config.json   # Start both
pm2 restart api             # Restart API only
pm2 restart worker          # Restart Worker only
pm2 scale worker 5          # Scale to 5 workers
pm2 monit                   # Monitor both
```

## 📊 Monitoring

```bash
# Health Checks
curl http://localhost:3000/api/health  # API
curl http://localhost:3001/api/health  # Worker

# Bull Board (Queue UI)
open http://localhost:3000/api/queues

# Logs
pm2 logs api
pm2 logs worker
```

## 🔧 Environment Variables

```bash
# .env file
APP_PORT=3000              # API port
APP_WORKER_PORT=3001       # Worker port
IS_WORKER=false            # Auto-set by scripts

# Required for both
DATABASE_HOST=localhost
REDIS_HOST=localhost

# Required for worker
MAIL_HOST=smtp.gmail.com
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-password
```

## 📦 Create New Job

### 1. Create Processor

```typescript
// src/worker/queues/my-queue/my-queue.processor.ts
@Processor('my-queue')
export class MyQueueProcessor {
  @Process('my-job')
  async handleMyJob(job: Job<{ data: string }>) {
    console.log('Processing:', job.data);
    // Your logic here
  }
}
```

### 2. Create Module

```typescript
// src/worker/queues/my-queue/my-queue.module.ts
@Module({
  imports: [BullModule.registerQueue({ name: 'my-queue' })],
  providers: [MyQueueProcessor],
  exports: [BullModule],
})
export class MyQueueModule {}
```

### 3. Register in WorkerModule

```typescript
// src/worker/worker.module.ts
@Module({
  imports: [
    EmailQueueModule,
    MyQueueModule,  // Add here
  ],
})
export class WorkerModule {}
```

### 4. Add Jobs from API

```typescript
// src/api/my-feature/my-feature.service.ts
@Injectable()
export class MyFeatureService {
  constructor(
    @InjectQueue('my-queue')
    private readonly myQueue: Queue,
  ) {}

  async triggerJob(data: any) {
    await this.myQueue.add('my-job', { data });
  }
}
```

## 🎯 Job Options

```typescript
// Priority
await queue.add('job', data, { priority: 1 });

// Retry
await queue.add('job', data, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
});

// Delay
await queue.add('job', data, { delay: 5000 });

// Unique Job
await queue.add('job', data, { jobId: 'unique-id' });

// Remove on Complete
await queue.add('job', data, {
  removeOnComplete: true,
  removeOnFail: false,
});
```

## 🔍 Troubleshooting

### Jobs Not Processing

```bash
# 1. Check worker is running
curl http://localhost:3001/api/health

# 2. Check Redis
redis-cli ping

# 3. Check Bull Board
open http://localhost:3000/api/queues

# 4. Check logs
pm2 logs worker
```

### Worker Crashes

```typescript
// Add error handling
@Process('my-job')
async handleMyJob(job: Job) {
  try {
    await this.doWork(job.data);
  } catch (error) {
    console.error('Job failed:', error);
    throw error; // Triggers retry
  }
}
```

### Memory Issues

```json
// pm2.config.json
{
  "name": "worker",
  "max_memory_restart": "1G"
}
```

## 📈 Performance

```typescript
// Concurrency
@Processor('my-queue', { concurrency: 10 })

// Progress Tracking
await job.updateProgress(50);

// Timeout
const timeout = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Timeout')), 30000)
);
await Promise.race([this.doWork(job.data), timeout]);
```

## 🚢 Deployment

### Docker Compose

```yaml
services:
  api:
    environment:
      - IS_WORKER=false
  worker:
    environment:
      - IS_WORKER=true
    deploy:
      replicas: 3
```

### Kubernetes

```yaml
# API Deployment
env:
- name: IS_WORKER
  value: "false"

# Worker Deployment
env:
- name: IS_WORKER
  value: "true"
replicas: 5
```

## 📚 Resources

- Full Documentation: [WORKER-ARCHITECTURE.md](./WORKER-ARCHITECTURE.md)
- Backend Setup: [SETUP.md](./SETUP.md)
- BullMQ Docs: https://docs.bullmq.io
- NestJS Queues: https://docs.nestjs.com/techniques/queues

