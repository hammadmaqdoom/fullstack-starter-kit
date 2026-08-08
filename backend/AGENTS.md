# AI Agent Configuration — Backend (Polaris / NestJS)

Backend guidelines for **Polaris** (Digitaro HRMS). Read `../AGENTS.md` and `../docs/AGENTS.md` first.

## Polaris backend rules

| Rule | Detail |
|---|---|
| **New HR code** | `backend/src/modules/<context>/` — not `api/` (starter-kit legacy) |
| **API prefix** | `/api/v1/` with `{ data, meta, errors }` envelope |
| **Auth** | Better Auth + Entra OIDC (employees) + email (contractors) |
| **Every mutation** | Write `audit_log` via interceptor |
| **Queries** | Filter `tenant_id` + row scope (own/team/division/all) |
| **Country** | Resolve via `country-config` module — never hard-code PK/UAE/SG |
| **Phase** | Phase 0 now — see `../docs/generated/tasks.md` |

**Bounded contexts:** `core-hr`, `country-config`, `compliance`, `time-leave`, `talent`, `documents`, `esign`, `operations`, `payroll`, `automation` — see `../docs/project-requirements/system-architecture.md` §3.

**Per feature:** PRD §6.x → FLW-* in `../docs/compliance/feature-flows.md` → `database-design.md` → `api-specification.md` → implement → e2e test.

## Backend overview

- **Framework**: NestJS 10.x (Fastify)
- **Database**: PostgreSQL + TypeORM migrations
- **Auth**: Better Auth + Entra OIDC (NOT NextAuth)
- **Cache/Queue**: Redis + BullMQ
- **Testing**: Jest (unit + e2e)

### Dual-instance architecture

1. **API** (`pnpm start:dev`) — port 8000, HTTP only, enqueues jobs
2. **Worker** (`pnpm start:worker:dev`) — port 8001, processes BullMQ jobs (FX fetch, PDF seal, Entra sync, alerts)

## Backend structure

```
backend/src/
├── modules/                # Polaris HR bounded contexts (CREATE HERE)
│   ├── core-hr/
│   ├── country-config/
│   ├── compliance/
│   └── ...
├── api/                    # Legacy starter-kit (CMS, user, media)
├── auth/                   # Better Auth, Entra, RBAC guards
├── database/               # Migrations, seeds
├── shared/                 # Cache, mail, interceptors
├── worker/                 # BullMQ processors
└── app.module.ts
```

## 🚨 Critical Backend Rules

### 1. Better Auth (NOT NextAuth)
```typescript
// ✅ Correct: Using Better Auth
import { BetterAuthService } from '@/auth/better-auth.service';

@Injectable()
export class MyService {
  constructor(private readonly betterAuth: BetterAuthService) {}
}

// ❌ Wrong: Never reference NextAuth
import { NextAuth } from 'next-auth'; // This is WRONG!
```

### 2. Module Structure
Every feature should follow NestJS module pattern:
```
feature/
├── feature.module.ts       # Module definition
├── feature.controller.ts   # REST endpoints
├── feature.service.ts      # Business logic
├── feature.resolver.ts     # GraphQL resolver (optional)
├── dto/                    # Data Transfer Objects
│   ├── create-feature.dto.ts
│   └── update-feature.dto.ts
└── entities/               # TypeORM entities
    └── feature.entity.ts
```

### 3. Dependency Injection
**ALWAYS** use constructor injection:
```typescript
// ✅ Good: Constructor injection
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}
}

// ❌ Bad: Direct instantiation
@Injectable()
export class UserService {
  private userRepository = new Repository<User>();
}
```

### 4. Database Entities
Use TypeORM decorators properly:
```typescript
// ✅ Good: Complete entity definition
@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ nullable: true })
  name: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}

// ❌ Bad: Missing decorators and indexes
export class User {
  id: string;
  email: string;
  name: string;
}
```

### 5. DTOs with Validation
**ALWAYS** validate input using class-validator:
```typescript
// ✅ Good: Validated DTO
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

// ❌ Bad: No validation
export class CreateUserDto {
  email: string;
  password: string;
  name?: string;
}
```

## 🔐 Authentication Patterns

### Protecting Routes
```typescript
// ✅ Good: Using Auth decorator
import { Auth } from '@/decorators/auth/auth.decorator';
import { CurrentUser } from '@/decorators/auth/current-user.decorator';

@Controller('users')
export class UserController {
  @Auth() // Requires authentication
  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Auth(['admin']) // Requires admin role
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.userService.delete(id);
  }
}

// ❌ Bad: Manual guard usage
@UseGuards(AuthGuard)
@Get('profile')
getProfile(@Request() req) {
  return req.user;
}
```

### Optional Authentication
```typescript
// ✅ Good: Optional auth
import { AuthOptional } from '@/decorators/auth-optional.decorator';

@AuthOptional()
@Get('posts')
getPosts(@CurrentUser() user?: User) {
  // User is optional, can be undefined
  return this.postService.findAll(user?.id);
}
```

