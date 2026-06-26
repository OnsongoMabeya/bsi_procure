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

## Docker deployment (recommended for the physical server)

> **Prerequisites:** Docker and Docker Compose installed.

1. Copy and fill in the backend env file:

   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env — set DB_USER, DB_PASSWORD, DB_ROOT_PASSWORD, JWT_SECRET, etc.
   ```

2. Build and start all containers (MySQL + backend + frontend):

   ```bash
   docker compose up --build -d
   ```

3. Run setup inside the backend container (first time only — creates DB, tables, ADMIN user):

   ```bash
   docker compose exec backend npm run setup
   ```

4. Open <http://localhost:3005>

**Useful commands:**

```bash
docker compose logs -f          # live logs from all containers
docker compose logs -f backend  # backend logs only
docker compose down             # stop all containers (data persisted in volume)
docker compose down -v          # stop + wipe database volume
docker compose up --build -d    # rebuild after code changes
```

> **Note:** When running via Docker, `DB_HOST` in `.env` should be `localhost` for local dev (non-Docker).
> Docker Compose automatically overrides it to `mysql` (the container name) at runtime — you do not need to change your `.env`.

### AI / LLM setup

By default the app bundles **Ollama** (a free, local LLM runner) inside Docker Compose.

```env
# backend/.env
LLM_PROVIDER=ollama
LLM_OLLAMA_URL=http://ollama:11434
LLM_OLLAMA_MODEL=llama3.1
```

The default model is `llama3.1` (fast, capable, permissive license). On first start the Ollama container downloads the model — this may take several minutes depending on your connection. The model is cached in a Docker volume, so subsequent restarts are fast.

To use a different free model, change `LLM_OLLAMA_MODEL` to any model from <https://ollama.com/library> (e.g. `mistral`, `qwen2.5`, `gemma2`) and restart:

```bash
docker compose down
docker compose up --build -d
```

To use **Google Gemini** instead, set `LLM_PROVIDER=gemini` and add your API key from <https://aistudio.google.com/apikey>:

```env
LLM_PROVIDER=gemini
LLM_API_KEY=your-gemini-key-here
```

## Implementation Phases

The full phase plan lives in `BSI_Implementation_Phasing_Instructions.md` (kept local-only, not pushed to GitHub).

| Phase | Name                                | Status                              |
|-------|-------------------------------------|-------------------------------------|
| 0     | Scaffolding                         | ✅ Complete                         |
| 1     | Auth & Roles                        | ✅ Complete                         |
| 2     | Core Layout & Navigation            | ✅ Complete                         |
| 3     | Tender Intake & Feasibility         | ✅ Complete                         |
| 4     | AI Checklist Extraction             | ✅ Complete                         |
| 5     | Document Gathering & My Tasks       | ⏳ Next                             |
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
