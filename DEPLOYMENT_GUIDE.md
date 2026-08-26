# Deployment Guide — BSI Procurement System

This guide explains how to deploy the dockerized BSI Procurement System to a server (on-premise or cloud).

---

## Prerequisites

### Server Requirements

- **OS:** Linux (Ubuntu 20.04+ recommended), macOS, or Windows Server with Docker Desktop
- **RAM:** Minimum 8GB (16GB recommended)
- **Storage:** Minimum 50GB (for uploads, database, and Ollama models)
- **CPU:** 4 cores minimum (8+ recommended for Ollama)
- **Docker:** Docker Engine 20.10+ and Docker Compose 2.0+
- **Network:** Outbound HTTPS for LLM API calls (Gemini, Claude, OpenAI)

### Install Docker & Docker Compose

**Ubuntu/Debian:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

**macOS:**
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop
# Docker Compose is included
```

**Windows Server:**
```powershell
# Install Docker Desktop or Docker Engine for Windows Server
# Follow: https://docs.docker.com/engine/install/windows-server/
```

---

## Deployment Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/OnsongoMabeya/bsi_procure.git
cd bsi_procure
```

### Step 2: Configure Environment Variables

Copy the example environment file and fill in your secrets:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your actual values:

```env
# Database
DB_HOST=mysql
DB_PORT=3306
DB_NAME=bsi_procurement
DB_USER=bsi_user
DB_PASSWORD=<STRONG_PASSWORD_HERE>
DB_ROOT_PASSWORD=<STRONG_ROOT_PASSWORD_HERE>

# JWT
JWT_SECRET=<GENERATE_RANDOM_SECRET>

# LLM Provider (default: gemini)
LLM_PROVIDER=gemini
LLM_API_KEY=<YOUR_GEMINI_API_KEY>

# Ollama (if using local LLM)
LLM_OLLAMA_MODEL=llama3.1

# Meta WhatsApp (for Phase 12)
META_API_TOKEN=<YOUR_META_TOKEN>
META_PHONE_NUMBER_ID=<YOUR_PHONE_ID>
META_BUSINESS_ACCOUNT_ID=<YOUR_BUSINESS_ID>

# SMTP (for email submissions)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<YOUR_EMAIL>
SMTP_PASSWORD=<YOUR_APP_PASSWORD>
SMTP_FROM=noreply@bsint.net

# Frontend
VITE_API_URL=http://localhost:5005
```

### Step 3: Build and Start Containers

```bash
# Build images (first time only)
docker-compose build

# Start all services
docker-compose up -d

# Verify all containers are running
docker ps
```

Expected output:
```
CONTAINER ID   IMAGE                    STATUS              PORTS
abc123def456   bsi-tender-process-frontend   Up 2 minutes    0.0.0.0:3005->3005/tcp
def456ghi789   bsi-tender-process-backend    Up 2 minutes    0.0.0.0:5005->5005/tcp
ghi789jkl012   mysql:8.0                     Up 3 minutes    0.0.0.0:3306->3306/tcp
jkl012mno345   bsi-tender-process-ollama     Up 2 minutes    (no ports)
```

### Step 4: Initialize Database

On first deployment, set up the database schema:

```bash
# Run setup script inside backend container
docker-compose exec backend npm run setup
```

This will:
- Create database tables
- Seed default ADMIN user
- Set up Sequelize models

### Step 5: Verify Deployment

**Check backend health:**
```bash
curl http://localhost:5005/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-08-26T12:00:00Z"
}
```

**Access frontend:**
- Open browser: `http://localhost:3005`
- Login with default credentials:
  - Email: `admin@bsint.net`
  - Password: `admin`

**Check container logs:**
```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Ollama logs
docker-compose logs -f ollama

# MySQL logs
docker-compose logs -f mysql
```

---

## Production Deployment

### Domain & SSL Setup

**1. Configure Nginx Reverse Proxy**

Create `/etc/nginx/sites-available/bsi-procurement`:

```nginx
upstream backend {
    server localhost:5005;
}

upstream frontend {
    server localhost:3005;
}

server {
    listen 80;
    server_name bsi-procurement.example.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bsi-procurement.example.com;
    
    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/bsi-procurement.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bsi-procurement.example.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/bsi-procurement /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**2. Set Up SSL with Let's Encrypt**

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d bsi-procurement.example.com
```

