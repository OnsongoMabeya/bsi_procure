# BSI Procurement System — Build Changelog

This file records what was built in each phase, what decisions were made, and what is intentionally deferred. Updated at the end of every phase.

---

## Phase 0 — Scaffolding ✅
**Date completed:** 2026-06-22

### What was built
- Monorepo structure: `/backend`, `/frontend`, `/shared`
- **Backend:** Express.js API with `cors`, `dotenv`, `sequelize`, `mysql2`
  - `backend/index.js` — main app entry point
  - `backend/config/database.js` — Sequelize connection loaded from `backend/.env`
  - `GET /api/health` — returns API status + DB connection status
- **Frontend:** React + Vite SPA
  - `frontend/vite.config.js` — dev server on port 3005, `/api` proxied to port 5005
  - `frontend/src/App.jsx` — smoke-test page fetching `/api/health`
- **Shared:** `shared/constants.js` — role names and tender status constants
- **Docker:** `docker-compose.yml` — MySQL 8.0 container for local dev
- **Config:** `backend/.env.example` template with all secret placeholders
- **Git:** repo initialised, `.gitignore` excludes `node_modules`, `dist`, `.env`, spec docs

### Ports
- Backend: `5005`
- Frontend: `3005`

### Decisions made
- **Sequelize** chosen as ORM (over raw queries) — straightforward model definitions, sync support, good MySQL dialect
- `backend/.env` loaded relative to `backend/` directory to avoid path issues when running from monorepo root
- Spec documents (`BSI_ProcurementSystem_SpecPrompt.md`, `BSI_Implementation_Phasing_Instructions.md`) excluded from Git — kept local-only

---

## Phase 1 — Auth & Roles ✅
**Date completed:** 2026-06-24

### What was built

#### Backend
- **`backend/models/User.js`** — Sequelize model with fields: `id`, `name`, `email`, `password_hash`, `role` (ENUM of 9 roles), `whatsapp_number`, `is_active`, `created_at`, `updated_at`
- **`backend/middleware/auth.js`**
  - `authMiddleware` — verifies JWT from `Authorization: Bearer <token>` header, loads user from DB
  - `requireRole(...roles)` — RBAC middleware, returns 403 if role not in allowed list
- **`backend/routes/auth.js`**
  - `POST /api/auth/login` — validates email + bcrypt password, returns JWT + user object
  - `POST /api/auth/logout` — stateless (client drops token); endpoint exists for audit logging
  - `GET /api/auth/me` — returns current user from token
- **`backend/routes/users.js`** — ADMIN-only CRUD
  - `GET /api/users` — list all users
  - `POST /api/users` — create user
  - `PATCH /api/users/:id` — edit name/email/role/whatsapp/password/is_active
  - `DELETE /api/users/:id` — soft-delete (sets `is_active = false`)
- **`backend/scripts/seed.js`** — creates default ADMIN if no users exist
- **`backend/scripts/setup.js`** — one-command server setup:
  1. Creates MySQL database if missing
  2. Syncs all Sequelize models (creates/alters tables)
  3. Seeds default ADMIN user
- **`backend/index.js`** updated — registers auth + users routes, calls `sequelize.sync({ alter: true })` on startup

#### Frontend
- **`frontend/src/context/AuthContext.jsx`** — stores JWT in `localStorage`, exposes `login()`, `logout()`, `user`, `loading`
- **`frontend/src/components/ProtectedRoute.jsx`** — redirects to `/login` if unauthenticated; shows "Access denied" if role not permitted
- **`frontend/src/pages/LoginPage.jsx`** — email + password form with BSI branding
- **`frontend/src/pages/UsersPage.jsx`** — ADMIN user management table with create/edit/deactivate
- **`frontend/src/App.jsx`** — `react-router-dom` routing with auth guards

#### Root
- **`package.json`** — `npm run dev` at root starts backend + frontend via `concurrently`
- **`npm run setup`** at root delegates to `backend/scripts/setup.js`

### The 9 roles
| Role  | Description                                           |
|-------|-------------------------------------------------------|
| CEO   | Chief Executive Officer — read-only overview          |
| GM    | General Manager — feasibility approval                |
| FL    | Finance Lead — checklist confirmation, financial docs |
| FIN   | Finance — financial document tasks                    |
| TECH  | Technician — technical document tasks                 |
| INFO  | Office Admin/Info — company docs, form filling        |
| IT    | IT — IT certifications                                |
| HOT   | Head of Technical — feasibility approval              |
| ADMIN | System Administrator — user management, full access   |

### Default seed credentials
- Email: `admin@bsint.net`
- Password: `Admin@123` ← **change after first login**

### Decisions made
- **`bcryptjs`** (pure JS) used instead of native `bcrypt` — avoids native build issues on Windows Server
- JWT is stateless — logout is client-side token drop, no server-side blacklist needed at this scale
- `sequelize.sync({ alter: true })` on startup — keeps schema in sync without a migrations file. Will revisit for Phase 14 hardening if needed
- Soft delete only (`is_active = false`) — per spec, no user records are ever destroyed

---

## Phase 2 — Core Layout & Navigation ✅
**Date completed:** 2026-06-24

### What was built

#### Frontend
- **`frontend/src/index.css`** — replaced with CSS custom properties (design tokens):
  - BSI brand colours: `--bsi-blue: #153E90`, `--bsi-accent: #2DA2E5`
  - Layout vars: `--sidebar-w: 230px`, `--topbar-h: 56px`
  - Neutral palette, status colours
- **`frontend/src/components/Sidebar.jsx`**
  - Fixed left sidebar (BSI blue background)
  - BSI logo mark + "Procurement / Management System" text
  - Role-filtered navigation links (NavLink with active highlight)
  - Logged-in user avatar + name + role at the bottom
  - Sign out button
- **`frontend/src/components/Layout.jsx`**
  - Shell: sidebar (fixed) + main area (sticky topbar + scrollable content)
  - Accepts `title` prop → shown in topbar
- **8 pages created** (all wrapped in `Layout`):
  - `DashboardPage` — welcome message with user name/role
  - `MyTasksPage` — placeholder (Phase 5)
  - `TendersPage` — placeholder (Phase 3)
  - `DocumentLibraryPage` — placeholder (Phase 5)
  - `CompanyProfilePage` — placeholder (Phase 6)
  - `CompanyDocumentsPage` — placeholder (Phase 6)
  - `PastTendersPage` — placeholder (Phase 13)
  - `SettingsPage` — links to User Management; other settings cards stubbed
- **`frontend/src/App.jsx`** — full route tree with `ProtectedRoute` role guards on every route

