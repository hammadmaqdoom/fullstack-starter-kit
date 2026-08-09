# Letterhead Admin UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make letterhead create/edit obvious on collapsed legal-entity cards, support mutually exclusive `logo_text` vs `background` design modes with real image uploads, and render PDFs with margins that prevent body overlap.

**Architecture:** Keep versioned `letterhead_configs` (immutable publish). Extend `layoutJson.designMode`, add `backgroundBlobUrl`, and a multipart asset upload endpoint. PDF builder embeds logo or full-page background for digital profiles only; `print_on_letterhead` stays text-only with physical-stock margins. Frontend cards collapse by default with Edit + Publish always visible.

**Tech Stack:** NestJS 10, TypeORM migrations, `@nest-lab/fastify-multer`, `pdf-lib`, `DocumentBlobStorageService`, Next.js 16, PrimeReact, next-intl (`en.json` only), Jest + Vitest.

**Spec:** `docs/superpowers/specs/2026-08-09-letterhead-admin-ux-design.md`

## Global Constraints

- API base `/api/v1/`, envelope `{ data, meta, errors }`
- Every mutation writes `audit_log`
- English only — edit `frontend/src/locales/en.json` only; do not edit `ar.json` / `fr.json`
- Lucide icons only; no emoji
- No country hard-coding
- Letterhead edits always create a **new version** (PRD §6.8.1); never UPDATE layout in place
- Conventional Commits: `feat(documents): …`, `test(documents): …`, `feat(frontend): …`

---

## File map

### Backend create

| File | Responsibility |
|---|---|
| `backend/src/database/migrations/1783040600000-AddLetterheadBackgroundBlobUrl.ts` | Add `backgroundBlobUrl` column |
| `backend/src/modules/documents/dto/upload-letterhead-asset.dto.ts` | `kind` + `legalEntityId` validation for upload |

### Backend modify

| File | Change |
|---|---|
| `backend/src/modules/documents/entities/letterhead-config.entity.ts` | `backgroundBlobUrl`; `designMode` on `LetterheadLayoutJson` |
| `backend/src/modules/documents/dto/letterhead-config.dto.ts` | `designMode`, `backgroundBlobUrl`, mode validation |
| `backend/src/modules/documents/letterhead-config.service.ts` | `uploadAsset`, create with background + mode checks |
| `backend/src/modules/documents/letterhead-config.controller.ts` | `POST …/assets` multipart |
| `backend/src/modules/documents/document-pdf.builder.ts` | Embed logo/background; treat digital margins as mm |
| `backend/src/modules/documents/document-pdf.service.ts` | Fetch image bytes; pass into builder |
| `backend/src/modules/documents/__tests__/letterhead-config.service.spec.ts` | Upload + create mode tests |
| `backend/src/modules/documents/__tests__/document-pdf.builder.spec.ts` | Background/logo + margin tests |
| `docs/project-requirements/database-design.md` | Document `background_blob_url` + `designMode` (brief) |

### Frontend create

| File | Responsibility |
|---|---|
| `frontend/src/components/documents/LetterheadEntityCard.tsx` | Collapsed card + expand + actions |
| `frontend/src/components/documents/LetterheadVersionDialog.tsx` | Mode switch, uploads, margins, publish |

### Frontend modify

| File | Change |
|---|---|
| `frontend/src/libs/api/client.ts` | Support `FormData` bodies (no forced JSON Content-Type) |
| `frontend/src/libs/api/documents.ts` | Types + `uploadLetterheadAsset` + `backgroundBlobUrl` |
| `frontend/src/libs/api/documents.test.ts` | Cover upload helper / types if present; else add focused tests |
| `frontend/src/app/[locale]/(auth)/people-ops/letterheads/page.tsx` | Compose card + dialog; collapsed state |
| `frontend/src/locales/en.json` | New `LetterheadAdmin` keys |

---

### Task 1: Migration + entity — `backgroundBlobUrl` and `designMode`