### Database Backup

**Automated daily backup:**

Create `/usr/local/bin/backup-bsi-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/bsi-procurement"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MySQL
docker-compose exec -T mysql mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} | gzip > $BACKUP_DIR/db_${DATE}.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_${DATE}.tar.gz /var/lib/docker/volumes/bsi_procurement_uploads_data/_data

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
```

Make it executable and add to crontab:
```bash
chmod +x /usr/local/bin/backup-bsi-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-bsi-db.sh
```

### Monitoring & Logs

**Check container status:**
```bash
docker-compose ps
```

**View real-time logs:**
```bash
docker-compose logs -f
```

**Check resource usage:**
```bash
docker stats
```

---

## Common Operations

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Restart services
docker-compose up -d
```

### View Database

```bash
# Connect to MySQL
docker-compose exec mysql mysql -u bsi_user -p bsi_procurement

# Or use a GUI tool (MySQL Workbench, DBeaver)
# Host: localhost:3306
# User: bsi_user
# Password: (from .env)
```

### Scale Services

```bash
# Run multiple backend instances (with load balancer)
docker-compose up -d --scale backend=3
```

### Stop Services

```bash
# Stop all services (keep data)
docker-compose stop

# Stop and remove containers (keep volumes)
docker-compose down

# Stop and remove everything (including data!)
docker-compose down -v
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Port already in use: Change port in docker-compose.yml
# - Database not ready: Wait 30 seconds and retry
# - Environment variables missing: Check backend/.env
```

### Database connection error

```bash
# Verify MySQL is healthy
docker-compose ps mysql

# Check MySQL logs
docker-compose logs mysql

# Restart MySQL
docker-compose restart mysql
```

### Ollama model not loading

```bash
# Check Ollama logs
docker-compose logs ollama

# Verify model is available
docker-compose exec ollama ollama list

# Pull model manually
docker-compose exec ollama ollama pull llama3.1
```

### Out of disk space

```bash
# Check Docker disk usage
docker system df

# Clean up unused images/volumes
docker system prune -a

# Remove old backups
rm -rf /backups/bsi-procurement/*.gz
```

---

## Security Checklist

- [ ] Change default ADMIN password immediately after first login
- [ ] Set strong DB_PASSWORD and DB_ROOT_PASSWORD in .env
- [ ] Generate random JWT_SECRET
- [ ] Enable SSL/TLS (HTTPS)
- [ ] Configure firewall to allow only necessary ports (80, 443)
- [ ] Set up automated database backups
- [ ] Enable Docker container restart policies (`restart: unless-stopped`)
- [ ] Keep Docker and OS packages updated
- [ ] Use environment variables for all secrets (never hardcode)
- [ ] Restrict database access to backend container only
- [ ] Enable audit logging (already built-in)

---

## Performance Tuning

### MySQL Optimization

Edit `docker-compose.yml` MySQL service:

```yaml
mysql:
  command: --max_connections=1000 --default-storage-engine=InnoDB
```

### Ollama GPU Support

If your server has NVIDIA GPU:

```yaml
ollama:
  runtime: nvidia
  environment:
    - CUDA_VISIBLE_DEVICES=0
```

### Backend Scaling

Use PM2 or Docker Swarm for multiple backend instances with load balancing.

---

## Support & Monitoring

**Health Check Endpoints:**
- Backend: `GET http://localhost:5005/api/health`
- Frontend: `GET http://localhost:3005`

**Logs Location:**
```bash
# Docker logs (all containers)
docker-compose logs

# Individual container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mysql
docker-compose logs ollama
```

**Automated Monitoring (Optional):**
- Set up Prometheus + Grafana for metrics
- Set up ELK Stack (Elasticsearch, Logstash, Kibana) for centralized logging
- Set up Sentry for error tracking

---

## Next Steps

1. ✅ Deploy to server
2. ✅ Configure domain and SSL
3. ✅ Set up automated backups
4. ✅ Configure monitoring
5. ⏳ Phase 12: WhatsApp Alerts (requires Meta API setup)
6. ⏳ Phase 13: Past Tenders & Audit Archive
7. ⏳ Phase 14: Polish & Hardening

---

**Questions?** Check logs with `docker-compose logs -f` or review the README.md for development setup.
