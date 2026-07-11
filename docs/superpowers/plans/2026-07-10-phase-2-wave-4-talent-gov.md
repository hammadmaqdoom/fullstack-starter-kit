# Phase 2 Wave 4 — FX, Talent Gaps, Enterprise Governance

> Subagent-driven. Design: `docs/superpowers/specs/2026-07-10-phase-2-design.md`

**Goal:** Close remaining Phase 2 tasks.md items: FX UI, talent gaps, T2 governance, DSAR/access review.

### Task 1: FX management UI + variance alerts
- Extend country-config FX APIs if needed (override/approve)
- Frontend finance/fx page
- Commit: `feat(country-config): FX management UI and variance alerts`

### Task 2: Talent gaps
- Recruitment: job_requisitions, candidates, interview_scorecards + API + People Ops UI
- Training: courses, assignments, completions
- Manpower: plans, positions
- IPMS: probation BullMQ T-14, calibration board UI, pulse respondent UI
- Commit(s) as needed

### Task 3: Enterprise governance (2.0)
- HRBP role + country/legal_entity scope
- Approval routing config
- Bulk worker CSV import (BullMQ)
- Access review module
- Leadership analytics endpoints (headcount, attrition, leave liability, visa)
- Onboarding template routing by location (config)
- Commit(s)

### Task 4: Quality gate APIs
- DSAR export API
- Access review export
- Update tasks.md

### Task 5: Remaining thin items
- Invoice OCR stub endpoint (already have ocrPrefill field pattern)
- Payment advice PDF
- Payroll reports register/deductions/variance
- Benefit seed packs PK/UAE/SG enrichment
