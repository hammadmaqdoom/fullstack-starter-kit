# AI Configuration Files Index

This document provides a complete index of all AI-related configuration files in this project.

## 📋 Complete File List

### Root Level Configuration

| File | Purpose | When to Read |
|------|---------|--------------|
| **`AGENTS.md`** | Comprehensive AI agent guidelines | Always read first |
| **`CLAUDE.md`** | Quick reference for Claude AI | Quick context check |
| **`.cursorrules`** | Cursor IDE specific rules | Auto-read by Cursor |
| **`AI-CONFIGURATION.md`** | Explains the configuration system | Understanding the system |
| **`AI-QUICK-REFERENCE.md`** | Quick reference card | Quick lookup while coding |
| **`AI-FILES-INDEX.md`** | This file - index of all AI files | Finding the right file |
| **`.aidigestignore`** | Files for AI to ignore | Auto-used by AI tools |

### Backend Configuration

| File | Purpose | When to Read |
|------|---------|--------------|
| **`backend/AGENTS.md`** | Backend (NestJS) specific rules | Working on backend code |

### Frontend Configuration

| File | Purpose | When to Read |
|------|---------|--------------|
| **`frontend/AGENTS.md`** | Frontend (Next.js) specific rules | Working on frontend code |

### Documentation Configuration

| File | Purpose | When to Read |
|------|---------|--------------|
| **`docs/AGENTS.md`** | Documentation system rules | Working on documentation |

## 🎯 Quick Navigation Guide

### "I'm new to this project"
1. Read: `AGENTS.md` (root)
2. Read: `AI-QUICK-REFERENCE.md`
3. Read: Folder-specific `AGENTS.md` for your work area

### "I need a quick reminder"
1. Read: `AI-QUICK-REFERENCE.md`
2. Check: `.cursorrules` for critical rules

### "I'm working on backend"
1. Read: `backend/AGENTS.md`
2. Reference: `AGENTS.md` (root) for general rules

### "I'm working on frontend"
1. Read: `frontend/AGENTS.md`
2. Reference: `AGENTS.md` (root) for general rules

### "I'm writing documentation"
1. Read: `docs/AGENTS.md`
2. Reference: `AGENTS.md` (root) for general rules

### "I want to understand the system"
1. Read: `AI-CONFIGURATION.md`
2. Read: `AGENTS.md` (root)

## 📊 File Relationships

```
Root Level (General Context)
│
├── AGENTS.md (Primary)
│   ├── Referenced by: CLAUDE.md
│   ├── Referenced by: .cursorrules
│   └── Referenced by: AI-CONFIGURATION.md
│
├── CLAUDE.md (Quick Reference)
│   └── Points to: AGENTS.md
│
├── .cursorrules (Cursor IDE)
│   └── Points to: AGENTS.md
│
├── AI-CONFIGURATION.md (System Explanation)
│   └── Explains: All AI files
│
├── AI-QUICK-REFERENCE.md (Cheat Sheet)
│   └── Summarizes: Key rules from all files
│
└── AI-FILES-INDEX.md (This File)
    └── Indexes: All AI configuration files

Folder Level (Specific Context)
│
├── backend/AGENTS.md
│   ├── Extends: Root AGENTS.md
│   └── Focus: Backend (NestJS) patterns
│
├── frontend/AGENTS.md
│   ├── Extends: Root AGENTS.md
│   └── Focus: Frontend (Next.js) patterns
│
└── docs/AGENTS.md
    ├── Extends: Root AGENTS.md
    └── Focus: Documentation standards
```

## 📏 File Sizes & Reading Time

| File | Approx. Lines | Reading Time | Priority |
|------|---------------|--------------|----------|
| `AGENTS.md` | ~500 | 10 min | ⭐⭐⭐ High |
| `backend/AGENTS.md` | ~800 | 15 min | ⭐⭐⭐ High (if backend) |
| `frontend/AGENTS.md` | ~800 | 15 min | ⭐⭐⭐ High (if frontend) |
| `docs/AGENTS.md` | ~600 | 12 min | ⭐⭐⭐ High (if docs) |
| `AI-QUICK-REFERENCE.md` | ~300 | 5 min | ⭐⭐ Medium |
| `CLAUDE.md` | ~50 | 1 min | ⭐ Low |
| `.cursorrules` | ~100 | 2 min | ⭐ Low |
| `AI-CONFIGURATION.md` | ~400 | 8 min | ⭐ Low |

## 🔍 Finding the Right File

### By Question Type

**"How do I structure a NestJS service?"**
→ `backend/AGENTS.md` (Backend Patterns section)

**"How do I create a Next.js component?"**
→ `frontend/AGENTS.md` (Component Patterns section)

**"How do I document database design?"**
→ `docs/AGENTS.md` (Database Design Guidelines section)

**"What are the critical rules?"**
→ `AI-QUICK-REFERENCE.md` or `.cursorrules`

**"What tech stack is used?"**
→ `AGENTS.md` (Project Overview section)

**"How do I write tests?"**
→ `backend/AGENTS.md` or `frontend/AGENTS.md` (Testing Patterns section)

**"What are the file naming conventions?"**
→ `AGENTS.md` (File Naming Conventions section)

