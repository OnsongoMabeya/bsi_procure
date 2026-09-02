# Environment Variables Setup Guide

## Development vs Production

Your `.env` file needs **different values** depending on where you're running:

### Development (Local Machine)

**File:** `backend/.env`

```env
NODE_ENV=development
PORT=5005

# Local development - connect to localhost
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bsi_procurement
DB_USER=john
DB_PASSWORD=password
DB_ROOT_PASSWORD=rootpass

JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d

LLM_PROVIDER=ollama
LLM_OLLAMA_URL=http://host.docker.internal:11434
LLM_OLLAMA_MODEL=llama3.1

META_API_TOKEN=
META_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=

FRONTEND_URL=http://localhost:3005
```

**How to run locally:**
```bash
# Start MySQL container only (for development)
docker run -d \
  --name bsi_mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=bsi_procurement \
  -e MYSQL_USER=john \
  -e MYSQL_PASSWORD=password \
  -p 3306:3306 \
  mysql:8.0

# Then run backend and frontend locally (not in Docker)
cd backend && npm start
cd frontend && npm run dev
```

---

### Docker Compose (Local or Server)

**File:** `backend/.env`

```env
NODE_ENV=production
PORT=5005

# Docker Compose - backend connects to mysql service (not localhost)
DB_HOST=mysql
DB_PORT=3306
DB_NAME=bsi_procurement
DB_USER=john
DB_PASSWORD=password
DB_ROOT_PASSWORD=rootpass

JWT_SECRET=your-strong-random-secret-here
JWT_EXPIRES_IN=7d

# Ollama inside Docker Compose
LLM_PROVIDER=ollama
LLM_OLLAMA_URL=http://ollama:11434
LLM_OLLAMA_MODEL=llama3.1

# Or use cloud provider
# LLM_PROVIDER=gemini
# LLM_API_KEY=your-gemini-api-key

META_API_TOKEN=your-meta-token
META_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-id

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@bsint.net

FRONTEND_URL=http://localhost:3005
```

**How to run with Docker Compose:**
```bash
docker-compose up -d
```

---

## Key Differences

| Setting          | Development (Local)                 | Docker Compose         |
|------------------|-------------------------------------|------------------------|
| `DB_HOST`        | `localhost`                         | `mysql`                |
| `LLM_OLLAMA_URL` | `http://host.docker.internal:11434` | `http://ollama:11434`  |
| `NODE_ENV`       | `development`                       | `production`           |
| Database runs in | Docker container (separate)         | Docker Compose service |
| Backend runs in  | Local machine                       | Docker container       |

---

## Database Container Handling

### Option 1: Docker Compose (Recommended for Deployment)

The `docker-compose.yml` **automatically manages** the MySQL container:

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: bsi_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: bsi_backend
    restart: unless-stopped
    env_file:
      - ./backend/.env
    environment:
      DB_HOST: mysql  # ← Connects to mysql service, not localhost
    ports:
      - "5005:5005"
    depends_on:
      mysql:
        condition: service_healthy  # ← Waits for DB to be ready

volumes:
  mysql_data:  # ← Persistent storage
```

**What happens:**
1. ✅ MySQL container starts automatically
2. ✅ Data persists in `mysql_data` volume (survives container restart)
3. ✅ Backend waits for MySQL to be healthy before starting
4. ✅ Backend connects via `DB_HOST=mysql` (internal Docker network)

**Commands:**
```bash
# Start everything
docker-compose up -d

# Check status
docker-compose ps

# View MySQL logs
docker-compose logs mysql

# Stop (keeps data)
docker-compose stop

# Restart
docker-compose restart mysql

# Remove everything (deletes data!)
docker-compose down -v
```

---

### Option 2: Separate MySQL Container (Development)

If you want to run backend locally but MySQL in Docker:

```bash
# Start MySQL container
docker run -d \
  --name bsi_mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=bsi_procurement \
  -e MYSQL_USER=john \
  -e MYSQL_PASSWORD=password \
  -p 3306:3306 \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0

# Your .env uses DB_HOST=localhost
# Backend runs locally: npm start
```

**Stop/restart:**
```bash
docker stop bsi_mysql
docker start bsi_mysql
docker rm bsi_mysql  # Delete container (keeps volume)
```

---

### Option 3: External MySQL (Production)

If you have a separate MySQL server (not containerized):

```env
DB_HOST=192.168.1.100      # Your MySQL server IP
DB_PORT=3306
DB_NAME=bsi_procurement
DB_USER=john
DB_PASSWORD=strong-password
```

Then run backend in Docker:
```bash
docker-compose up -d backend frontend
# MySQL runs separately (not in Docker)
```

---

## Recommended Setup by Scenario

### 🏠 Local Development
- MySQL: Docker container (`docker run`)
- Backend: Local machine (`npm start`)
- Frontend: Local machine (`npm run dev`)
- `.env`: `DB_HOST=localhost`

### 🐳 Full Docker (Local Testing)
- Everything: Docker Compose
- `.env`: `DB_HOST=mysql`
- Command: `docker-compose up -d`

### 🚀 Production Server
- Everything: Docker Compose
- `.env`: `DB_HOST=mysql` + strong passwords
- SSL/TLS: Nginx reverse proxy
- Backups: Automated daily
- Command: `docker-compose up -d`

---

## Database Persistence

### With Docker Compose

Data is **automatically persisted** in the `mysql_data` volume:

```bash
# Check volumes
docker volume ls

# Inspect volume
docker volume inspect bsi_procurement_mysql_data

# Backup volume
docker run --rm -v bsi_procurement_mysql_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mysql_backup.tar.gz -C /data .

# Restore volume
docker run --rm -v bsi_procurement_mysql_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/mysql_backup.tar.gz -C /data
```

### Manual Database Backup

```bash
# Backup
docker-compose exec mysql mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} > backup.sql

# Restore
docker-compose exec -T mysql mysql -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} < backup.sql
```

---

## Environment Variable Checklist

### Development
- [ ] `DB_HOST=localhost`
- [ ] `LLM_OLLAMA_URL=http://host.docker.internal:11434`
- [ ] `NODE_ENV=development`
- [ ] MySQL running in Docker or locally

### Docker Compose
- [ ] `DB_HOST=mysql`
- [ ] `LLM_OLLAMA_URL=http://ollama:11434`
- [ ] `NODE_ENV=production`
- [ ] Strong `JWT_SECRET`
- [ ] Strong `DB_PASSWORD` and `DB_ROOT_PASSWORD`

### Production
- [ ] All of Docker Compose ✓
- [ ] `FRONTEND_URL=https://bsi-procurement.example.com`
- [ ] Real `LLM_API_KEY` (Gemini/Claude/OpenAI)
- [ ] Real `META_API_TOKEN` (WhatsApp)
- [ ] Real `SMTP_*` credentials (email)
- [ ] SSL certificates configured in Nginx
- [ ] Automated backups enabled

---

## Quick Reference

```bash
# Development: MySQL in Docker, Backend local
docker run -d --name bsi_mysql -e MYSQL_ROOT_PASSWORD=rootpass -e MYSQL_DATABASE=bsi_procurement -e MYSQL_USER=john -e MYSQL_PASSWORD=password -p 3306:3306 mysql:8.0
cd backend && npm start

# Docker Compose: Everything containerized
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop
docker-compose stop

# Restart
docker-compose restart

# Remove (keeps data)
docker-compose down

# Remove everything (deletes data!)
docker-compose down -v
```

---

**Summary:** Your `.env` file is correct for **local development**. For Docker Compose, change `DB_HOST=localhost` to `DB_HOST=mysql` and run `docker-compose up -d`.
