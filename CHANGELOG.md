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

## Upcoming

| Phase | Name                                 | What it will deliver                                             |
| ----- | ------------------------------------ | ---------------------------------------------------------------- |
| 3.    | Tender Intake & Feasibility          | `tenders` table, file upload, GM/HOT feasibility approval flow   |
| 4.    | AI Checklist Extraction              | Gemini integration, checklist saved to DB, FL/INFO review/edit   |
| 5.    | Document Gathering & My Tasks        | Checklist item statuses, per-item upload, My Tasks view          |
| 6.    | Company Documents & Profile          | Stamp/signature/cert library, BSI profile seed data              |
| 7.    | Form Filling Engine                  | Overlay editor, auto-fill from profile, flattened PDF output     |
| 8.    | Signatures & Stamps                  | Drag-and-place assets, flatten + immutable audit log             |
| 9.    | Document Assembly & Ordering         | Drag-and-drop reorder, auto Table of Contents                    |
| 10.   | Page Serialization                   | 6-digit page stamp, physical-submission toggle                   |
| 11.   | Final Submission                     | Merge to PDF (physical) or named ZIP (digital), immutable record |
| 12.   | WhatsApp Alerts                      | Meta Cloud API, escalation cron, in-app notification bell        |
| 13.   | Past Tenders & Archive               | Searchable archive, full audit log view                          |
| 14.   | Polish & Hardening                   | Error handling, mobile responsiveness, security review           |