**"How does authentication work?"**
→ `AGENTS.md` (Authentication Integration section)

### By Task Type

**Starting new feature:**
1. `docs/project-requirements/` (Check requirements)
2. Folder-specific `AGENTS.md` (Check patterns)
3. `AI-QUICK-REFERENCE.md` (Quick checks)

**Fixing a bug:**
1. Folder-specific `AGENTS.md` (Understand patterns)
2. `AI-QUICK-REFERENCE.md` (Common issues)

**Refactoring code:**
1. `AGENTS.md` (Code quality standards)
2. Folder-specific `AGENTS.md` (Specific patterns)

**Writing documentation:**
1. `docs/AGENTS.md` (Documentation standards)
2. `AGENTS.md` (Documentation Standards section)

**Setting up project:**
1. `AGENTS.md` (Project Overview)
2. `BACKEND-SETUP.md` or `FRONTEND-SETUP.md`

## 📦 What Each File Contains

### `AGENTS.md` (Root)
- ✅ Project overview
- ✅ Critical rules
- ✅ Tech stack
- ✅ File naming conventions
- ✅ Code style guidelines
- ✅ Security guidelines
- ✅ Testing guidelines
- ✅ Git workflow
- ✅ Common issues

### `backend/AGENTS.md`
- ✅ NestJS patterns
- ✅ TypeORM entities
- ✅ Better Auth integration
- ✅ API design (REST + GraphQL)
- ✅ Database migrations
- ✅ Caching strategies
- ✅ Background jobs
- ✅ Testing patterns

### `frontend/AGENTS.md`
- ✅ Next.js App Router
- ✅ Server vs Client components
- ✅ Better Auth client
- ✅ Tailwind CSS styling
- ✅ Form validation (Zod)
- ✅ Internationalization
- ✅ Performance optimization
- ✅ Accessibility

### `docs/AGENTS.md`
- ✅ Documentation structure
- ✅ Requirements standards
- ✅ Database design guidelines
- ✅ API specification format
- ✅ Design system documentation
- ✅ ER diagram conventions
- ✅ Quality checklist

### `AI-QUICK-REFERENCE.md`
- ✅ Critical rules summary
- ✅ File structure overview
- ✅ Tech stack at a glance
- ✅ Quick checks checklist
- ✅ Code style examples
- ✅ Common issues solutions

### `AI-CONFIGURATION.md`
- ✅ Configuration system explanation
- ✅ File purposes
- ✅ When to read each file
- ✅ Configuration philosophy
- ✅ Keeping configs updated

### `CLAUDE.md`
- ✅ Quick overview
- ✅ Most important rules
- ✅ Pointers to comprehensive docs

### `.cursorrules`
- ✅ Brief project overview
- ✅ Critical rules
- ✅ Pointers to detailed docs

### `.aidigestignore`
- ✅ Files to ignore
- ✅ Directories to skip
- ✅ Patterns to exclude

## 🔄 Update Frequency

| File | Update When |
|------|-------------|
| `AGENTS.md` | New patterns, tech changes, conventions |
| `backend/AGENTS.md` | Backend patterns change |
| `frontend/AGENTS.md` | Frontend patterns change |
| `docs/AGENTS.md` | Documentation standards change |
| `AI-QUICK-REFERENCE.md` | Critical rules change |
| `.cursorrules` | Major project changes |
| `CLAUDE.md` | Critical rules change |
| `AI-CONFIGURATION.md` | System structure changes |
| `.aidigestignore` | New ignore patterns needed |

## ✅ Validation Checklist

When updating AI configuration files:
- [ ] Changes are consistent across related files
- [ ] No contradictions introduced
- [ ] Examples are accurate and tested
- [ ] Links between files are valid
- [ ] Tested with AI agents
- [ ] Documentation is clear and specific
- [ ] Index updated (this file)

## 🎯 Success Metrics

Configuration is working well when:
- ✅ AI agents follow conventions consistently
- ✅ Code quality is maintained
- ✅ Patterns are consistent across codebase
- ✅ New features follow existing patterns
- ✅ Documentation stays updated
- ✅ No confusion about rules or conventions

## 📞 Support

### For AI Agents
1. Start with `AGENTS.md` (root)
2. Read folder-specific `AGENTS.md`
3. Use `AI-QUICK-REFERENCE.md` for quick lookups
4. Check `docs/project-requirements/` for feature requirements

### For Developers
1. Follow guidelines in `AGENTS.md` files
2. Update configuration when patterns change
3. Keep files consistent
4. Test with AI agents after updates

### For Maintainers
1. Review all `AGENTS.md` files regularly
2. Ensure consistency across files
3. Update based on codebase evolution
4. Test with multiple AI tools

## 🔗 Related Documentation

- `README.md` - Project overview
- `docs/GETTING-STARTED.md` - Getting started guide
- `docs/PROMPTS.md` - AI prompts for development
- `INTEGRATION-GUIDE.md` - Frontend-backend integration
- `BACKEND-SETUP.md` - Backend setup
- `FRONTEND-SETUP.md` - Frontend setup

---

**Quick Tip**: Bookmark this file for easy navigation to the right AI configuration file!