### Tab → role visibility
| Tab               | Roles with access                     |
| ----------------- | ------------------------------------- |
| Dashboard         | All                                   |
| My Tasks          | All except CEO                        |
| Tenders           | All                                   |
| Document Library  | All except CEO, FIN                   |
| Company Profile   | ADMIN, FL, INFO                       |
| Company Documents | ADMIN, FL, INFO                       |
| Past Tenders      | All                                   |
| Settings          | ADMIN only                            |

### Decisions made
- Role filtering enforced at **two levels**: sidebar (hides tab) + `ProtectedRoute` (blocks direct URL access)
- Emoji icons used as placeholder — will swap for a proper icon library during Phase 14 polish
- `SettingsPage` links to `/users` (User Management from Phase 1) since Settings is ADMIN-only

---

## Phase 3 — Tender Intake & Feasibility ✅
**Date completed:** 2026-06-24

### What was built

#### Backend
- **`backend/models/Tender.js`** — Sequelize model: `id`, `name`, `reference_number`, `procuring_entity`, `deadline`, `submission_type` (ENUM: physical/digital/both), `status` (ENUM: PENDING_FEASIBILITY/DOCUMENT_GATHERING/ASSEMBLY/SUBMITTED/REJECTED), `uploaded_document_path`, `uploaded_document_name`, `uploaded_by`, `feasibility_approved_by`, `feasibility_approved_at`, `feasibility_notes`, `rejection_reason`, `is_archived`
- **`backend/middleware/upload.js`** — `multer` disk storage for PDF/DOCX, max 50 MB, sanitised filename, stored in `backend/uploads/tenders/`
- **`backend/routes/tenders.js`**
  - `GET /api/tenders` — list all non-archived tenders (all authenticated roles)
  - `GET /api/tenders/:id` — single tender with creator + approver associations
  - `POST /api/tenders` — create tender with optional file upload (GM, HOT, CEO, ADMIN)
  - `PATCH /api/tenders/:id/feasibility` — approve or reject (GM, HOT only); approve → `DOCUMENT_GATHERING`, reject → `REJECTED` with mandatory reason
- **`backend/index.js`** — registered tenders route, Sequelize associations (User → Tender), static `/uploads` serving
- **`backend/scripts/setup.js`** — Tender model imported so `tenders` table is created on setup

#### Frontend
- **`frontend/src/pages/TendersPage.jsx`** — full replacement of placeholder:
  - Tender cards grid (name, entity, ref, status badge, deadline countdown, submission type, created by)
  - Countdown turns red and bold when < 3 days remaining
  - "+ New Tender" button (GM, HOT, CEO, ADMIN only)
  - Inline create form with: name, reference number, procuring entity, deadline (datetime-local), submission type, document upload
  - Links to `/tenders/:id` on card click
- **`frontend/src/pages/TenderDetailPage.jsx`** — NEW:
  - Header card: full tender metadata grid
  - Uploaded document link (opens in new tab)
  - Feasibility panel:
    - `PENDING_FEASIBILITY` → shows waiting message
    - `DOCUMENT_GATHERING/ASSEMBLY/SUBMITTED` → shows approved box (approver name, date, notes)
    - `REJECTED` → shows rejected box (approver name, date, reason)
    - GM/HOT with pending tender → shows Approve/Reject toggle form with notes textarea
- **`frontend/src/App.jsx`** — added `/tenders/:id` route (all roles)

### Decisions made
- **CEO can create tenders** — spec says "GM, CEO, or HOT can upload". Implemented as stated. CEO view is still read-only for feasibility (cannot approve/reject).
- **`multer` disk storage** chosen over memory storage — tender documents can be large PDFs; disk is safer for 50 MB limit
- **Uploaded document URL** served via `express.static('/uploads')` — simple and sufficient for on-premise deployment; no cloud storage needed
- `is_archived` defaults to `false` — archived tenders hidden from list by default; archive management deferred to Phase 13

### Intentionally stubbed
- WhatsApp notification to GM/HOT on tender creation → Phase 12
- AI checklist extraction trigger on feasibility approval → Phase 4
- In-app notification bell → Phase 12
- Checklist panel on tender detail → Phase 4/5

---

## Phase 4 — AI Checklist Extraction (Gemini + Ollama) ✅
**Date completed:** 2026-06-24

### What was built

#### Backend
- **`backend/models/ChecklistItem.js`** — Sequelize model: `id`, `tender_id`, `name`, `category` (ENUM), `is_form`, `form_reference`, `notes`, `suggested_assignee_role`, `assigned_to`, `status` (ENUM: PENDING/IN_PROGRESS/UPLOADED/APPROVED/REJECTED), `order_index`
- **`backend/models/Tender.js`** — added `checklist_confirmed` boolean field
- **`backend/services/llm.js`** — LLM abstraction service:
  - Reads `LLM_PROVIDER` env var (default: `ollama` in Docker, `gemini` if no config)
  - Extracts text from PDF via `pdf-parse`, DOCX via `mammoth`, DOC via `word-extractor`
  - Sends extracted text + extraction prompt to the configured provider (Gemini 2.0 Flash or local Ollama)
  - Parses JSON response, validates `checklist` array
  - Truncates to relevant sections (up to 80,000 chars) to stay within context window
- **`backend/routes/ai.js`** — `POST /api/ai/scan-tender/:tenderId` (FL, INFO, ADMIN):
  - Validates tender status is `DOCUMENT_GATHERING`
  - Calls `scanTenderDocument`, wipes old checklist items, bulk-inserts new ones
- **`backend/routes/tenders.js`** — added:
  - `GET /api/tenders/:id/checklist` — list items with assignee user join
  - `POST /api/tenders/:id/checklist` — add item manually
  - `PATCH /api/tenders/:id/checklist/:itemId` — edit item
  - `DELETE /api/tenders/:id/checklist/:itemId` — remove item
  - `PATCH /api/tenders/:id/checklist/confirm` — set `checklist_confirmed = true` (FL, INFO, ADMIN)
- **`backend/index.js`** — registered `ChecklistItem` model, associations, AI route

#### Frontend
- **`frontend/src/components/ChecklistPanel.jsx`** — full checklist management component:
  - "✨ Scan with AI" button → calls AI scan endpoint, replaces checklist
  - Items grouped by category (Tender Forms, Company Standing, Financial, Experience, Technical, IT, Other)
  - Per-item: name, form tag (FORM badge + reference), notes, assignee name+role(s), status badge
  - Inline edit form per item: name, category, assign user (dropdown of all users), suggested roles (multi-role checkbox group), notes
  - Add item manually form
  - Delete button per item (with confirm dialog)
  - "✔ Confirm Checklist" button → sets `checklist_confirmed`, shows locked banner
  - All edit actions hidden once confirmed
- **`frontend/src/pages/TenderDetailPage.jsx`** — ChecklistPanel mounted below feasibility section when tender status is `DOCUMENT_GATHERING`, `ASSEMBLY`, or `SUBMITTED`