## 📊 Database Patterns

### Migrations
```bash
# Generate migration from entity changes
pnpm migration:generate src/database/migrations/AddUserProfile

# Create empty migration
pnpm migration:create src/database/migrations/AddIndexes

# Run migrations
pnpm migration:up

# Revert last migration
pnpm migration:down
```

**NEVER** modify existing migrations. Always create new ones.

### Repository Pattern
```typescript
// ✅ Good: Using repository methods
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(dto);
    return this.userRepository.save(user);
  }
}

// ❌ Bad: Direct SQL queries without type safety
async findOne(id: string) {
  return this.userRepository.query('SELECT * FROM users WHERE id = $1', [id]);
}
```

### Transactions
```typescript
// ✅ Good: Using transactions for multiple operations
async transferFunds(fromId: string, toId: string, amount: number) {
  return this.dataSource.transaction(async (manager) => {
    const fromAccount = await manager.findOne(Account, { where: { id: fromId } });
    const toAccount = await manager.findOne(Account, { where: { id: toId } });

    fromAccount.balance -= amount;
    toAccount.balance += amount;

    await manager.save([fromAccount, toAccount]);
  });
}
```

## 🎯 API Patterns

### REST Controllers
```typescript
// ✅ Good: Complete REST controller
@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateUserDto): Promise<User> {
    return this.userService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Auth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<User> {
    // Ensure user can only update their own profile
    if (id !== currentUser.id) {
      throw new ForbiddenException('Cannot update other users');
    }
    return this.userService.update(id, dto);
  }
}
```

### GraphQL Resolvers
```typescript
// ✅ Good: GraphQL resolver
@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => User)
  async user(@Args('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Mutation(() => User)
  async createUser(@Args('input') input: CreateUserInput): Promise<User> {
    return this.userService.create(input);
  }

  @ResolveField(() => [Post])
  async posts(@Parent() user: User): Promise<Post[]> {
    return this.postService.findByUserId(user.id);
  }
}
```

## 🔄 Caching Patterns

### Using Cache Service
```typescript
// ✅ Good: Caching expensive operations
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  async findOne(id: string): Promise<User> {
    const cacheKey = `user:${id}`;
    
    // Try cache first
    const cached = await this.cacheService.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, user, 300);
    
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.save({ id, ...dto });
    
    // Invalidate cache
    await this.cacheService.del(`user:${id}`);
    
    return user;
  }
}
```

## 📧 Email Patterns

### Sending Emails
```typescript
// ✅ Good: Using mail service
@Injectable()
export class AuthService {
  constructor(private readonly mailService: MailService) {}

  async sendVerificationEmail(user: User, token: string) {
    await this.mailService.send({
      to: user.email,
      subject: 'Verify your email',
      template: 'email-verification',
      context: {
        name: user.name,
        verificationUrl: `${process.env.APP_URL}/verify?token=${token}`,
      },
    });
  }
}
```

### Creating Email Templates
1. Create React Email template in `src/shared/mail/templates/`
2. Build templates: `pnpm email:build`
3. Preview: `pnpm email:dev`

## 🔄 Background Jobs & Worker Architecture

### Worker Instance

This application uses a **dedicated worker instance** for processing background jobs:

```bash
# Terminal 1: API Server
pnpm start:dev

# Terminal 2: Worker Instance
pnpm start:worker:dev
```

**See [WORKER-ARCHITECTURE.md](./WORKER-ARCHITECTURE.md) for complete documentation.**

### Creating Jobs

#### Step 1: Create Job Processor (Worker Side)

```typescript
// ✅ Good: Background job processor in src/worker/queues/
@Processor('email')
export class EmailProcessor {
  constructor(private readonly mailService: MailService) {}

  @Process('send-welcome-email')
  async handleWelcomeEmail(job: Job<{ userId: string; email: string }>) {
    console.log(`Processing welcome email for ${job.data.email}`);
    
    await this.mailService.sendWelcomeEmail(
      job.data.email,
      job.data.userId,
    );
    
    console.log(`Welcome email sent to ${job.data.email}`);
  }
}
```

#### Step 2: Add Jobs to Queue (API Side)

```typescript
// ✅ Good: Adding jobs from API service
@Injectable()
export class UserService {
  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = await this.userRepository.save(dto);
    
    // Queue welcome email (processed by worker)
    await this.emailQueue.add('send-welcome-email', { 
      userId: user.id,
      email: user.email,
    });
    
    return user;
  }
}
```

### Key Points

- **API Server**: Adds jobs to Redis queue
- **Worker Instance**: Processes jobs from Redis queue
- **Separation**: API stays responsive during heavy job processing
- **Monitoring**: Use Bull Board at `/api/queues` to monitor jobs
- **Scaling**: Scale API and workers independently