**Files:**
- Create: `backend/src/database/migrations/1783040600000-AddLetterheadBackgroundBlobUrl.ts`
- Modify: `backend/src/modules/documents/entities/letterhead-config.entity.ts`
- Modify: `docs/project-requirements/database-design.md` (`letterhead_configs` table section)

**Interfaces:**
- Produces: `LetterheadConfigEntity.backgroundBlobUrl: string | null`
- Produces: `LetterheadLayoutJson.designMode?: 'logo_text' | 'background'`

- [ ] **Step 1: Add migration**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLetterheadBackgroundBlobUrl1783040600000
  implements MigrationInterface
{
  name = 'AddLetterheadBackgroundBlobUrl1783040600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "letterhead_configs"
        ADD COLUMN "backgroundBlobUrl" varchar(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "letterhead_configs"
        DROP COLUMN "backgroundBlobUrl"
    `);
  }
}
```

- [ ] **Step 2: Update entity**

In `LetterheadLayoutJson` add:

```typescript
designMode?: 'logo_text' | 'background';
```

On `LetterheadConfigEntity` add after `logoBlobUrl`:

```typescript
@Column({ type: 'varchar', length: 500, nullable: true })
backgroundBlobUrl: string | null;
```

- [ ] **Step 3: Document in database-design.md**

Under `letterhead_configs`, add row `background_blob_url | VARCHAR(500) | Full-page artwork when designMode=background` and note `layout_json.designMode`: `logo_text` | `background` (default `logo_text` when absent).

- [ ] **Step 4: Commit**

```bash
git add backend/src/database/migrations/1783040600000-AddLetterheadBackgroundBlobUrl.ts \
  backend/src/modules/documents/entities/letterhead-config.entity.ts \
  docs/project-requirements/database-design.md
git commit -m "$(cat <<'EOF'
feat(documents): add letterhead backgroundBlobUrl and designMode

EOF
)"
```

---

### Task 2: Create DTO — design mode + background URL validation

**Files:**
- Modify: `backend/src/modules/documents/dto/letterhead-config.dto.ts`
- Test: extend create validation via service tests in Task 3 (DTO exercised there)

**Interfaces:**
- Produces: `LetterheadLayoutDto.designMode?: 'logo_text' | 'background'`
- Produces: `CreateLetterheadConfigDto.backgroundBlobUrl?: string`

- [ ] **Step 1: Extend layout + create DTOs**

Add to `LetterheadLayoutDto`:

```typescript
@ApiPropertyOptional({ enum: ['logo_text', 'background'] })
@IsOptional()
@IsIn(['logo_text', 'background'])
designMode?: 'logo_text' | 'background';
```

(Import `IsIn` from `class-validator`.)

Add to `CreateLetterheadConfigDto`:

```typescript
@ApiPropertyOptional({
  description: 'Full-page background artwork URL when designMode=background',
})
@IsOptional()
@IsString()
@MaxLength(500)
backgroundBlobUrl?: string;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/documents/dto/letterhead-config.dto.ts
git commit -m "$(cat <<'EOF'
feat(documents): accept designMode and backgroundBlobUrl on letterhead create

EOF
)"
```

---

### Task 3: Service — mode validation on create + asset upload

**Files:**
- Create: `backend/src/modules/documents/dto/upload-letterhead-asset.dto.ts`
- Modify: `backend/src/modules/documents/letterhead-config.service.ts`
- Modify: `backend/src/modules/documents/letterhead-config.controller.ts`
- Modify: `backend/src/modules/documents/documents.module.ts` (ensure `DocumentBlobStorageService` injectable into letterhead service if not already)
- Test: `backend/src/modules/documents/__tests__/letterhead-config.service.spec.ts`

**Interfaces:**
- Consumes: `DocumentBlobStorageService.upload(buffer, folder, filename, contentType)`
- Produces: `LetterheadConfigService.uploadAsset(legalEntityId, kind, file, actor) → { blobUrl, kind, contentType, sizeBytes }`
- Produces: `create` persists `backgroundBlobUrl` and rejects invalid mode/asset pairs

- [ ] **Step 1: Write failing tests**

Add to `letterhead-config.service.spec.ts` (mock `DocumentBlobStorageService`):

```typescript
it('rejects background mode without backgroundBlobUrl', async () => {
  // setup transaction mock same as existing create test
  await expect(
    service.create(
      {
        legalEntityId,
        layout: { designMode: 'background', margins: { top: 40, bottom: 30, left: 20, right: 20 } },
      },
      { actorId },
    ),
  ).rejects.toMatchObject({
    response: expect.objectContaining({ code: 'LETTERHEAD_BACKGROUND_REQUIRED' }),
  });
});

it('persists backgroundBlobUrl when designMode is background', async () => {
  // transaction mock returns saved entity
  const result = await service.create(
    {
      legalEntityId,
      layout: { designMode: 'background', margins: { top: 40, bottom: 30, left: 20, right: 20 } },
      backgroundBlobUrl: 'https://blob.local/bg.png',
    },
    { actorId },
  );
  expect(result.backgroundBlobUrl).toBe('https://blob.local/bg.png');
});

it('uploads a logo asset and returns blobUrl', async () => {
  blobStorage.upload.mockResolvedValue('https://blob.local/letterheads/logo.png');
  legalEntityRepository.findOne.mockResolvedValue(legalEntity);
  const file = {
    buffer: Buffer.from('fake'),
    mimetype: 'image/png',
    originalname: 'logo.png',
    size: 4,
  } as unknown as import('@nest-lab/fastify-multer').File;

  const result = await service.uploadAsset(legalEntityId, 'logo', file, { actorId });
  expect(result.blobUrl).toBe('https://blob.local/letterheads/logo.png');
  expect(result.kind).toBe('logo');
});

it('rejects non-image mime types on upload', async () => {
  const file = {
    buffer: Buffer.from('%PDF'),
    mimetype: 'application/pdf',
    originalname: 'x.pdf',
    size: 4,
  } as unknown as import('@nest-lab/fastify-multer').File;

  await expect(
    service.uploadAsset(legalEntityId, 'logo', file, { actorId }),
  ).rejects.toMatchObject({
    response: expect.objectContaining({ code: 'LETTERHEAD_ASSET_INVALID_TYPE' }),
  });
});
```

Wire `DocumentBlobStorageService` into the testing module providers.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd backend && pnpm test -- src/modules/documents/__tests__/letterhead-config.service.spec.ts
```

Expected: FAIL (missing methods / fields).

- [ ] **Step 3: Implement upload DTO + service methods**

`upload-letterhead-asset.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

export class UploadLetterheadAssetDto {
  @ApiProperty({ enum: ['logo', 'background'] })
  @IsIn(['logo', 'background'])
  kind: 'logo' | 'background';

  @ApiProperty()
  @IsUUID()
  legalEntityId: string;
}
```

In `LetterheadConfigService`:

1. Inject `DocumentBlobStorageService`.
2. In `create`, normalize `layout.designMode ??= 'logo_text'`. If `background` and no `dto.backgroundBlobUrl`, throw `BadRequestException({ code: 'LETTERHEAD_BACKGROUND_REQUIRED', message: '…' })`. If `logo_text` and neither `logoBlobUrl` nor `layout.header?.showRegisteredName !== false`, throw `LETTERHEAD_LOGO_OR_NAME_REQUIRED`. Persist `backgroundBlobUrl: dto.backgroundBlobUrl ?? null`. Clear the unused URL on the entity (`logo_text` → `backgroundBlobUrl=null`; `background` → `logoBlobUrl=null`) so versions stay consistent.
3. Add `uploadAsset`:

```typescript
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

async uploadAsset(
  legalEntityId: string,
  kind: 'logo' | 'background',
  file: File,
  actor: DocumentActor,
): Promise<{ blobUrl: string; kind: 'logo' | 'background'; contentType: string; sizeBytes: number }> {
  const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
  const legalEntity = await this.legalEntityRepository.findOne({ where: { id: legalEntityId, tenantId } });
  if (!legalEntity) {
    throw new NotFoundException({ code: 'LEGAL_ENTITY_NOT_FOUND', message: 'Legal entity not found' });
  }
  if (!file?.buffer?.length) {
    throw new BadRequestException({ code: 'LETTERHEAD_ASSET_REQUIRED', message: 'A file is required' });
  }
  if (!ALLOWED.has(file.mimetype)) {
    throw new BadRequestException({
      code: 'LETTERHEAD_ASSET_INVALID_TYPE',
      message: 'Only PNG, JPEG, or WebP images are allowed',
    });
  }
  if (file.size > MAX_BYTES) {
    throw new BadRequestException({
      code: 'LETTERHEAD_ASSET_TOO_LARGE',
      message: 'Image must be 5 MB or smaller',
    });
  }
  const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${kind}-${Date.now()}.${ext}`;
  const folder = `letterheads/${tenantId}/${legalEntityId}`;
  const blobUrl = await this.blobStorageService.upload(
    file.buffer,
    folder,
    filename,
    file.mimetype,
  );
  return { blobUrl, kind, contentType: file.mimetype, sizeBytes: file.size };
}
```

Include `backgroundBlobUrl` / `designMode` in create audit `changes`.

- [ ] **Step 4: Add controller endpoint**

Place **before** `@Get(':id')` to avoid route conflicts — use a dedicated path:

```typescript
@Post('assets')
@ApiConsumes('multipart/form-data')
@ApiOperation({ summary: 'Upload a letterhead logo or background image' })
@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5e6 } }))
uploadAsset(
  @Body() dto: UploadLetterheadAssetDto,
  @UploadedFile() file: File,
  @CurrentUserSession() session: CurrentUserSession,
  @Headers('x-correlation-id') correlationId?: string,
  @Req() request?: FastifyRequest,
) {
  return this.letterheadConfigService.uploadAsset(dto.legalEntityId, dto.kind, file, {
    actorId: session.user.id,
    correlationId,
    ipAddress: request?.ip,
  });
}
```

Imports: `File`, `FileInterceptor` from `@nest-lab/fastify-multer`; `UploadedFile`, `UseInterceptors`, `BadRequestException` as needed; `ApiConsumes`, `ApiBody`.

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend && pnpm test -- src/modules/documents/__tests__/letterhead-config.service.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/documents/dto/upload-letterhead-asset.dto.ts \
  backend/src/modules/documents/letterhead-config.service.ts \
  backend/src/modules/documents/letterhead-config.controller.ts \
  backend/src/modules/documents/documents.module.ts \
  backend/src/modules/documents/__tests__/letterhead-config.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(documents): upload letterhead assets and validate design modes

EOF
)"
```

---

### Task 4: PDF builder — logo embed, background embed, mm margins

**Files:**
- Modify: `backend/src/modules/documents/document-pdf.builder.ts`
- Modify: `backend/src/modules/documents/document-pdf.service.ts`
- Test: `backend/src/modules/documents/__tests__/document-pdf.builder.spec.ts`

**Interfaces:**
- Consumes: extended `DocumentPdfInput` with `logoBytes?: Uint8Array | null`, `backgroundBytes?: Uint8Array | null`
- Produces: PDFs that draw background under content / logo in header for digital profiles; physical profile ignores artwork

- [ ] **Step 1: Write failing tests**

Create a tiny 1×1 PNG buffer for embed tests:

```typescript
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

it('embeds background for full_digital background mode and skips registered-name header', async () => {
  const bytes = await buildDocumentPdf({
    ...baseInput,
    renderProfile: RenderProfile.FULL_DIGITAL,
    letterhead: {
      designMode: 'background',
      margins: { top: 40, bottom: 30, left: 20, right: 20 },
      header: { showRegisteredName: true },
    },
    backgroundBytes: new Uint8Array(TINY_PNG),
  });
  const text = extractPdfText(bytes);
  expect(text).not.toContain('Digitaro Labs (Private) Limited');
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
});

it('does not embed background for print_on_letterhead', async () => {
  const bytes = await buildDocumentPdf({
    ...baseInput,
    renderProfile: RenderProfile.PRINT_ON_LETTERHEAD,
    letterhead: {
      designMode: 'background',
      margins: { top: 40, bottom: 30, left: 20, right: 20 },
      physicalStock: { enabled: true, contentTopMarginMm: 45, contentBottomMarginMm: 25 },
    },
    backgroundBytes: new Uint8Array(TINY_PNG),
  });
  expect(extractPdfText(bytes)).not.toContain('Digitaro Labs (Private) Limited');
});
```

Also update existing `baseInput.letterhead.margins` to mm values (e.g. `25`) once builder converts mm→pt — adjust expectations if needed so existing tests still pass.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd backend && pnpm test -- src/modules/documents/__tests__/document-pdf.builder.spec.ts
```

- [ ] **Step 3: Extend `DocumentPdfInput` and builder**

```typescript
export interface DocumentPdfInput {
  // ...existing fields
  logoBytes?: Uint8Array | null;
  backgroundBytes?: Uint8Array | null;
}
```

Digital margins: treat `layout.margins.*` as **mm** and multiply by `MM_TO_PT` (same as physical). Default e.g. 25 mm if unset.

For `!isPhysical`:

1. Resolve `designMode = layout.designMode ?? 'logo_text'`.
2. If `background` and `backgroundBytes`: on each page (including `newPage`), `page.drawImage(embedded, { x:0, y:0, width, height })` **before** body text. Skip registered/trading/address header block.
3. If `logo_text` and `logoBytes`: embed PNG/JPG, draw at top-left inside margins (`maxHeight` from `layout.logo.maxHeightPx` converted roughly to pt, default 60), then draw text header as today.
4. Body `y` starts at `pageHeight - topMargin` (config margins — People Ops calibrates).

Helper to embed:

```typescript
async function embedImage(pdfDoc: PDFDocument, bytes: Uint8Array) {
  try {
    return await pdfDoc.embedPng(bytes);
  } catch {
    return await pdfDoc.embedJpg(bytes);
  }
}
```

When adding pages in background mode, redraw background on the new page.

- [ ] **Step 4: Update `DocumentPdfService.render`**

After loading letterhead entity, fetch bytes:

```typescript
async function fetchBytes(url: string | null | undefined): Promise<Uint8Array | null> {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) {
    throw new NotFoundException({
      code: 'LETTERHEAD_ASSET_FETCH_FAILED',
      message: 'Could not load letterhead image asset',
    });
  }
  return new Uint8Array(await res.arrayBuffer());
}

const designMode = letterhead?.layoutJson?.designMode ?? 'logo_text';
const logoBytes =
  designMode === 'logo_text' ? await fetchBytes(letterhead?.logoBlobUrl) : null;
const backgroundBytes =
  designMode === 'background' ? await fetchBytes(letterhead?.backgroundBlobUrl) : null;

if (designMode === 'background' && !backgroundBytes && renderProfile !== RenderProfile.PRINT_ON_LETTERHEAD) {
  throw new NotFoundException({
    code: 'LETTERHEAD_BACKGROUND_MISSING',
    message: 'Background letterhead image is missing',
  });
}

return buildDocumentPdf({
  // ...existing
  letterhead: letterhead?.layoutJson ?? null,
  logoBytes,
  backgroundBytes,
});
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend && pnpm test -- src/modules/documents/__tests__/document-pdf.builder.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/documents/document-pdf.builder.ts \
  backend/src/modules/documents/document-pdf.service.ts \
  backend/src/modules/documents/__tests__/document-pdf.builder.spec.ts
git commit -m "$(cat <<'EOF'
feat(documents): render letterhead logo and background in PDFs

EOF
)"
```

---

### Task 5: Frontend API — FormData + letterhead types/helpers

**Files:**
- Modify: `frontend/src/libs/api/client.ts`
- Modify: `frontend/src/libs/api/documents.ts`
- Modify: `frontend/src/libs/api/documents.test.ts` (extend or add cases)

**Interfaces:**
- Produces: `uploadLetterheadAsset(legalEntityId, kind, file) → { blobUrl, kind, contentType, sizeBytes }`
- Produces: `LetterheadLayout.designMode`, `LetterheadConfig.backgroundBlobUrl`, `CreateLetterheadConfigInput.backgroundBlobUrl`

- [ ] **Step 1: Support FormData in `apiRequest`**

```typescript
const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

const response = await fetch(buildUrl(path, params), {
  credentials: 'include',
  headers: {
    ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...headers,
  },
  body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  ...rest,
});
```

- [ ] **Step 2: Extend documents types + upload helper**

```typescript
export type LetterheadDesignMode = 'logo_text' | 'background';

export type LetterheadLayout = {
  designMode?: LetterheadDesignMode;
  // ...existing fields
};

export type LetterheadConfig = {
  // ...existing
  logoBlobUrl: string | null;
  backgroundBlobUrl: string | null;
  // ...
};

export type CreateLetterheadConfigInput = {
  legalEntityId: string;
  layout: LetterheadLayout;
  logoBlobUrl?: string;
  backgroundBlobUrl?: string;
  effectiveFrom?: string;
};

export async function uploadLetterheadAsset(
  legalEntityId: string,
  kind: 'logo' | 'background',
  file: File,
) {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  form.append('legalEntityId', legalEntityId);
  return apiRequest<{
    blobUrl: string;
    kind: 'logo' | 'background';
    contentType: string;
    sizeBytes: number;
  }>(`${LETTERHEAD_BASE}/assets`, { method: 'POST', body: form });
}
```

- [ ] **Step 3: Add/adjust Vitest covering FormData path or uploadLetterheadAsset construction**

If `documents.test.ts` mocks `apiRequest`, assert `uploadLetterheadAsset` posts FormData with the three fields.

- [ ] **Step 4: Run frontend tests**

```bash
cd frontend && pnpm test -- src/libs/api/documents.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/libs/api/client.ts frontend/src/libs/api/documents.ts frontend/src/libs/api/documents.test.ts
git commit -m "$(cat <<'EOF'
feat(frontend): letterhead asset upload API and designMode types

EOF
)"
```

---

### Task 6: i18n strings for collapsed cards + design modes

**Files:**
- Modify: `frontend/src/locales/en.json` (`LetterheadAdmin` only)

- [ ] **Step 1: Add keys**

Add (keep existing keys):

```json
"edit_letterhead": "Edit letterhead",
"edit_version_for": "Edit letterhead — {entity}",
"expand_settings": "Document output settings",
"collapse": "Collapse",
"expand": "Expand",
"design_mode": "Design mode",
"design_mode_logo_text": "Logo + text",
"design_mode_background": "Background artwork",
"mode_chip_logo_text": "Logo + text",
"mode_chip_background": "Background",
"upload_logo": "Upload logo",
"upload_background": "Upload background",
"replace_image": "Replace image",
"image_hint": "PNG, JPEG, or WebP · max 5 MB",
"error_upload": "Could not upload the image.",
"error_background_required": "Background image is required for this design mode.",
"content_margins_hint": "Set top/bottom so PDF body clears the artwork.",
"mode_switch_warn": "Switching mode clears the other design’s image from this draft."
```

Remove or stop using `logo_blob_url` / `logo_blob_url_placeholder` in UI (may leave keys unused or delete).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/locales/en.json
git commit -m "$(cat <<'EOF'
feat(frontend): letterhead admin copy for design modes and uploads

EOF
)"
```

---

### Task 7: UI — collapsed cards + version dialog with modes/uploads

**Files:**
- Create: `frontend/src/components/documents/LetterheadEntityCard.tsx`
- Create: `frontend/src/components/documents/LetterheadVersionDialog.tsx`
- Modify: `frontend/src/app/[locale]/(auth)/people-ops/letterheads/page.tsx`

**Interfaces:**
- Consumes: `uploadLetterheadAsset`, `createLetterheadConfig`, types from Task 5, strings from Task 6
- Produces: Page with collapsed-by-default cards; Edit/Publish always on header; dialog mode switch + file upload + margins

- [ ] **Step 1: Implement `LetterheadEntityCard`**

Props sketch:

```typescript
type Props = {
  entity: LegalEntity;
  current: LetterheadConfig | undefined;
  versionCount: number;
  draft: { requiresWetStamp: boolean; stampInstructions: string; defaultRenderProfile: RenderProfile } | undefined;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onDraftChange: (next: NonNullable<Props['draft']>) => void;
  onSaveOutput: () => void;
  savingOutput: boolean;
  outputSaved: boolean;
  isOnline: boolean;
};
```

Header row always shows: name, country Tag, code, version summary or `no_version_yet`, mode chip from `current?.layoutJson.designMode ?? 'logo_text'`, **Edit** (only if `current`), **Publish**, chevron for expand.

Expanded section = existing Document Output Settings block (moved from page).

Default `expanded = false` from parent state `Record<entityId, boolean>` initialized empty (all collapsed).

- [ ] **Step 2: Implement `LetterheadVersionDialog`**

- `visible`, `entity`, `mode: 'edit' | 'publish'`, `initialLayout`, `initialLogoUrl`, `initialBackgroundUrl`, `onHide`, `onPublished`
- Local state: `layout`, `logoBlobUrl`, `backgroundBlobUrl`, `uploading`, `saving`, `error`
- Top: SelectButton or radio for `designMode`
- `logo_text`: file input → `uploadLetterheadAsset(entity.id, 'logo', file)` → set `logoBlobUrl`; show preview `<img>`; header/footer toggles; margins grid
- `background`: file input → kind `background`; margins with `content_margins_hint`; hide header toggles
- Physical stock section unchanged
- Publish calls `createLetterheadConfig` with the appropriate URL field only

On mode change: clear the other URL in draft and show `mode_switch_warn` Message once.

- [ ] **Step 3: Slim down page**

Page owns load/error/refresh, maps entities → `LetterheadEntityCard`, holds dialog open state (`dialogEntity`, `dialogMode`), wires `openVersionDialog(entity, 'edit' | 'publish')`.

- [ ] **Step 4: Manual smoke (or Playwright if already set up for people-ops)**

1. Open `/en/people-ops/letterheads` — cards collapsed; Publish visible; Edit hidden until a version exists  
2. Publish `logo_text` with logo file + margins  
3. Card shows version + Logo + text chip; Edit appears  
4. Publish `background` with artwork + top/bottom margins  
5. Expand card → save wet-stamp settings still works  

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/documents/LetterheadEntityCard.tsx \
  frontend/src/components/documents/LetterheadVersionDialog.tsx \
  frontend/src/app/[locale]/\(auth\)/people-ops/letterheads/page.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): collapsed letterhead cards with design-mode publish dialog

EOF
)"
```

---

### Task 8: Spec status + verification

**Files:**
- Modify: `docs/superpowers/specs/2026-08-09-letterhead-admin-ux-design.md` (status → Implemented / ready for QA)

- [ ] **Step 1: Run backend + frontend targeted tests**

```bash
cd backend && pnpm test -- src/modules/documents/__tests__/letterhead-config.service.spec.ts src/modules/documents/__tests__/document-pdf.builder.spec.ts
cd frontend && pnpm test -- src/libs/api/documents.test.ts
```

Expected: PASS

- [ ] **Step 2: Update design doc status line to `Implemented`**

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-08-09-letterhead-admin-ux-design.md
git commit -m "$(cat <<'EOF'
docs(documents): mark letterhead admin UX design implemented

EOF
)"
```

---

## Plan self-review

| Spec requirement | Task |
|---|---|
| Collapsed cards + Edit/Publish on header | Task 7 |
| Expand = document output settings only | Task 7 |
| Modes `logo_text` \| `background` | Tasks 2–3, 7 |
| File upload ≤5 MB PNG/JPEG/WebP | Task 3, 5, 7 |
| Top/bottom margins for non-overlap | Tasks 4, 7 |
| PDF digital embeds art; print skips | Task 4 |
| Versioned publish only | Task 3 (existing create path) |
| `en.json` only | Task 6 |
| Audit on create | Task 3 (extend changes) |

No TBD placeholders. Types aligned: `designMode`, `backgroundBlobUrl`, `uploadAsset` / `uploadLetterheadAsset`.
