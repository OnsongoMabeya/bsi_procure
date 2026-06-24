# BSI Procurement System

Monorepo for the BSI tender/procurement management system.

## Structure

- `/backend` — Express.js API
- `/frontend` — React (Vite) SPA
- `/shared` — Shared constants/types

## Quick start

> **Prerequisites:** Node.js ≥ 18, MySQL 8 running locally (user `john`, password configured in `.env`).

1. Install backend dependencies and run the one-time setup (creates DB, tables, default ADMIN):

   ```bash
   cd backend
   npm install
   npm run setup
   # Default ADMIN — change password after first login:
   #   Email:    admin@bsint.net
   #   Password: Admin@123
   ```

2. Start the backend:

   ```bash
   npm run dev
   ```

3. In a new terminal, install and run the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open <http://localhost:3005> — you will be redirected to the login page. Backend API runs on port 5005.

> **Re-running setup is safe** — it skips any steps that are already done (existing DB, existing tables, existing users).

## Implementation Phases

The full phase plan lives in `BSI_Implementation_Phasing_Instructions.md` (kept local-only, not pushed to GitHub).

| Phase | Name                                | Status                              |
|-------|-------------------------------------|-------------------------------------|
| 0     | Scaffolding                         | ✅ Complete                         |
| 1     | Auth & Roles                        | ✅ Complete                         |
| 2     | Core Layout & Navigation            | ⏳ Next                             |
| 3     | Tender Intake & Feasibility         | ⏳ Pending                          |
| 4     | AI Checklist Extraction             | ⏳ Pending                          |
| 5     | Document Gathering & My Tasks       | ⏳ Pending                          |
| 6     | Company Documents & Company Profile | ⏳ Pending                          |
| 7     | Form Filling Engine                 | ⏳ Pending                          |
| 8     | Signatures & Stamps                 | ⏳ Pending                          |
| 9     | Document Assembly & Ordering        | ⏳ Pending                          |
| 10    | Page Serialization                  | ⏳ Pending                          |
| 11    | Final Submission                    | ⏳ Pending                          |
| 12    | WhatsApp Alerts                     | ⏳ Pending                          |
| 13    | Past Tenders & Audit Archive        | ⏳ Pending                          |
| 14    | Polish & Hardening                  | ⏳ Pending                          |

## Environment variables

Copy `.env.example` to `.env` and fill in the real values for:

- Database credentials (`DB_*`)
- JWT secret (`JWT_SECRET`)
- LLM provider key (`LLM_API_KEY`)
- Meta WhatsApp token (`META_API_TOKEN`, etc.)
- SMTP credentials
