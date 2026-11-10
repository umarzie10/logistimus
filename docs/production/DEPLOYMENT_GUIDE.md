# Deployment Guide — Logistimus

Operational runbook for staging and production deployments.
Follows the architecture documented in `INFRASTRUCTURE_READINESS.md` and
`CICD_READINESS.md`.

---

## 1. Architecture overview

```
Internet ──:80/:443──► Nginx (TLS termination)
                         ├─ api.<domain> ──► api:8000 (Django/Uvicorn, 3 workers)
                         └─ app.<domain> ──► frontend:3000 (Next.js 16 standalone)

Internal network (`logistimus`):
  api ──► db:5432 (PostgreSQL 16 + PostGIS)
  api ──► redis:6379 (Cache / Celery broker db 1 / Celery results db 2)
  api ──► minio:9000 (S3-compatible object storage)
  worker (Celery worker, concurrency 2) ──► redis, db, minio
  beat (Celery beat scheduler) ──► redis
```

**Key security rules:**
- Only Nginx exposes host ports (`80`, `443`).
- `db`, `redis`, `minio`, `api`, `frontend`, `worker`, `beat` are reachable
  **exclusively** on the internal Docker network.
- Secrets live **only on the host** in `.env` and `Backend/.env`. Git and CI
  never hold production credentials.

---

## 2. Initial host setup (one-time)

### 2.1 Host requirements
- Ubuntu 22.04 LTS or Debian 12
- 2+ vCPU, 4+ GB RAM, 40+ GB SSD
- Inbound firewall: ports `22` (SSH), `80` (HTTP), `443` (HTTPS)
- Docker Engine 24+ and Docker Compose v2:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  # Log out and back in
  ```

### 2.2 Clone and directory layout
```bash
sudo mkdir -p /opt/logistimus
sudo chown $USER:$USER /opt/logistimus
git clone https://github.com/Sardor-Dev-2010/Logistimus.git /opt/logistimus
cd /opt/logistimus
```

### 2.3 Create environment files

1. Root `.env` (used by Compose for container variable substitution):
   ```bash
   cp .env.example .env
   chmod 600 .env
   # Edit with strong random passwords:
   # POSTGRES_PASSWORD=<openssl rand -base64 32>
   # MINIO_ROOT_PASSWORD=<openssl rand -base64 32>
   # NEXT_PUBLIC_API_URL=https://api.<domain>/api/v1
   ```

2. `Backend/.env` (used by Django runtime):
   ```bash
   cp Backend/.env.example Backend/.env
   chmod 600 Backend/.env
   # Set:
   # DJANGO_ENV=production  (or staging)
   # DJANGO_SETTINGS_MODULE=config.settings.prod
   # DEBUG=False
   # SECRET_KEY=<python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">
   # ALLOWED_HOSTS=api.<domain>,api,localhost,127.0.0.1
   # CORS_ALLOWED_ORIGINS=https://app.<domain>
   # FRONTEND_URL=https://app.<domain>
   # S3_ACCESS_KEY_ID=logistimus
   # S3_SECRET_ACCESS_KEY=<same-as-MINIO_ROOT_PASSWORD>
   # S3_BUCKET_NAME=logistimus-media
   # SECURE_SSL_REDIRECT=True
   # SECURE_HSTS_SECONDS=31536000
   ```

### 2.4 TLS certificates
Place valid certificates in `infrastructure/tls/`:
```bash
# Using Certbot with standalone or DNS challenge:
sudo certbot certonly --standalone -d app.<domain> -d api.<domain>
cp /etc/letsencrypt/live/app.<domain>/fullchain.pem infrastructure/tls/
cp /etc/letsencrypt/live/app.<domain>/privkey.pem infrastructure/tls/
chmod 600 infrastructure/tls/privkey.pem
```

Update `infrastructure/nginx/nginx.conf` with your real domain names in both
`server_name` directives.

---

## 3. Deployment procedures

### 3.1 Automated CI/CD deployment (recommended)

- **Staging:** Pushing to the `develop` branch triggers `.github/workflows/deploy-staging.yml` automatically.
- **Production:** Trigger `.github/workflows/deploy-production.yml` manually via GitHub Actions UI (`workflow_dispatch`). Requires approval if environment protection rules are configured.

### 3.2 Manual deployment on host (emergency / first boot)

```bash
cd /opt/logistimus

# 1. Pull latest code
git fetch origin main
git checkout main
git pull origin main

# 2. Pre-deploy backup (CRITICAL)
bash infrastructure/backup/backup.sh

# 3. Build and restart containers with zero-downtime attempt
docker compose -f docker-compose.deploy.yml build --pull
docker compose -f docker-compose.deploy.yml up -d --remove-orphans

# 4. Run migrations
docker compose -f docker-compose.deploy.yml exec -T api uv run python manage.py migrate --noinput

# 5. Verify RLS conventions
docker compose -f docker-compose.deploy.yml exec -T api uv run python manage.py check_database_conventions

# 6. Verify health
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" https://api.<domain>/api/v1/health/ready/ || echo 000)
  if [ "$code" = "200" ]; then
    echo "Health check PASS (200)"
    break
  fi
  echo "Waiting for health check... ($code)"
  sleep 3
done
```

---

## 4. Verification post-deploy

Run the canary check:
```bash
# 1. Container status
docker compose -f docker-compose.deploy.yml ps

# 2. Check logs for startup errors
docker compose -f docker-compose.deploy.yml logs --tail=50 api
docker compose -f docker-compose.deploy.yml logs --tail=50 nginx

# 3. Direct health checks
curl -fsS https://api.<domain>/api/v1/health/
curl -fsS https://api.<domain>/api/v1/health/ready/
curl -fsS https://app.<domain>/
```