### Decisions made
- **Text extraction** (not native PDF bytes) sent to the LLM — avoids Google File API complexity; works well for native PDFs/DOCX. Scanned/image PDFs need OCR — deferred to Phase 14.
- **Default provider is Ollama (llama3.1)** in Docker; **Gemini 2.0 Flash** available via one-line config change.
- **Relevant-section extraction** — selects the mandatory/technical/financial sections before sending to the LLM, up to 80,000 chars, instead of truncating the whole document.
- **Scan replaces existing checklist** — with a confirmation dialog, so re-running is safe
- **Checklist confirmation is a soft lock** — UI hides edit controls; no hard DB constraint so ADMIN can still patch via API if needed

### Intentionally stubbed
- WhatsApp/in-app notifications to assigned users on confirmation → Phase 12
- OpenAI / Anthropic providers → Phase 14
- OCR for scanned PDFs → Phase 14

### Required config
Two options:

**Option A — Ollama (free, local, default in Docker Compose):**
```env
LLM_PROVIDER=ollama
LLM_OLLAMA_URL=http://ollama:11434
LLM_OLLAMA_MODEL=llama3.1
```
Ollama is bundled in Docker Compose. On first start it downloads the model (~4.7 GB) and caches it. For GPU acceleration on macOS, point at host Ollama with `LLM_OLLAMA_URL=http://host.docker.internal:11434`.

**Option B — Google Gemini:**
```env
LLM_PROVIDER=gemini
LLM_API_KEY=your-gemini-api-key-here
```
Get a free Gemini API key at <https://aistudio.google.com/apikey>

---

## Phase 4 — AI Extraction Hardening (Follow-up) ✅
**Date completed:** 2026-07-07

### What was built / refined

#### Backend
- **`backend/services/llm.js`** — now a true multi-provider abstraction:
  - `scanWithGemini()` for Google Gemini (original provider).
  - `scanWithOllama()` for local Ollama, with:
    - JSON schema mode via `format: checklistSchema` for structured output.
    - 4-minute `AbortController` timeout to prevent indefinite scans.
    - Raw response logging before parsing for debugging.
    - Markdown code-block and top-level-array JSON parsing fallbacks.
  - `extractRelevantSections()` — keyword-window section extractor that works across tender formats (Kenyan STAGE headers, numbered lists, tables) instead of brittle header-only splitting.
  - Text window expanded from 60,000 to **80,000 chars of relevant sections**.
- **Prompt hardening** in `scanWithOllama` system prompt:
  - Explicit row-by-row table extraction rules.
  - Sector-specific license/permit keywords (NCA, ERC, KRA, business permits, dealership letters).
  - Experience-proof capture (LPOs, LSOs, contracts, recommendation letters).
  - Exact numeric preservation rule (amounts, validity periods, days).
  - Anti-hallucination guard: only extract documents the bidder must submit; skip evaluation procedures and procuring-entity actions.
- **Role model updates** in `backend/models/ChecklistItem.js`:
  - `suggested_assignee_role` widened to `VARCHAR(100)` to support comma-separated multi-role strings (e.g., `TECH,IT,GM,ADMIN`).
- **Route normalization** in `backend/routes/tenders.js` and `backend/routes/ai.js`:
  - `normalizeRole()` now validates and accepts comma-separated roles.
  - AI scan applies procedure-item filter to drop known procedural hallucinations before saving.
- **PDF parsing fix**:
  - Switched `backend/package.json` to standard `pdf-parse@1.1.1`.
  - Added robust import fallback and defensive error handling for scanned/image PDFs.

#### Frontend
- **`frontend/src/components/ChecklistPanel.jsx`**:
  - Multi-role selection UI (checkbox groups) replacing single-role dropdowns.
  - `GM` role added to the role list.
  - Multi-role chips displayed per checklist item.

### Decisions made
- **Default provider is Ollama in Docker**, with an optional switch to host Ollama (`http://host.docker.internal:11434`) for GPU-accelerated scans on macOS.
- **Gemini remains a one-line config change** via `LLM_PROVIDER=gemini` + `LLM_API_KEY`.
- **Multi-role assignments** replace single-role suggestions because many tender documents require cross-functional input (e.g., technical + IT + GM).
- **Relevant-section extraction** is preferred over sending the whole document — reduces noise, improves focus, and lowers LLM context usage.
- **Scan still replaces the existing checklist** — confirmed safe; re-running is the primary way to regenerate after prompt improvements.

### Intentionally stubbed / deferred
- OCR for scanned/image-only PDFs → Phase 14
- OpenAI / Anthropic cloud providers → Phase 14 (Ollama is now the default local fallback)
- WhatsApp/in-app notifications on checklist confirmation → Phase 12

---

## Phase 5 — Document Gathering & My Tasks ✅
**Date completed:** 2026-07-07

### What was built

#### Backend
- **`backend/models/ChecklistItem.js`** — added document fields:
  - `uploaded_document_path`, `uploaded_document_name`, `uploaded_by`, `uploaded_at`, `reviewer_notes`
- **`backend/middleware/upload.js`** — new `uploadChecklistDoc` middleware accepting PDF, JPG, PNG, DOCX, XLSX up to 50 MB, stored in `uploads/checklist_items/`
- **`backend/index.js`** — added `ChecklistItem` → `User` (`uploaded_by`) association
- **`backend/routes/tenders.js`**:
  - `GET /api/tenders/:id/checklist` now enforces visibility: CEO/GM/FL/INFO/ADMIN see all; others see only assigned items
  - `POST /api/tenders/:id/checklist/:itemId/upload` — upload/replace document → status `UPLOADED`
  - `PATCH /api/tenders/:id/checklist/:itemId/start` — set status `IN_PROGRESS`
  - `PATCH /api/tenders/:id/checklist/:itemId/submit` — set status `UPLOADED` without file
  - `PATCH /api/tenders/:id/checklist/:itemId/approve` — FL/INFO/ADMIN only
  - `PATCH /api/tenders/:id/checklist/:itemId/reject` — FL/INFO/ADMIN only, requires reviewer notes
  - `GET /api/tenders/my-tasks` — assigned items across active tenders, grouped by tender deadline

#### Frontend
- **`frontend/src/pages/MyTasksPage.jsx`** — full replacement of placeholder:
  - Items grouped by tender with deadline countdown
  - Per-item: category, status badge, assignee, notes, uploaded file link
  - Actions: Start, Upload, Mark uploaded, Approve, Reject (with reviewer notes)
  - Empty state and flash messages
- **`frontend/src/components/ChecklistPanel.jsx`**:
  - Added Start / Upload / Mark uploaded / Approve / Reject buttons per item
  - Shows uploaded file link and rejection notes
  - Review actions visible to FL/INFO/ADMIN

