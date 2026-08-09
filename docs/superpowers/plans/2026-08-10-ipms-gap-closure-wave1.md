# IPMS Gap Closure Wave 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the highest-priority IPMS gaps from the 10 Aug 2026 audit: probation confirm/extend employment side-effects + letter draft intent, goal weight sum validation, peer-status stall fix, minimal dispute flow, and Hub/UX polish.

**Architecture:** Extend existing `talent` module with pure utils + service hooks. Probation confirm/extend updates `workers.probationEndDate` and attempts a draft letter via `DocumentService` when a published template with code `probation_confirmation` / `probation_extension` exists; otherwise records `outcomeLetterStatus=pending_template`. Peer feedback remains optional and does not block the appraisal path (v1 manager-led). Goal weights: reject sum > 100; expose completeness on dashboard; UI shows running total.

**Tech Stack:** NestJS 10, TypeORM, Jest; Next.js 16, Vitest; English-only `en.json`.

## Global Constraints

- API `/api/v1/`, envelope `{ data, meta, errors }`
- Every mutation → `audit_log`
- Row scope via existing talent helpers
- English only — `frontend/src/locales/en.json` only
- Lucide icons only; no country hard-coding
- Conventional Commits: `feat(talent): …`, `test(talent): …`, `feat(frontend): …`
- TDD: failing test before production code

## File map

| File | Change |
|---|---|
| `backend/src/modules/talent/goal-weight.util.ts` | Create — sum / assert helpers |
| `backend/src/modules/talent/__tests__/goal-weight.util.spec.ts` | Create |
| `backend/src/modules/talent/probation-outcome.util.ts` | Create — confirm/extend date logic |
| `backend/src/modules/talent/__tests__/probation-outcome.util.spec.ts` | Create |
| `backend/src/modules/talent/entities/performance-review.entity.ts` | Add letter + dispute columns |
| `backend/src/database/migrations/1783040900000-IpmsGapClosureWave1.ts` | Migration |
| `backend/src/modules/talent/dto/talent.dto.ts` | Extension days, dispute DTOs |
| `backend/src/modules/talent/talent.service.ts` | Wire weight, probation effects, dispute, peer skip |
| `backend/src/modules/talent/talent.controller.ts` | Dispute endpoint |
| `backend/src/modules/talent/__tests__/talent-probation-calibration.spec.ts` | Extend |
| `frontend/src/libs/performance/goal-weights.ts` | Client sum helper |
| `frontend/src/libs/performance/goal-weights.test.ts` | Vitest |
| `frontend/src/components/performance/PerformanceDashboardView.tsx` | Weight total UX + feedback feed + create IDP |
| `frontend/src/components/performance/ManagerPerformanceBoard.tsx` | Extension days + confirm messaging |
| `frontend/src/libs/performance/performance-query.ts` | Parse `meetingId` |
| `frontend/src/locales/en.json` | Copy |
| `docs/project-requirements/prd.md` | Tick closed gaps in §6.14.8 |

---

## Task 1: Goal weight util

**Files:** create `goal-weight.util.ts` + spec

- [ ] **Step 1: Write failing tests** for `sumActiveGoalWeights`, `assertGoalWeightsDoNotExceed100` (throws when >100), `isGoalWeightTotalComplete` (===100)

- [ ] **Step 2: Run** `cd backend && pnpm exec jest src/modules/talent/__tests__/goal-weight.util.spec.ts --no-cache` — expect FAIL

- [ ] **Step 3: Implement util**

- [ ] **Step 4: Run** — expect PASS

- [ ] **Step 5: Wire** into `createGoal` / `updateGoal` (load sibling active goals; assert; include soft-deleted exclusion)

---

## Task 2: Probation confirm/extend side-effects

**Files:** create `probation-outcome.util.ts` + spec; modify service + DTO + review entity + migration

Rules:
- `confirm` → set `worker.probationEndDate = null` (confirmed through)
- `extend` → require `probationExtensionDays` (1–365, default 90); new end = max(today, currentEnd) + days
- Attempt letter: lookup published template by code; if found, `DocumentService.generate` draft; set `outcomeLetterDocumentId` + `outcomeLetterStatus=drafted`; else `pending_template`
- Audit `review.probation_confirm` / `review.probation_extend`
- Call from `submitManagerReview` when cycleType=probation and outcome set

- [ ] **Step 1: Failing util tests** (confirm clears; extend adds days from later of today/current)

- [ ] **Step 2: Implement util + migration columns** (`outcome_letter_status`, `outcome_letter_document_id`, `dispute_reason`, `disputed_at`, `disputed_by_user_id`)

- [ ] **Step 3: Service wiring + extend DTO field**

- [ ] **Step 4: Service tests** for confirm clears date; extend updates date; terminate unchanged

- [ ] **Step 5: Manager UI** — extension days input when extend selected; toast that letter draft queued / pending template

---

## Task 3: Peer stall fix (v1)

In `submitManagerReview` status advance: **skip** `PENDING_PEER` even if `peerFeedbackEnabled` (peer rows remain writable asynchronously). Next status = calibration if enabled else sign-off.

- [ ] **Step 1: Failing test** — peer enabled → status is pending_calibration or pending_sign_off, not pending_peer

- [ ] **Step 2: Change status branch**

- [ ] **Step 3: Pass**

---

## Task 4: Minimal dispute flow

- [ ] **Step 1: DTO** `DisputeReviewDto { reason: string }`

- [ ] **Step 2: Endpoint** `POST /reviews/:id/dispute` — employee (own review) or manager; status → `disputed`; store reason

- [ ] **Step 3: Endpoint** `POST /reviews/:id/resolve-dispute` — People Ops only; status → `pending_sign_off` or body `returnStatus`

- [ ] **Step 4: Tests + employee/manager UI button**

---

## Task 5: Hub / UX polish

- [ ] Parse `meetingId` in `performance-query.ts`; highlight matching 1:1
- [ ] Feedback list (not count-only) on employee dash
- [ ] Create development plan dialog (calls existing API)
- [ ] Goal weight running total in add/edit goal dialog

---

## Task 6: Docs

- [ ] Update PRD §6.14.8 — mark closed items
- [ ] Bump coverage note if appropriate (~80%)

## Verification

```bash
cd backend && pnpm exec jest src/modules/talent/__tests__/goal-weight.util.spec.ts src/modules/talent/__tests__/probation-outcome.util.spec.ts src/modules/talent/__tests__/talent-probation-calibration.spec.ts --no-cache
cd frontend && pnpm exec vitest run src/libs/performance/
```
