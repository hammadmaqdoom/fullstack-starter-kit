# Phase 2 Wave 3 — Expenses, Travel, Help Desk

> Subagent-driven. Design: `docs/superpowers/specs/2026-07-10-phase-2-design.md`

**Goal:** FLW-OPS-001/002/003 — expenses, travel, help desk + Hub + employee UI.

### Task 1: Expense claims
- Entities expense_claims, expense_claim_lines, expense_policies
- Migration, service, controller, Hub, audit
- States: draft→submitted→approved→rejected→paid
- Policy limits by category/country (config table, not hard-coded)
- Commit: `feat(operations): expense claims with policy limits`

### Task 2: Travel requests
- travel_requests, travel_itineraries
- Manager → Finance threshold → People Ops international
- Link expenses to travel
- Commit: `feat(operations): travel requests and itineraries`

### Task 3: Help desk
- help_desk_tickets, ticket_comments
- Queues HR/IT/Admin/Finance + SLA targets + breach flag
- Commit: `feat(operations): help desk tickets with SLA`

### Task 4: Frontend
- employee/expenses, employee/travel, employee/help
- Hub already aggregates types
- en.json only
- Commit: `feat(employee): expenses travel and help desk UI`

### Task 5: tasks.md checkoff Wave 3
