# AI Agent Configuration Guide

This document explains the AI agent configuration system for this project.

## 📁 Configuration Files

This project includes multiple AI agent configuration files to support different AI tools and contexts:

### Root Level
- **`AGENTS.md`** - Comprehensive AI agent guidelines (PRIMARY)
- **`CLAUDE.md`** - Alias/quick reference for Claude AI
- **`.cursorrules`** - Cursor IDE specific rules
- **`AI-CONFIGURATION.md`** - This file (explains the system)

### Folder-Specific
- **`backend/AGENTS.md`** - Backend (NestJS) specific rules
- **`frontend/AGENTS.md`** - Frontend (Next.js) specific rules
- **`docs/AGENTS.md`** - Documentation system specific rules

## 🎯 Which File to Read?

### For AI Agents (Cursor, Claude, Copilot, etc.)

**Start with**: `AGENTS.md` in the root folder

**Then read**: Folder-specific `AGENTS.md` based on where you're working:
- Working in `backend/`? → Read `backend/AGENTS.md`
- Working in `frontend/`? → Read `frontend/AGENTS.md`
- Working in `docs/`? → Read `docs/AGENTS.md`

### For Cursor IDE
Cursor automatically reads `.cursorrules` which provides quick context and points to the comprehensive `AGENTS.md` files.

### For Claude AI
Both `AGENTS.md` and `CLAUDE.md` work. `CLAUDE.md` is a quick reference that points to `AGENTS.md` for complete details.

## 📋 File Purposes

### `AGENTS.md` (Root)
**Purpose**: Comprehensive guidelines for all AI agents

**Contains**:
- Project overview and structure
- Critical rules and conventions
- Tech stack details
- Code quality standards
- Development workflow
- Testing guidelines
- Security best practices
- Common issues and solutions

**When to read**: 
- Starting work on the project
- Need comprehensive context
- Unsure about conventions

### `backend/AGENTS.md`
**Purpose**: Backend-specific (NestJS) guidelines

**Contains**:
- NestJS patterns and conventions
- TypeORM entity patterns
- Better Auth integration
- API design patterns (REST + GraphQL)
- Database migration guidelines
- Caching strategies
- Background job patterns
- Testing patterns

**When to read**:
- Working on backend code
- Creating new API endpoints
- Designing database schema
- Implementing authentication

### `frontend/AGENTS.md`
**Purpose**: Frontend-specific (Next.js) guidelines

**Contains**:
- Next.js App Router patterns
- Server vs Client components
- Better Auth client usage
- Tailwind CSS styling
- Form validation with Zod
- Internationalization (i18n)
- Performance optimization
- Accessibility guidelines

**When to read**:
- Working on frontend code
- Creating new pages/components
- Implementing forms
- Styling with Tailwind

### `docs/AGENTS.md`
**Purpose**: Documentation system guidelines

**Contains**:
- Requirements documentation standards
- Database design guidelines
- API specification format
- Design system documentation
- ER diagram conventions
- Documentation quality checklist

**When to read**:
- Creating/updating requirements
- Documenting database design
- Writing API specifications
- Defining design systems

### `.cursorrules`
**Purpose**: Quick context for Cursor IDE

**Contains**:
- Brief project overview
- Critical rules summary
- Pointers to comprehensive docs
- Style guide governance

**When to read**:
- Automatically read by Cursor
- Quick reference while coding

### `CLAUDE.md`
**Purpose**: Quick reference for Claude AI

**Contains**:
- Brief overview
- Most important rules
- Pointers to comprehensive docs
- Quick checklist

**When to read**:
- Quick context check
- Points to `AGENTS.md` for details

## 🚀 Quick Start for AI Agents

### First Time Working on This Project?

1. **Read** `AGENTS.md` (root) - 10 minutes
2. **Read** folder-specific `AGENTS.md` for your work area - 5 minutes
3. **Check** `docs/project-requirements/` for requirements
4. **Start** implementing following the guidelines

### Working on a Specific Task?

1. **Check** `docs/project-requirements/` - Is this feature documented?
2. **Read** folder-specific `AGENTS.md` - What are the patterns?
3. **Review** similar existing code - How is it done now?
4. **Implement** following the patterns
5. **Test** and document

## 🎨 Configuration Philosophy

### Why Multiple Files?

1. **Context-Specific**: Different rules apply to backend vs frontend vs docs
2. **Comprehensive**: Root `AGENTS.md` provides full context
3. **Quick Reference**: `.cursorrules` and `CLAUDE.md` for quick checks
4. **Tool-Specific**: Different AI tools look for different file names

### Why Not One Big File?

