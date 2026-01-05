# Project Requirements Documentation

This folder contains the **core requirements** for your project. These documents are essential for **all project types** - whether you're building a website, API, or fullstack application.

## 📋 What Goes Here

All the fundamental requirements that define what you're building:

1. **Product Brief** - High-level overview
2. **SRS** - Detailed software requirements
3. **Database Design** - Data model and schema (if needed)
4. **API Specification** - API contracts (if needed)
5. **System Architecture** - Technical architecture
6. **User Stories** - User stories with acceptance criteria

## 🎯 When to Use Each Document

### For ALL Projects:

- ✅ **product-brief.md** - Always start here
- ✅ **srs.md** - Define functional & non-functional requirements
- ✅ **system-architecture.md** - Document technical decisions
- ✅ **user-stories.md** - Define user requirements

### For Projects with a Database:

- ✅ **database-design.md** - ER diagrams, schema, normalization

### For Projects with an API:

- ✅ **api-specification.md** - Endpoints, contracts, authentication

## 📝 How to Fill These Out

### 1. Start with Product Brief (30-60 minutes)

Define the basics:
- What are you building?
- Who is it for?
- What problem does it solve?
- What are the key features?
- What are your success metrics?

### 2. Create SRS (2-4 hours)

Document detailed requirements:
- **Functional Requirements**: What the system must do
- **Non-Functional Requirements**: Performance, security, scalability
- **User Requirements**: User roles, permissions, workflows
- **System Requirements**: Dependencies, constraints

### 3. Design Database (2-3 hours) - If Applicable

Create data model:
- Draw ER diagrams (use Mermaid or tools like dbdiagram.io)
- Define tables, columns, data types
- Specify relationships (1:1, 1:N, N:M)
- Normalize to 3NF or BCNF
- Add indexes for performance
- Define constraints

### 4. Specify APIs (2-3 hours) - If Applicable

Document all endpoints:
- List all API endpoints (method + path)
- Define request/response formats
- Specify authentication methods
- Document error responses
- Include example requests/responses

### 5. Document Architecture (1-2 hours)

Define technical approach:
- Create architecture diagrams
- Choose technology stack
- Document design patterns
- Plan deployment strategy
- Define security approach
- Plan for scalability

### 6. Write User Stories (1-2 hours)

Define user requirements:
- Write user stories (As a [role], I want [feature] so that [benefit])
- Add acceptance criteria (Given/When/Then)
- Prioritize (Must-have, Should-have, Nice-to-have)
- Estimate effort

## ⚡ Quick Start

### For a Simple Website (No Backend):
1. Fill out: `product-brief.md`
2. Fill out: `srs.md` (focus on functional requirements)
3. Fill out: `user-stories.md`
4. Skip: `database-design.md`, `api-specification.md`
5. Go to: `../design-specs/` folder

### For a Backend API:
1. Fill out: `product-brief.md`
2. Fill out: `srs.md`
3. Fill out: `database-design.md` (ER diagrams!)
4. Fill out: `api-specification.md` (all endpoints!)
5. Fill out: `system-architecture.md`
6. Fill out: `user-stories.md`
7. Skip: `../design-specs/` folder

### For a Fullstack Application:
1. Fill out: ALL files in this folder
2. Then fill out: `../design-specs/` folder

## 🎨 Best Practices

### Be Specific
- ❌ "The system should be fast"
- ✅ "API response time should be < 200ms for 95% of requests"

### Use Diagrams
- ER diagrams for database
- Architecture diagrams for system
- Flowcharts for complex logic

### Include Examples
- Sample API requests/responses
- Example data
- Test cases

### Think About Scale
- How many users?
- How much data?
- What are the bottlenecks?

### Document Constraints
- Technical limitations
- Business rules
- Security requirements
- Compliance needs

### Define Data Types Precisely
- ❌ "name field"
- ✅ "name VARCHAR(255) NOT NULL"

### Normalize Your Database
- Avoid data redundancy
- Ensure referential integrity
- Achieve 3NF minimum
- Document any denormalization decisions

## 🔗 What Happens Next?

After you complete these requirements:

1. **AI Generates Documentation** (30-60 minutes):
   - Technical documentation
   - Database schema SQL
   - API contracts (OpenAPI/Swagger)
   - Build checklist

2. **Implementation Begins** (20-60 hours):
   - AI generates code from your specs
   - You review and refine
   - Test against acceptance criteria

## 💡 Key Principle

**The quality of your requirements determines the quality of your implementation.**

Invest 4-10 hours in thorough requirements documentation and you'll get:
- ✅ Clear scope
- ✅ Proper database design
- ✅ Well-defined APIs
- ✅ Consistent implementation
- ✅ Fewer bugs
- ✅ Easier maintenance

Skip requirements and you'll face:
- ❌ Scope creep
- ❌ Database design issues
- ❌ Inconsistent APIs
- ❌ Technical debt
- ❌ Costly refactoring

## 📚 Resources

- **Database Design**: [dbdiagram.io](https://dbdiagram.io) - Free ER diagram tool
- **API Design**: [Swagger Editor](https://editor.swagger.io) - OpenAPI editor
- **Architecture**: [C4 Model](https://c4model.com) - Architecture diagrams
- **Normalization**: [Database Normalization Guide](https://en.wikipedia.org/wiki/Database_normalization)

---

**Ready to start?** Begin with `product-brief.md` and work your way through each document.