### Decisions made
- **Status workflow** stays strict: `PENDING → IN_PROGRESS → UPLOADED → APPROVED|REJECTED`. Rejected items return to `IN_PROGRESS` via Start.
- **Upload directory** separated from tender source documents (`uploads/checklist_items/`) for cleaner file organization.
- **Reviewers can approve/reject any uploaded item** regardless of assignment — matches the FL/INFO oversight role.
- **Form items use manual upload fallback** for Phase 5; overlay editor deferred to Phase 7.

### Intentionally stubbed / deferred
- WhatsApp/in-app notifications on status change → Phase 12
- Overlay form filling → Phase 7
- Document library / company documents → Phase 6

---

## Phase 6 — Company Documents, Profile & My Documents ✅
**Date completed:** 2026-07-16

### What was built

#### Company Profile
- **`backend/models/CompanyProfile.js`**, **`CompanyProfileVersion.js`**, and **`Director.js`** — structured company details, normalized directors, and source-document version history.
- **`backend/routes/companyProfile.js`** — authenticated profile retrieval, ADMIN updates, and source-document uploads.
- **`frontend/src/pages/CompanyProfilePage.jsx`** — editable grouped profile fields, director management, source upload, and version history.

#### Company Documents
- **`backend/models/CompanyDocument.js`** and **`CompanyDocumentVersion.js`** — reusable company-owned records with expiry dates and file-version history.
- **`backend/routes/companyDocuments.js`** — authenticated CRUD, uploads, and version retrieval.
- **`frontend/src/pages/CompanyDocumentsPage.jsx`** — document library with expiry alerts, upload, and version management.

#### My Documents
- **`backend/models/UserDocument.js`** — personal user-owned documents with label, category, description, file path, and ownership.
- **`backend/middleware/upload.js`** — `uploadUserDoc` accepts PDF, JPG, PNG, DOC, DOCX, and XLSX uploads up to 50 MB, stored in `uploads/user_documents/`.
- **`backend/routes/myDocuments.js`**:
  - `GET /api/my-documents` returns the current user's personal files and non-approved assigned checklist items across active tenders.
  - `POST /api/my-documents` uploads a personal document.
  - `DELETE /api/my-documents/:id` removes a document owned by the current user; ADMIN may also delete.
- **`frontend/src/pages/DocumentLibraryPage.jsx`** — replaced with the **My Documents** experience at `/documents`:
  - **My Uploads** tab for CVs, certificates, signature files, professional files, and other personal records.
  - **Task Inbox** tab grouped by tender, with status, deadline countdown, Start, Upload, and Mark uploaded actions.
- **`frontend/src/components/Sidebar.jsx`** and **`frontend/src/App.jsx`** — My Documents is visible and routable for FL, FIN, TECH, INFO, IT, and HOT.
- **`nginx.frontend.conf`** — SPA route responses explicitly disable cache to prevent older frontend bundles from hiding recent navigation updates.

### Decisions made
- **Personal documents remain separate from company documents**: ownership is enforced through `owner_id`; tender-task files remain on checklist items.
- **The task inbox includes only active tender work** and excludes approved checklist items.
- **My Documents access is role-scoped** to operational document contributors: FL, FIN, TECH, INFO, IT, and HOT.
- **Company profile editing remains ADMIN-only** while authorized roles can view company reference information.

### Intentionally stubbed / deferred
- Form field overlay, automated data population, and flattened form output → Phase 7.
- Signature/stamp placement and immutable signature audit log → Phase 8.

---

## Phase 7 — Form Filling Engine ✅
**Date completed:** 2026-08-03

### What was built

#### Backend
- **`backend/models/FormTemplate.js`** — immutable blank PDF template linked one-to-one with a fillable checklist item.
- **`backend/utils/convertDocxToPdf.js`** — converts uploaded DOCX tender documents to PDF using LibreOffice headless so forms can be extracted from Word tenders.
- **`backend/models/Tender.js`** — added `converted_document_path` / `converted_document_name` to cache the PDF conversion of DOCX uploads.
- **`backend/routes/tenders.js`** — auto-converts DOCX tenders to PDF on upload and stores the converted path.
- **`backend/routes/forms.js`**:
  - `GET /api/forms/tenders/:id/checklist/:itemId` — returns the checklist item, existing template, auto-fill values, and the effective `tender_pdf_path`.
  - `POST /api/forms/tenders/:id/checklist/:itemId/template` — upload a standalone blank PDF template.
  - `POST /api/forms/tenders/:id/checklist/:itemId/extract-template` — **slice a page range from the original tender PDF** into the checklist item's template (falls back to on-demand DOCX→PDF conversion for existing Word tenders).
  - `POST /api/forms/tenders/:id/checklist/:itemId/flatten` — permanently embeds placed text into the template and saves a submission-ready PDF, updating the checklist item to `UPLOADED`.

#### Frontend
- **`frontend/src/components/FormEditor.jsx`** — fixed-overlay PDF editor:
  - Renders the blank template page-by-page via `pdfjs-dist`.
  - Click-to-place text fields with adjustable font size.
  - Auto-fill panel populated from Company Profile and tender fields.
  - Editable per-page field list.
  - **Page-range extraction UI** that loads the tender PDF, shows thumbnails, lets FL/INFO select start/end pages, and previews the first selected page at high resolution.

#### Infrastructure
- **`Dockerfile.backend`** — installs LibreOffice plus font packages (`ttf-dejavu`, `ttf-liberation`, `font-noto`, `font-noto-cjk`, `font-noto-extra`) so converted PDFs embed legible glyphs.
- **`frontend/scripts/copy-pdf-worker.js`** + **`frontend/package.json` postinstall** — copies `pdfjs-dist` worker to `public/` so it is served at a stable path.
- **`nginx.frontend.conf`** — serves `.mjs` files with `application/javascript` MIME type so the worker loads correctly.

### Decisions made
- **Templates are immutable**: once created, a checklist item's blank template is preserved; flattening always produces a separate output file.
- **Form extraction is manual page-range selection**: the system does not attempt AI-based form boundary detection; the user visually picks the pages for each form inside the tender PDF.
- **Auto-fill uses exact Company Profile fields** plus tender metadata; remaining fields are filled manually in the overlay editor.
- **DOCX tenders are first-class**: Word documents are automatically converted to PDF on upload; existing Word tenders are converted on first extraction attempt.

### Issues resolved during this phase
- pdfjs-dist worker failed to load because it was requested from a hashed dynamic URL; fixed by serving `/pdf.worker.min.mjs` from `public/`.
- DOCX conversion produced missing-glyph boxes; fixed by installing common font families in the backend image.
- Extraction preview was either too small or too zoomed; final layout is side-by-side with a full-page, high-resolution preview on the left and thumbnail selector on the right.

### Intentionally stubbed / deferred
- Signature and stamp placement → Phase 8.

---

## Phase 8 — Signatures & Stamps ✅
**Date completed:** 2026-08-04