- **Too Long**: A single file with all details would be overwhelming
- **Context Switching**: Working on frontend doesn't need backend details
- **Maintainability**: Easier to update specific sections
- **Clarity**: Focused guidelines are easier to follow

### Hierarchy

```
Root Level (General)
├── AGENTS.md (Comprehensive)
├── CLAUDE.md (Quick reference)
└── .cursorrules (Cursor-specific)

Folder Level (Specific)
├── backend/AGENTS.md (Backend rules)
├── frontend/AGENTS.md (Frontend rules)
└── docs/AGENTS.md (Documentation rules)
```

## 📚 Content Overview

### What's in Root `AGENTS.md`?

- ✅ Project overview and structure
- ✅ Critical rules (requirements-first, Better Auth, etc.)
- ✅ Tech stack details
- ✅ File naming conventions
- ✅ Code style guidelines
- ✅ Security guidelines
- ✅ Testing guidelines
- ✅ Git workflow
- ✅ Common issues and solutions

### What's in `backend/AGENTS.md`?

- ✅ NestJS module structure
- ✅ Dependency injection patterns
- ✅ TypeORM entity patterns
- ✅ DTO validation
- ✅ Authentication patterns
- ✅ Database patterns
- ✅ API patterns (REST + GraphQL)
- ✅ Caching patterns
- ✅ Email patterns
- ✅ Background job patterns
- ✅ Testing patterns

### What's in `frontend/AGENTS.md`?

- ✅ Next.js App Router structure
- ✅ Server vs Client components
- ✅ Better Auth client usage
- ✅ Component patterns
- ✅ Form validation (Zod)
- ✅ Styling (Tailwind CSS)
- ✅ Internationalization
- ✅ API communication
- ✅ Performance optimization
- ✅ Accessibility
- ✅ Testing patterns

### What's in `docs/AGENTS.md`?

- ✅ Documentation structure
- ✅ Requirements standards
- ✅ Database design guidelines
- ✅ API specification format
- ✅ Design system documentation
- ✅ ER diagram conventions
- ✅ Markdown formatting
- ✅ Quality checklist

## 🔄 Keeping Configuration Updated

### When to Update?

- ✅ New patterns emerge in the codebase
- ✅ Tech stack changes
- ✅ New conventions are adopted
- ✅ Common issues are discovered
- ✅ Best practices evolve

### How to Update?

1. **Identify** the change needed
2. **Update** the relevant `AGENTS.md` file(s)
3. **Ensure** consistency across files
4. **Test** with AI agents
5. **Document** the change

### Consistency Rules

- Root `AGENTS.md` should reference folder-specific files
- Folder-specific files should focus on their domain
- No contradictions between files
- Common rules in root, specific rules in folders

## ✅ Validation Checklist

### For AI Agents Using These Files

Before implementing:
- [ ] Read root `AGENTS.md`
- [ ] Read folder-specific `AGENTS.md`
- [ ] Checked `docs/project-requirements/`
- [ ] Reviewed similar existing code
- [ ] Understand the patterns
- [ ] Know the tech stack
- [ ] Clear on conventions

### For Maintainers

When updating configuration:
- [ ] Changes are consistent across files
- [ ] No contradictions introduced
- [ ] Examples are accurate
- [ ] Links are valid
- [ ] Tested with AI agents
- [ ] Documentation is clear

## 🆘 Troubleshooting

### AI Agent Not Following Rules?

1. **Check** if the agent read the correct `AGENTS.md`
2. **Verify** the rules are clear and specific
3. **Ensure** no contradictions in the files
4. **Update** the configuration if needed

### Conflicting Guidelines?

1. **Root `AGENTS.md`** takes precedence for general rules
2. **Folder-specific `AGENTS.md`** takes precedence for domain-specific rules
3. If still unclear, ask the user

### Missing Information?

1. **Check** if it's in a different `AGENTS.md` file
2. **Review** the project documentation (`docs/`)
3. **Look** at existing code for patterns
4. **Ask** the user for clarification

## 📞 Support

### For AI Agents
- Read `AGENTS.md` files thoroughly
- Check `docs/GETTING-STARTED.md` for workflow
- Review existing code for patterns
- Ask user when unclear

### For Developers
- Follow the guidelines in `AGENTS.md` files
- Update configuration when patterns change
- Keep files consistent
- Test with AI agents

## 🎯 Success Criteria

Configuration is successful when:
- ✅ AI agents consistently follow conventions
- ✅ Code quality is maintained
- ✅ Patterns are consistent
- ✅ New features follow existing patterns
- ✅ Documentation stays updated
- ✅ No confusion about rules

---

**Remember**: These configuration files exist to help AI agents work effectively with this codebase. Keep them updated, clear, and consistent.

