# Letterhead Admin UX — Design Modes, Uploads & Collapsed Cards

**Date:** 2026-08-09  
**Status:** Approved — plan ready  
**Plan:** [../plans/2026-08-09-letterhead-admin-ux.md](../plans/2026-08-09-letterhead-admin-ux.md)  
**Product:** Polaris (Digitaro HRMS)  
**Screen:** People Ops → Letterheads (`/people-ops/letterheads`)  
**Related:** PRD §6.8.1, US-DOC-005, `letterhead_configs`, `document-pdf.builder.ts`

## Problem

The Letterheads admin list shows legal-entity cards always expanded with stamp/render settings, but the **create/edit letterhead layout** (margins, logo, design) is buried behind **+ Publish new version**. Users cannot see:

1. How to create or edit a letterhead without discovering the dialog
2. Top/bottom content offsets so PDF body does not overlap letterhead artwork
3. A way to attach letterhead design imagery (logo or full-page background) via upload

Today `logoBlobUrl` is a free-text URL field; PDF builder draws text headers only (no logo embed, no background image).

## Goals

1. Legal-entity cards **collapsed by default**, with **Edit letterhead** and **Publish new version** always visible on the header.
2. Expand reveals Document Output Settings only (wet stamp, stamp instructions, default render profile).
3. Each letterhead version picks exactly one **design mode**: `logo_text` or `background`.
4. Real **file upload** (PNG/JPG/WebP ≤ 5 MB) to blob storage for logo or background.
5. PDF body respects configured margins / content offsets so content never overlaps header/footer zones or background artwork.
6. Keep immutable versioning: save always creates a new `letterhead_configs` version; issued docs keep their snapshot.

## Non-goals

- Visual canvas / drag-drop letterhead designer
- Editing an existing version in place (violates PRD §6.8.1 snapshot rule)
- QES / wet-scan pipeline changes
- Changing print-on-physical-stock semantics beyond using existing physical-stock margins
- Multi-page background tiling or per-page different backgrounds
- Auto-generating preview PDFs in this wave (column `preview_blob_url` may remain unused)

## Decisions (locked)

| Topic | Decision |
|---|---|
| Card default | Collapsed; Edit + Publish always on header |
| Approach | Versioned design modes + blob upload (Approach 2) |
| Design modes | Mutually exclusive per version: `logo_text` **or** `background` |
| Edit vs Publish | Same dialog; both publish a **new** version (Edit pre-fills current) |
| Logo today | Replace URL text field with file upload |
| Background | Full-page A4 artwork upload + content margins |
| PDF profiles | Background/logo only on `full_digital` / `informational`; `print_on_letterhead` omits digital artwork and uses physical-stock margins |

---

## 1. List page UX

### Collapsed header (always visible)

Per legal entity:

| Element | Behaviour |
|---|---|
| Name + country tag + code | As today |
| Version summary | “Version N · effective YYYY-MM-DD” or “No letterhead published yet” |
| Mode chip (if current exists) | `Logo + text` or `Background` |
| **Edit letterhead** | Visible when a current version exists; opens dialog pre-filled from current layout + assets |
| **Publish new version** | Always visible; opens dialog (pre-filled from current if any, else defaults) |
| Chevron / row click | Toggles expand of Document Output Settings only |

### Expanded body

- Document Output Settings (requires wet stamp, stamp instructions, default render profile, Save settings)
- Unchanged API: `PATCH` legal-entity document output

### Empty / error / offline

- Keep existing EmptyState, error + retry, OfflineBanner patterns

---

## 2. Design modes

Stored on `layout_json.designMode`: `"logo_text" | "background"`.

### Mode A — `logo_text`

- Upload **logo** image → stored as `logo_blob_url` on the version
- Header toggles: registered name, trading name, address
- Footer: page numbers, custom text
- Page margins: top / bottom / left / right (mm) — body starts below header block and logo
- Optional: logo position + max height (keep existing `layout_json.logo` shape)

### Mode B — `background`

- Upload **full-page background** (A4-oriented artwork) → stored as `background_blob_url` (new column)
- Content margins: top / bottom / left / right (mm) — PDF body draws **only** inside this inset so it does not overlap header/footer art on the background
- Header text toggles **hidden** in UI for this mode (artwork owns branding)
- Footer page numbers / custom text still configurable (drawn in content zone or footer zone without covering critical art — use bottom margin)
- `logo_blob_url` unused for this version (null)

### Mode switch in dialog

- Segmented control / radio at top of dialog
- Switching mode clears the non-applicable asset from the draft (warn if discarding an uploaded file in the current draft)

---

## 3. Dialog: Edit / Publish version

### Shared behaviour

- Title: “Edit letterhead — {entity}” or “Publish new version — {entity}”
- Info banner: “Saving creates a new version. Already-issued documents keep the previous letterhead.”
- Fields depend on `designMode`
- Physical stock section remains (enable + content top/bottom mm + print watermark) — applies to `print_on_letterhead` exports
- Primary CTA: **Publish**
- Cancel closes without saving

### Validation

| Rule | Detail |
|---|---|
| `logo_text` | Logo file required on first publish for entity **or** allow publish without logo (text-only). **Decision:** logo optional; at least one of logo or showRegisteredName must be true |
| `background` | Background file **required** |
| Margins | All ≥ 0; top+bottom < page height; left+right < page width (sensible max e.g. 80 mm) |
| File | MIME `image/png`, `image/jpeg`, `image/webp`; max 5 MB |