## 🧪 Testing Patterns

### Unit Tests
```typescript
// ✅ Good: Complete unit test
describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    cacheService = module.get<CacheService>(CacheService);
  });

  describe('findOne', () => {
    it('should return cached user if available', async () => {
      const user = { id: '1', email: 'test@example.com' } as User;
      jest.spyOn(cacheService, 'get').mockResolvedValue(user);

      const result = await service.findOne('1');

      expect(result).toEqual(user);
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      const user = { id: '1', email: 'test@example.com' } as User;
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(repository, 'findOne').mockResolvedValue(user);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await service.findOne('1');

      expect(result).toEqual(user);
      expect(cacheService.set).toHaveBeenCalledWith('user:1', user, 300);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### E2E Tests
```typescript
// ✅ Good: E2E test
describe('UserController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const response = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'test@example.com', password: 'password123' });
    authToken = response.body.token;
  });

  it('/users (POST) should create user', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ email: 'new@example.com', password: 'password123' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toBe('new@example.com');
      });
  });

  it('/users/:id (GET) should require authentication', () => {
    return request(app.getHttpServer())
      .get('/users/1')
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## 🔍 Error Handling

### Standard Error Responses
```typescript
// ✅ Good: Proper error handling
@Injectable()
export class UserService {
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    try {
      const user = this.userRepository.create(dto);
      return await this.userRepository.save(user);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }
}

// ❌ Bad: Generic errors
async findOne(id: string) {
  const user = await this.userRepository.findOne({ where: { id } });
  if (!user) {
    throw new Error('Not found'); // Too generic
  }
  return user;
}
```

### Custom Exceptions
```typescript
// ✅ Good: Custom exception
export class InsufficientFundsException extends BadRequestException {
  constructor(required: number, available: number) {
    super({
      message: 'Insufficient funds',
      required,
      available,
      deficit: required - available,
    });
  }
}
```

## 📊 Monitoring & Logging

### Structured Logging
```typescript
// ✅ Good: Structured logging
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async create(dto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating user with email: ${dto.email}`);
    
    try {
      const user = await this.userRepository.save(dto);
      this.logger.log(`User created successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }
}

// ❌ Bad: Console.log
async create(dto: CreateUserDto) {
  console.log('Creating user');
  return this.userRepository.save(dto);
}
```

## 🚀 Performance Optimization

### Database Queries
```typescript
// ✅ Good: Efficient query with relations
async getUserWithPosts(id: string): Promise<User> {
  return this.userRepository.findOne({
    where: { id },
    relations: ['posts'],
    select: ['id', 'email', 'name'], // Only select needed fields
  });
}

// ❌ Bad: N+1 query problem
async getUserWithPosts(id: string) {
  const user = await this.userRepository.findOne({ where: { id } });
  user.posts = await this.postRepository.find({ where: { userId: id } });
  return user;
}
```

### Pagination
```typescript
// ✅ Good: Paginated results
async findAll(page = 1, limit = 10): Promise<PaginatedResult<User>> {
  const [items, total] = await this.userRepository.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

## 📝 Configuration

### Environment Variables
```typescript
// ✅ Good: Typed configuration
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'mydb',
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  ssl: process.env.DATABASE_SSL_ENABLED === 'true',
}));

// Using in service
@Injectable()
export class MyService {
  constructor(
    @Inject('database')
    private readonly dbConfig: ConfigType<typeof databaseConfig>,
  ) {}
}
```

## ✅ Pre-Implementation Checklist

Before implementing a backend feature:
- [ ] Requirements documented in `../docs/project-requirements/`
- [ ] Database schema designed (if needed) in `../docs/project-requirements/database-design.md`
- [ ] API endpoints specified (if needed) in `../docs/project-requirements/api-specification.md`
- [ ] DTOs created with validation
- [ ] Entities created with proper decorators
- [ ] Service implements business logic
- [ ] Controller/Resolver handles HTTP/GraphQL
- [ ] Error handling implemented
- [ ] Tests written (unit + e2e)
- [ ] Swagger documentation added
- [ ] Caching considered
- [ ] Logging added

## 🆘 Common Issues

### Database Connection
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres -d your_db_name

# Run migrations
pnpm migration:up
```

### Redis Connection
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

### Better Auth Issues
- Ensure `BETTER_AUTH_SECRET` is set in `.env`
- Verify `BETTER_AUTH_URL` matches your backend URL
- Check Redis is running for session storage

## 📚 Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Better Auth Documentation](https://www.better-auth.com)
- [TypeORM Documentation](https://typeorm.io)
- [BullMQ Documentation](https://docs.bullmq.io)
- [Fastify Documentation](https://www.fastify.io)

---

**Remember**: Always follow NestJS best practices, use dependency injection, validate inputs, handle errors properly, and write tests.

