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

| Phase | Name                                                  | Status       | What it delivered                                                       |
| ----- | ----------------------------------------------------- | ------------ | ----------------------------------------------------------------------- |
| 0     | Scaffolding                                           | ✅ Complete  | Monorepo, Express + React + Vite, MySQL, health route                   |
| 1     | Auth & Roles                                          | ✅ Complete  | JWT login, 9 roles, RBAC middleware, ADMIN user CRUD                    |
| 2     | Core Layout & Navigation                              | ✅ Complete  | Sidebar, topbar, 8 placeholder pages, role-filtered nav                 |
| 3     | Tender Intake & Feasibility                           | ✅ Complete  | `tenders` table, file upload, GM/HOT feasibility approval flow          |
| 4     | AI Checklist Extraction (Gemini + Ollama, multi-role) | ✅ Complete  | Gemini + Ollama providers, multi-role assignment, checklist review/edit |
| 5     | Document Gathering & My Tasks                         | ✅ Complete  | Checklist item statuses, per-item upload, My Tasks view                 |
| 6     | Company Documents & Profile                           | ⏳ Next      | Stamp/signature/cert library, BSI profile seed data                     |
| 7     | Form Filling Engine                                   | ⏳ Pending   | Overlay editor, auto-fill from profile, flattened PDF output            |
| 8     | Signatures & Stamps                                   | ⏳ Pending   | Drag-and-place assets, flatten + immutable audit log                    |
| 9     | Document Assembly & Ordering                          | ⏳ Pending   | Drag-and-drop reorder, auto Table of Contents                           |
| 10    | Page Serialization                                    | ⏳ Pending   | 6-digit page stamp, physical-submission toggle                          |
| 11    | Final Submission                                      | ⏳ Pending   | Merge to PDF (physical) or named ZIP (digital), immutable record        |
| 12    | WhatsApp Alerts                                       | ⏳ Pending   | Meta Cloud API, escalation cron, in-app notification bell               |
| 13    | Past Tenders & Archive                                | ⏳ Pending   | Searchable archive, full audit log view                                 |
| 14    | Polish & Hardening                                    | ⏳ Pending   | Error handling, mobile responsiveness, security review                  |