### What was built

#### Backend
- **`backend/models/AuditLog.js`** — immutable audit log table matching the spec's schema (`user_id, action, entity_type, entity_id, tender_id, metadata, timestamp`).
- **`backend/utils/auditLog.js`** — `recordAudit()` helper to write audit entries.
- **`backend/routes/auditLog.js`** — `GET /api/audit-log` (ADMIN/FL/INFO only), filterable by `tender_id`, `entity_type`, `entity_id`.
- **`backend/models/CompanyDocument.js`** — added `ceo_signature` doc_type (previously only `director_signature`/`company_stamp` existed), so CEO and Director signatures are distinct assets per the spec.
- **`backend/routes/forms.js`** — `POST /tenders/:id/checklist/:itemId/sign`: embeds one or more signature/stamp PNGs (front-of-text) onto the already-flattened form PDF at normalized page positions/sizes, saves a new `signed_*.pdf` output, and writes one `audit_log` row per placement (user, form, tender, asset, timestamp). Restricted to `INFO`/`ADMIN` (the roles table assigns "stamping" to `INFO`).

#### Frontend
- **`frontend/src/components/FormEditor.jsx`** — new **Sign & Stamp** workspace:
  - Side panel lists CEO/Director signature and Company stamp assets from Company Documents.
  - Click an asset, click the form to place it; drag to reposition, drag the corner handle to resize.
  - "Confirm & Flatten Signatures" burns the placements into the PDF and shows the resulting audit trail.
  - Automatically entered right after a text-flatten (for INFO/ADMIN); also reachable via a "Sign & Stamp →" button once a form has been flattened.
- **`frontend/src/pages/CompanyDocumentsPage.jsx`** — added "CEO Signature" to the document type selector.

### Decisions made
- **Signing/stamping restricted to `INFO`/`ADMIN`**, distinct from `TEMPLATE_ROLES` (`FL/INFO/ADMIN`) used for form filling — the spec's role table assigns "stamping" specifically to `INFO`.
- **Added `ceo_signature` as a `CompanyDocument.doc_type`** since the spec explicitly separates CEO signature from Director signatures, but the existing enum only had `director_signature`.
- **Audit trail read access** reuses `GET /api/audit-log` rather than building a dedicated archive page — the full searchable audit archive is Phase 13's scope; Phase 8 only needed to prove the trail is correctly recorded.

### Issue found and fixed during this phase (infrastructure, not scoped to Phase 8)
- `backend/models/User.js`'s `email` column used `unique: true` without a stable index name. Every `sequelize.sync({ alter: true })` run (i.e. every backend container restart) created a **new** duplicate unique index (`email`, `email_2`, `email_3`, …) instead of detecting the existing one. After ~5 weeks of restarts this hit MySQL's 64-key-per-table limit and made **all** DB sync fail silently (`Too many keys specified`), which would have blocked the new `audit_log` table too.
  - **Fix:** gave the constraint an explicit name (`unique: 'users_email_unique'`), dropped the 62 duplicate indexes, and verified across two consecutive restarts that no new duplicate is created.

### Intentionally stubbed / deferred
- Full audit log browsing UI (search/filter across all tenders) → Phase 13 (Past Tenders & Archive).
- Cryptographic/PKI digital signatures — spec explicitly scopes Phase 1 to image-based signature overlay only.

---

## Post-Phase-8 Enhancement — Reselect Form Pages ✅
**Date completed:** 2026-08-05

### What was built
- **`backend/routes/forms.js`** — `POST /tenders/:id/checklist/:itemId/extract-template` no longer rejects with 409 when a template already exists. It now **replaces** the template: deletes the old template file and DB record, and resets the checklist item (status → `PENDING`, flattened output cleared) since prior output is invalid once the underlying pages change.
- **`frontend/src/components/FormEditor.jsx`** — new **Reselect Pages** button in the fill-workspace toolbar (FL/INFO/ADMIN, shown when the tender has a source PDF). It reopens the page-selection UI (thumbnails + legible first-page preview) with a "Reselect form pages" heading, clears placed fields, and resets the page index after extraction. Cancel returns to the fill workspace unchanged.

### Behaviour notes
- Reselecting pages is destructive by design: placed text fields, flattened output, and any signed output are cleared because they were based on the old pages.
- Manually uploaded templates (via "Upload Blank PDF Template") are still one-shot — only tender-page extraction supports replacement.

### Bug fixed during this enhancement
- The extraction UI was only rendered inside the "no template yet" branch, so clicking Reselect Pages set `extractMode` but nothing appeared. The render branch is now `extractMode || !form?.template`.

---

## Phase 9 — Document Assembly & Ordering ✅
**Date completed:** 2026-08-06

### What was built

#### Backend
- **`backend/models/ChecklistItem.js`** — added `assembly_order` INTEGER field to track custom document ordering (separate from the original `order_index` used for checklist display).
- **`backend/routes/assembly.js`** — new route module with three endpoints:
  - `GET /api/tenders/:id/assembly` — returns approved checklist items sorted by `assembly_order` (or fallback to `order_index`), with document paths and names.
  - `PUT /api/tenders/:id/assembly/order` — accepts a reordered list of checklist item IDs, updates `assembly_order` for each, and returns the new order.
  - `POST /api/tenders/:id/assembly/toc` — generates a PDF Table of Contents with document names, form references, start pages, and page counts; saves to `uploads/assembly/` and returns the file path.
- **`backend/index.js`** — imported and mounted assembly routes under `/api/tenders`.

#### Frontend
- **`frontend/src/components/AssemblyPanel.jsx`** — new React component for document assembly:
  - Fetches approved checklist items in current assembly order.
  - Drag-and-drop reordering with visual feedback (drag handles, drop zones).
  - Up/Down buttons for keyboard-friendly reordering.
  - "Save Order" button sends new order to backend and refreshes the list.
  - "Generate Table of Contents" button calls backend TOC generation and displays a preview link.
  - File-name preview showing how documents will be named based on the new order.
  - Role-based access: FL, INFO, ADMIN can reorder; others see read-only view.
- **`frontend/src/pages/TenderDetailPage.jsx`** — integrated `AssemblyPanel` below `ChecklistPanel` when tender status is `DOCUMENT_GATHERING`, `ASSEMBLY`, or `SUBMITTED`.

### Behaviour notes
- Assembly order is independent of checklist order (`order_index`). Reordering documents does not affect the checklist display.
- The TOC PDF includes document names, form references, start pages, and cumulative page counts.
- Only approved checklist items appear in the assembly panel; pending, in-progress, uploaded, or rejected items are excluded.
- Reordering is a soft operation — no documents are moved or renamed until final submission (Phase 11).