---

## 4. Data model

### `letterhead_configs` changes

| Column | Change |
|---|---|
| `logo_blob_url` | Keep — used when `designMode = logo_text` |
| `background_blob_url` | **Add** `VARCHAR(500) NULL` — used when `designMode = background` |
| `layout_json` | Add `designMode`; margins apply in both modes; header/logo fields meaningful for `logo_text` only |

### Example `layout_json`

```json
{
  "designMode": "background",
  "margins": { "top": 45, "bottom": 35, "left": 20, "right": 20 },
  "footer": { "showPageNumbers": true, "customText": "" },
  "physicalStock": {
    "enabled": true,
    "contentTopMarginMm": 45,
    "contentBottomMarginMm": 30,
    "showPrintWatermark": false
  }
}
```

```json
{
  "designMode": "logo_text",
  "logo": { "position": "top_left", "maxHeightPx": 60 },
  "header": { "showRegisteredName": true, "showTradingName": true, "showAddress": true },
  "footer": { "showPageNumbers": true, "customText": "Confidential" },
  "margins": { "top": 25, "bottom": 20, "left": 20, "right": 20 },
  "physicalStock": { "enabled": false }
}
```

### Backward compatibility

- Existing configs without `designMode` → treat as `logo_text`
- Existing `logo_blob_url` URLs continue to work
- No backfill required for `background_blob_url`

---

## 5. API

### Existing

- `GET /api/v1/letterhead-configs`
- `POST /api/v1/letterhead-configs` — create version (extend DTO)

### New

- `POST /api/v1/letterhead-configs/assets` — multipart upload  
  - Fields: `file`, `kind` (`logo` \| `background`), `legalEntityId`  
  - Returns `{ data: { blobUrl, kind, contentType, sizeBytes } }`  
  - Auth: People Ops / Super Admin (same as letterhead admin)  
  - Stores under folder `letterheads/{tenantId}/{legalEntityId}/` via `DocumentBlobStorageService`

### `CreateLetterheadConfigDto` extensions

- `layout.designMode` required (or default `logo_text`)
- `logoBlobUrl` optional
- `backgroundBlobUrl` optional
- Server validates mode ↔ asset consistency

### Audit

- Keep `letterhead_config.create` on publish
- Add `letterhead_config.asset_upload` (or include blob URL in create audit `changes`) — prefer include on create to avoid noise

---

## 6. PDF rendering

Extend `buildDocumentPdf` / `DocumentPdfService`:

### `full_digital` / `informational`

| Mode | Behaviour |
|---|---|
| `logo_text` | Embed logo image (if URL resolvable), then text header as today; body below using `margins.top` (after measuring header+logo height, or fixed margin — **prefer fixed margins from config so People Ops can calibrate**) |
| `background` | Embed background image scaled to full page on every page; body drawn inside `margins`; do **not** draw registered-name header block |

### `print_on_letterhead`

- No logo, no background, no digital header (unchanged PRD §6.8.5)
- Body uses `physicalStock.contentTopMarginMm` / `contentBottomMarginMm`
- Footer doc number as today

### Asset fetch

- PDF builder/service fetches image bytes from blob URL (S3 public URL or local storage URL) at render time
- Failure: fail issue/export with clear error (do not silently omit background in `background` mode)

---

## 7. Frontend structure

- Keep page at `frontend/src/app/[locale]/(auth)/people-ops/letterheads/page.tsx` or extract `LetterheadEntityCard` + `LetterheadVersionDialog` under `components/documents/` if the page exceeds ~300 lines
- API helpers in `libs/api/documents.ts`: `uploadLetterheadAsset`, extend `LetterheadLayout` / `createLetterheadConfig`
- Strings in `locales/en.json` → `LetterheadAdmin.*` only
- PrimeReact: Dialog, InputNumber, InputSwitch, Dropdown, FileUpload (or native input + Button)
- Lucide icons only

---

## 8. Acceptance criteria

1. Opening Letterheads shows all entity cards **collapsed**; Edit (if version exists) and Publish are visible without expanding.
2. Expanding a card shows only Document Output Settings; collapsing hides them.
3. Publishing with mode `logo_text` + logo upload stores blob URL and renders logo on next `full_digital` issue.
4. Publishing with mode `background` + background upload + top/bottom margins places PDF body below/above those offsets with no overlap on the artwork.
5. `print_on_letterhead` export ignores digital artwork and uses physical-stock margins.
6. Saving always increments version; prior issued document still references old `letterhead_config_id`.
7. Invalid file type/size rejected with user-visible error.
8. Offline: Publish/upload disabled or Offline banner shown (match existing Offline pattern).

---

## 9. Out of scope follow-ups

- Live PDF preview pane in the dialog
- Cropping / DPI guidance UI
- Migrating legal_entities.logo_blob_url into letterhead versions automatically

---

## References

- `docs/project-requirements/database-design.md` — `letterhead_configs`
- `docs/project-requirements/user-stories.md` — US-DOC-005
- `backend/src/modules/documents/document-pdf.builder.ts`
- `frontend/src/app/[locale]/(auth)/people-ops/letterheads/page.tsx`
