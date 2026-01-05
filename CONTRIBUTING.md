# Contributing to Fullstack Starter Kit

First off, thank you for considering contributing to Fullstack Starter Kit! It's people like you that make this project such a great tool for the developer community.

## 🎯 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Project Structure](#project-structure)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Guidelines](#documentation-guidelines)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS, Windows, Linux]
 - Node.js version: [e.g. 20.10.0]
 - Package manager: [e.g. npm, pnpm, yarn]
 - Browser (if applicable): [e.g. Chrome, Safari]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

**Enhancement Template:**
```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

### Contributing Code

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Submit a pull request**

### Areas Where We Need Help

- 🐛 **Bug fixes**: Check open issues labeled `bug`
- ✨ **New features**: Check issues labeled `enhancement`
- 📚 **Documentation**: Improvements to docs, examples, tutorials
- 🧪 **Tests**: Adding or improving test coverage
- 🌍 **Translations**: Adding i18n support for more languages
- 🎨 **UI/UX**: Improving frontend components and design
- ⚡ **Performance**: Optimizing code and reducing bundle sizes
- 🔒 **Security**: Identifying and fixing security vulnerabilities

## 🛠️ Development Setup

### Prerequisites

- Node.js 20+ (LTS recommended)
- PostgreSQL 14+
- Redis 7+
- npm, pnpm, or yarn
- Git

### Backend Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/fullstack-starter-kit.git
cd fullstack-starter-kit

# Navigate to backend
cd backend

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your local configuration

# Run database migrations
pnpm migration:up

# Start development server
pnpm start:dev
```

Backend runs on: http://localhost:3000

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your local configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Frontend runs on: http://localhost:3001

### Running Tests

**Backend:**
```bash
cd backend

# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

**Frontend:**
```bash
cd frontend

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Type checking
npm run check:types
```

## 🔄 Pull Request Process

### Before Submitting

1. **Update your fork** with the latest changes from `main`
2. **Run all tests** and ensure they pass
3. **Run linters** and fix any issues
4. **Update documentation** if you've changed APIs or behavior
5. **Add tests** for new features
6. **Follow commit message conventions**

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Examples:**
```bash
feat(backend): add user profile endpoint
fix(frontend): resolve authentication redirect loop
docs(readme): update installation instructions
test(backend): add tests for user service
refactor(frontend): simplify form validation logic
```

### Pull Request Template

When you create a PR, include:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test update

## Related Issues
Fixes #(issue number)

## How Has This Been Tested?
Describe the tests you ran and how to reproduce them.

## Screenshots (if applicable)
Add screenshots to demonstrate the changes.

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published
```

### Review Process

1. **Automated checks** must pass (linting, tests, builds)
2. **At least one maintainer** must review and approve
3. **All feedback** must be addressed
4. **Merge conflicts** must be resolved
5. Once approved, a maintainer will merge your PR

## 📝 Coding Standards

### TypeScript

- **Use TypeScript strict mode** - No `any` types
- **Explicit types** for function parameters and return values
- **Interfaces over types** for object shapes
- **Descriptive names** for variables, functions, and types

**Good:**
```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
}

async function getUserById(id: string): Promise<User> {
  // Implementation
}
```

**Bad:**
```typescript
async function getUser(id: any): Promise<any> {
  // Implementation
}
```

### Backend (NestJS)

- **Follow NestJS conventions** - Controllers, Services, Modules
- **Use dependency injection** - Constructor injection
- **DTOs for validation** - Use class-validator decorators
- **Error handling** - Use NestJS exception filters
- **Documentation** - Add Swagger decorators

**Example:**
```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
```

### Frontend (Next.js)

- **Use App Router** - Not Pages Router
- **Server Components by default** - Use `'use client'` only when needed
- **Tailwind CSS for styling** - No inline styles
- **Form validation with Zod** - Type-safe schemas
- **Internationalization** - Use next-intl for all text

**Example:**
```typescript
// Server Component (default)
export default async function UsersPage() {
  const users = await getUsers();
  return <UserList users={users} />;
}

// Client Component (when needed)
'use client';

export function UserForm() {
  const { register, handleSubmit } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });
  // ...
}
```

### Code Formatting

We use **Prettier** and **ESLint**:

```bash
# Backend
cd backend
pnpm lint
pnpm format

# Frontend
cd frontend
npm run lint
npm run format
```

**Configuration:**
- 2 spaces for indentation
- Single quotes for strings
- Trailing commas
- Semicolons required
- Max line length: 100 characters

## 📁 Project Structure

### Backend Structure
```
backend/src/
├── api/              # REST + GraphQL APIs
│   ├── user/        # User module
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.entity.ts
│   │   └── dto/
│   └── ...
├── auth/            # Authentication
├── database/        # TypeORM + migrations
├── shared/          # Shared modules
└── worker/          # Background jobs
```

### Frontend Structure
```
frontend/src/
├── app/             # Next.js App Router
│   └── [locale]/   # Internationalized routes
├── components/      # React components
├── libs/           # Core libraries
├── utils/          # Utility functions
└── validations/    # Zod schemas
```

## 🧪 Testing Guidelines

### Backend Tests

**Unit Tests:**
```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should find a user by id', async () => {
    const user = { id: '1', email: 'test@example.com' };
    jest.spyOn(repository, 'findOne').mockResolvedValue(user as User);

    expect(await service.findOne('1')).toEqual(user);
  });
});
```

**E2E Tests:**
```typescript
describe('UserController (e2e)', () => {
  it('/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
```

### Frontend Tests

**Component Tests:**
```typescript
describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button label="Click me" onClick={onClick} />);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Test Coverage

We aim for:
- **80%+ code coverage** for critical paths
- **100% coverage** for utility functions
- **E2E tests** for main user flows

## 📚 Documentation Guidelines

### Code Comments

- **Explain WHY, not WHAT** - Code should be self-documenting
- **Use JSDoc** for public APIs
- **Keep comments up-to-date** - Remove outdated comments

**Good:**
```typescript
// Use exponential backoff to avoid overwhelming the API during high traffic
async function retryWithBackoff(fn: () => Promise<void>, maxRetries = 3) {
  // Implementation
}
```

**Bad:**
```typescript
// This function adds two numbers
function add(a: number, b: number): number {
  return a + b;
}
```

### JSDoc for Public APIs

```typescript
/**
 * Retrieves a user by their unique identifier.
 * 
 * @param id - The unique identifier of the user
 * @returns A promise that resolves to the user object
 * @throws {NotFoundException} When user is not found
 * 
 * @example
 * ```typescript
 * const user = await userService.findOne('123');
 * console.log(user.email);
 * ```
 */
async findOne(id: string): Promise<User> {
  // Implementation
}
```

### Documentation Updates

When making changes, update:
- **README.md** - If changing setup or usage
- **API documentation** - If changing endpoints
- **AGENTS.md** - If changing patterns or conventions
- **Migration guides** - If introducing breaking changes

## 🌍 Community

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check existing docs first

### Recognition

Contributors will be:
- Listed in the project's contributors page
- Mentioned in release notes for significant contributions
- Credited in documentation they've improved

## 🎉 Thank You!

Your contributions to open source, large or small, make projects like this possible. Thank you for taking the time to contribute!

---

## 📞 Questions?

If you have questions about contributing, feel free to:
- Open a GitHub Discussion
- Create an issue with the `question` label
- Reach out to the maintainers

**Happy Contributing! 🚀**