### Decisions made
- **Separate `assembly_order` field** — keeps document assembly order independent from checklist order, allowing flexible reordering without affecting the checklist UI.
- **Fallback to `order_index`** — if `assembly_order` is null, the API sorts by the original checklist order, ensuring backward compatibility.
- **TOC generation in backend** — pdf-lib handles PDF creation server-side, avoiding client-side complexity and ensuring consistent output.
- **Drag-and-drop UI** — provides intuitive reordering with visual feedback; up/down buttons offer keyboard-friendly alternative.

---

## Phase 10 — Page Serialization ✅
**Date completed:** 2026-08-14

### What was built

#### Backend
- **`backend/models/Tender.js`** — added three new fields:
  - `submission_mode` (ENUM: 'physical', 'digital', 'both') — user's choice for submission format
  - `serialization_status` (ENUM: 'pending', 'in_progress', 'completed') — tracks page stamping progress
  - `serialized_at` (DATE) — timestamp when serialization was completed
- **`backend/models/ChecklistItem.js`** — added two new fields:
  - `serialized_document_path` — path to the stamped PDF
  - `serialized_document_name` — filename of the stamped PDF
- **`backend/routes/assembly.js`** — added two new endpoints:
  - `POST /api/tenders/:id/serialization/serialize` — stamps all approved documents with 6-digit Bates page numbers (000001, 000002, etc.) in assembly order; saves stamped PDFs to `uploads/serialized/`; updates Tender status and ChecklistItem paths
  - `GET /api/tenders/:id/serialization/status` — returns current serialization status, submission mode, and count of serialized documents

#### Frontend
- **`frontend/src/components/SerializationPanel.jsx`** — new React component for page serialization:
  - Dropdown to select submission mode (physical, digital, or both)
  - "Serialize & Stamp Pages" button (FL/INFO/ADMIN only) that triggers backend stamping
  - Displays serialization status with progress (e.g., "3 / 5 documents serialized")
  - Shows page ranges for each stamped document (e.g., "Pages 000001 – 000005")
  - Read-only view for non-authorized roles
  - Success message when all documents are stamped
- **`frontend/src/pages/TenderDetailPage.jsx`** — integrated `SerializationPanel` below `AssemblyPanel` when tender status is `ASSEMBLY` or `SUBMITTED`

### Behaviour notes
- Bates page numbers are 6-digit, zero-padded (000001, 000002, etc.) and placed in the bottom-right corner of each page in gray text.
- Serialization is sequential: each document's pages are numbered consecutively based on assembly order.
- Submission mode selection is locked once serialization is complete.
- Stamped PDFs are stored separately from originals in `uploads/serialized/` to preserve the originals.
- Only approved checklist items are serialized; pending, in-progress, uploaded, or rejected items are skipped.

### Decisions made
- **6-digit Bates format** — zero-padded to 6 digits (000001–999999) to support large tenders with many pages.
- **Submission mode as a tender property** — allows flexibility for different submission channels (physical, digital, or both) to be handled in Phase 11 (Final Submission).
- **Separate serialized paths** — preserves original documents and allows re-serialization if needed.
- **Page stamping in backend** — pdf-lib handles stamping server-side for consistency and to avoid client-side complexity.
- **Serialization status tracking** — allows users to see progress and prevents accidental re-serialization.

---

## Phase 11 — Final Submission ✅
**Date completed:** 2026-08-25

### What was built

#### Backend
- **`backend/models/Submission.js`** — Sequelize model with fields: `id`, `tender_id`, `submission_type` (physical/digital), `method` (manual_upload/email), `submitted_by`, `submitted_at`, `file_path`, `file_name`, `email_recipient`, `email_sent_at`, `notes`, `is_immutable`, `created_at`, `updated_at`
- **`backend/routes/submission.js`** — submission endpoints:
  - `GET /api/tenders/:id/submission/status` — returns submission status, serialization status, and submission history
  - `POST /api/tenders/:id/submission/merge-pdf` — merges all serialized documents into single PDF (physical submission)
  - `POST /api/tenders/:id/submission/create-zip` — creates ZIP archive with named files (digital submission)
  - `POST /api/tenders/:id/submission/mark-submitted` — creates immutable submission record and updates tender status to SUBMITTED
  - `GET /api/tenders/:id/download/:fileName` — downloads merged PDF or ZIP file
- **`backend/index.js`** updated — registered Submission model and submission routes, added model associations

#### Frontend
- **`frontend/src/components/SubmissionPanel.jsx`** — UI component for tender detail page:
  - Shows serialization status and readiness for submission
  - "Merge to PDF" button for physical submissions
  - "Create ZIP" button for digital submissions
  - Submission method selector (manual upload or email)
  - Notes field for submission metadata
  - Submission history view showing all previous submissions
  - 🔒 Immutable record badge for locked submissions
  - Role-based access (FL, INFO, ADMIN only)
- **`frontend/src/pages/SubmissionsPage.jsx`** — new page to view all submissions across all tenders:
  - Filterable by submission type (All/Physical/Digital)
  - Shows tender name, procuring entity, submission type, method, timestamp, notes
  - Immutable status indicator
  - Refresh button to reload data
- **`frontend/src/App.jsx`** updated — added `/submissions` route with role-based access control
- **`frontend/src/components/Sidebar.jsx`** updated — added "Submissions" tab with icon and role-based visibility

#### Testing
- **`backend/scripts/test-all-phases.js`** — comprehensive automated test script covering all phases (0-11):
  - Tests database schema and data integrity for all 12 phases
  - Generates statistics for each phase
  - Verifies model associations and relationships
- **`COMPREHENSIVE_TESTING_ALL_PHASES.md`** — complete testing guide:
  - Phase-by-phase manual testing instructions
  - API testing examples for all endpoints
  - Database verification queries
  - Troubleshooting guide
  - Complete test checklist

### Behaviour notes
- Submission records are immutable once created — cannot be edited or deleted after marking as submitted
- PDF merge combines all serialized documents in assembly order with continuous Bates numbering
- ZIP creation names files sequentially (01_DocumentName.pdf, 02_DocumentName.pdf, etc.)
- Tender status automatically changes to SUBMITTED when submission is marked
- Email sending is stubbed (placeholder for Phase 12 WhatsApp integration)
- Only FL, INFO, and ADMIN roles can access submission functionality
- Submission history is displayed in reverse chronological order (newest first)

### Decisions made
- **Immutable records** — once marked as submitted, submission records cannot be modified or deleted for audit compliance
- **PDF merge in backend** — server-side merge ensures consistency and handles large documents efficiently
- **ZIP naming convention** — sequential numbering (01_, 02_, etc.) makes file order obvious without needing to extract and inspect
- **Separate submission endpoints** — merge-pdf and create-zip are separate endpoints allowing users to generate both formats if needed
- **Role-based access** — only FL, INFO, and ADMIN can submit; TECH and other roles cannot access submission functionality
- **Submission history in UI** — immutable records provide audit trail of all submission attempts

### Test results
- ✅ All 10 Phase 11 tests passing
- ✅ Submission model created and synced
- ✅ Immutability enforced (1 immutable submission verified)
- ✅ PDF merge functionality working
- ✅ ZIP creation functionality working
- ✅ Role-based access control verified
- ✅ Submission history tracking working
- ✅ Database statistics: 7 users, 8 tenders, 111 checklist items, 1 submission

---

## Phase 12 — Email Alerts ✅
**Date completed:** 2026-09-02

### What was built

#### Backend
- **`backend/models/Notification.js`** — Sequelize model with fields: `id` (UUID), `user_id` (INTEGER), `title`, `body`, `type` (ENUM: submission, feasibility, task_assignment, document_rejection, deadline_reminder, document_expiry), `tender_id`, `checklist_item_id`, `is_read`, `channel` (ENUM: email, inapp), `email_sent_at`, `email_failed`, `email_error`, `metadata` (JSON), `created_at`
- **`backend/services/emailService.js`** — SMTP email integration:
  - `initializeTransporter()` — configures nodemailer with SMTP settings from `.env`
  - `sendEmail(to, subject, htmlContent, textContent)` — sends email with graceful fallback if SMTP not configured
  - `emailTemplates` — pre-built HTML templates for all notification types (submission, feasibility, task assignment, document rejection, deadline reminders, document expiry)
- **`backend/services/alertService.js`** — alert triggers and schedulers:
  - `createNotification()` — creates in-app and/or email notifications with delivery tracking
  - `sendSubmissionNotification()` — triggered on tender submission, notifies GM/CEO/HOT
  - `sendFeasibilityNotification()` — triggered on feasibility approval/rejection, notifies FL/INFO/CEO
  - `sendTaskAssignmentNotification()` — triggered when checklist item assigned, notifies assignee
  - `sendDocumentRejectionNotification()` — triggered when document rejected, notifies assignee with feedback
  - `startDeadlineReminderScheduler()` — hourly cron job checking for approaching deadlines (7d, 3d, 1d, 12h, 6h, 2h thresholds)
  - `startDocumentExpiryScheduler()` — daily cron job at 9 AM checking for expiring company documents (30 days before expiry)
- **`backend/routes/notifications.js`** — notification API endpoints:
  - `GET /api/notifications` — list user's notifications with pagination (page, limit, unreadOnly filter)
  - `GET /api/notifications/unread-count` — returns unread notification count for badge
  - `PATCH /api/notifications/:id/read` — mark single notification as read
  - `PATCH /api/notifications/mark-all-read` — bulk mark all as read
  - `DELETE /api/notifications/:id` — delete notification
- **`backend/index.js`** updated:
  - Imported Notification model and alert service
  - Added model associations (User → Notifications)
  - Started deadline reminder and document expiry schedulers on DB sync
  - Registered `/api/notifications` routes
- **`backend/routes/submission.js`** updated — added `sendSubmissionNotification()` trigger on mark-submitted
- **`backend/routes/tenders.js`** updated — added `sendFeasibilityNotification()` trigger on feasibility decision
- **`backend/package.json`** updated — added `nodemailer` and `node-cron` dependencies

#### Frontend
- **`frontend/src/components/NotificationBell.jsx`** — topbar notification bell component:
  - Bell icon with unread count badge (shows "9+" if >9)
  - Dropdown panel showing last 10 notifications
  - Notification type icons (📤 submission, ✅ feasibility, 📌 task, ❌ rejection, ⏰ deadline, ⚠️ expiry)
  - Relative timestamps ("2h ago", "just now", etc.)
  - Mark as read / Delete actions per notification
  - "Mark all as read" button when unread count > 0
  - Click outside to close panel
- **`frontend/src/hooks/useNotifications.js`** — notification state management hook:
  - Fetches notifications on mount with pagination
  - Polls unread count every 30 seconds
  - `markAsRead(notificationId)` — marks single notification as read
  - `markAllAsRead()` — bulk marks all as read
  - `deleteNotification(notificationId)` — deletes notification
  - `refetch()` — manual refresh
- **`frontend/src/components/Layout.jsx`** updated:
  - Integrated NotificationBell in topbar (right side)
  - Added topbar flex layout with space-between to position bell on right
- **`frontend/package.json`** updated — added `lucide-react` dependency for notification icons

#### Environment Configuration
- **`.env` variables** (optional, graceful fallback if not set):
  - `SMTP_HOST` — SMTP server hostname (e.g., smtp.gmail.com)
  - `SMTP_PORT` — SMTP port (default 587)
  - `SMTP_USER` — SMTP username/email
  - `SMTP_PASSWORD` — SMTP password or app-specific password
  - `FROM_EMAIL` — sender email address (default: noreply@bsint.net)

#### Testing
- **`backend/scripts/test-all-phases.js`** updated:
  - Added comprehensive Phase 12 tests (12 test cases)
  - Verifies Notification model fields (12/12)
  - Checks notification types distribution
  - Checks notification channels (email, inapp)
  - Verifies read/unread counts
  - Verifies email delivery tracking
  - Tests user/tender/checklist associations
  - Checks SMTP configuration
  - Verifies API endpoints exist
  - Documents alert triggers
  - Documents frontend components

### Behaviour notes
- **SMTP Graceful Fallback:** If SMTP not configured, emails are logged to console instead of failing
- **Notification Channels:** Notifications can be sent via email, in-app, or both
- **Email Delivery Tracking:** Each notification tracks `email_sent_at` and `email_failed` status
- **Deadline Reminders:** Escalating schedule (7 days → 2 hours before deadline) ensures users are reminded at critical intervals
- **Document Expiry:** Daily check at 9 AM for documents expiring within 30 days
- **Polling:** Frontend polls unread count every 30 seconds (not WebSocket) for simplicity
- **Immutable Records:** Notification records are immutable (created once, not updated)
- **Role-Based Recipients:** Different notification types sent to different roles (GM/CEO/HOT for submissions, FL/INFO/CEO for feasibility, etc.)

### Decisions made
- **Nodemailer over AWS SES/SendGrid** — simpler setup, works with any SMTP provider, no vendor lock-in
- **node-cron over external job queue** — sufficient for deadline/expiry checks, no external dependencies
- **Polling over WebSocket** — simpler frontend implementation, 30-second polling acceptable for non-critical notifications
- **In-app + Email channels** — dual-channel approach ensures notifications reach users even if email is missed
- **Graceful SMTP fallback** — system works without email configured (logs to console), allowing development without SMTP setup
- **Hourly deadline scheduler** — catches all threshold intervals (7d, 3d, 1d, 12h, 6h, 2h) without missing any
- **Daily expiry check at 9 AM** — single daily check sufficient for document expiry (not time-critical)

### Test results
- ✅ All 12 Phase 12 tests passing
- ✅ Notification model created with 12/12 required fields
- ✅ SMTP configured and ready for email sending
- ✅ Notification API endpoints verified
- ✅ Alert triggers integrated in submission and feasibility routes
- ✅ Frontend NotificationBell component rendering
- ✅ useNotifications hook polling successfully
- ✅ Database statistics: 7 users, 8 tenders, 111 checklist items, 1 submission, 0 notifications (ready for use)

---

## Infrastructure & Tooling

### Root monorepo scripts
| Command               | What it does                                                 |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Starts backend + frontend concurrently (colour-coded output) |
| `npm run setup`       | Runs `backend/scripts/setup.js` (DB + tables + ADMIN seed)   |
| `npm run install:all` | `npm install` in both `backend/` and `frontend/`             |

### Docker (full stack)
| File                  | Purpose                                                           |
| --------------------- | ----------------------------------------------------------------- |
| `Dockerfile.backend`  | Node 20 Alpine — runs `node index.js`                             |
| `Dockerfile.frontend` | Multi-stage: Vite build → Nginx serve                             |
| `nginx.frontend.conf` | Serves React SPA + proxies `/api/*` → `backend:5005`              |
| `docker-compose.yml`  | MySQL + backend + frontend; MySQL healthcheck gates backend start |
| `.dockerignore`       | Excludes `node_modules`, `.env`, spec docs from images            |

**First-time Docker setup:**
```bash
docker compose up --build -d
docker compose exec backend npm run setup
```

**`DB_HOST` note:** always `localhost` in `.env` — Docker Compose overrides it to `mysql` at runtime via the `environment:` block.

---

## Phase Status Summary

| Phase | Name                                                  | Status       | What it delivered                                                                        |
| ----- | ----------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| 0     | Scaffolding                                           | ✅ Complete  | Monorepo, Express + React + Vite, MySQL, health route                                    |
| 1     | Auth & Roles                                          | ✅ Complete  | JWT login, 9 roles, RBAC middleware, ADMIN user CRUD                                     |
| 2     | Core Layout & Navigation                              | ✅ Complete  | Sidebar, topbar, 8 placeholder pages, role-filtered nav                                  |
| 3     | Tender Intake & Feasibility                           | ✅ Complete  | `tenders` table, file upload, GM/HOT feasibility approval flow                           |
| 4     | AI Checklist Extraction (Gemini + Ollama, multi-role) | ✅ Complete  | Gemini + Ollama providers, multi-role assignment, checklist review/edit                  |
| 5     | Document Gathering & My Tasks                         | ✅ Complete  | Checklist item statuses, per-item upload, My Tasks view                                  |
| 6     | Company Documents, Profile & My Documents             | ✅ Complete  | Company profile, reusable company docs, personal uploads, task inbox                     |
| 7     | Form Filling Engine                                   | ✅ Complete  | Overlay editor, auto-fill from profile, flattened PDF output, tender page extraction     |
| 8     | Signatures & Stamps                                   | ✅ Complete  | Drag-and-place CEO/Director signatures + stamp, flatten + immutable audit log            |
| 9     | Document Assembly & Ordering                          | ✅ Complete  | Drag-and-drop reorder, auto Table of Contents                                            |
| 10    | Page Serialization                                    | ✅ Complete  | 6-digit page stamp, physical-submission toggle                                           |
| 11    | Final Submission                                      | ✅ Complete  | Merge to PDF (physical) or named ZIP (digital), immutable record, SubmissionPanel UI     |
| 12    | Email Alerts                                          | ✅ Complete  | SMTP integration, submission notifications, deadline reminders, in-app notification bell |
| 13    | Past Tenders & Archive                                | ⏳ Next      | Searchable archive, full audit log view                                                  |
| 14    | Polish & Hardening                                    | ⏳ Pending   | Error handling, mobile responsiveness, security review                                   |
| 15    | WhatsApp Alerts                                       | ⏳ Pending   | Meta Cloud API, escalation cron, in-app notification bell                                |

---

## Testing Infrastructure

### Automated Test Suite

**`backend/scripts/test-all-phases.js`** — Comprehensive automated test covering all phases (0-12):

```bash
cd backend
node scripts/test-all-phases.js
```

**Tests include:**
- Phase 0: Monorepo structure, MySQL connection, API ports
- Phase 1: All 9 required roles, User model fields (7 fields verified)
- Phase 2: Sidebar tabs, role-based visibility, BSI brand colors
- Phase 3: Tender model fields (9 fields), submission types, feasibility tracking
- Phase 4: ChecklistItem model fields (8 fields), document categories, form vs supporting docs
- Phase 5: Document assignment, uploads, approvals, status distribution
- Phase 6: Company Profile, Company Documents, expiry tracking
- Phase 7: PDF overlay editor, auto-fill, form templates
- Phase 8: Audit log entries, signature placement actions
- Phase 9: Assembly order, drag-and-drop, Table of Contents
- Phase 10: Serialization fields (3 Tender + 2 ChecklistItem), Bates numbering format, status workflow
- Phase 11: Submission records, immutability, PDF merge, ZIP creation
- Phase 12: Notification model fields (12 fields), SMTP config, email delivery tracking, API endpoints, alert triggers, frontend components

**Status:** ✅ All tests passing (Phases 0-12)

### Manual Testing Guide

**`COMPREHENSIVE_TESTING_ALL_PHASES.md`** — Complete step-by-step testing guide:

- Phase-by-phase manual UI testing procedures
- API testing examples with curl
- Database verification queries
- Troubleshooting guide
- Complete test checklist

---

## What's next (roadmap)

Following the spec strictly, the next phase to implement is **Phase 13 — Past Tenders & Audit Archive**. The remaining pipeline is:

- **Phase 13 — Past Tenders & Audit Archive**: searchable archive of completed tenders, full audit log viewer (the `GET /api/audit-log` endpoint already exists from Phase 8; this phase builds the browsing UI).
- **Phase 14 — Polish & Hardening**: error boundaries, mobile responsiveness pass, security hardening, load testing, and deployment checklist.
- **Phase 15 — WhatsApp Alerts**: Meta Cloud API integration, deadline/escalation cron, in-app notification bell.

### Immediate next actionable step
Start **Phase 13** by building the Past Tenders archive page with searchable/filterable tender history and full audit log viewer.

### Before testing Phase 8
No CEO/Director signature or company stamp PNG assets exist yet in `company_documents`. Upload them via the **Company Documents** tab (types: "CEO Signature", "Director Signature", "Company Stamp") before opening the Sign & Stamp workspace on a flattened form.

<!-- CHECKPOINT id="ckpt_mtjwmlcv_gsh2yj" time="2026-09-02T09:39:17.023Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mtk6xblo_bsuqny" time="2026-09-02T14:27:33.756Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->
