# Rollback Plan — Logistimus

Procedures to safely revert failed deployments in staging and production.

---

## 1. When to trigger a rollback

Trigger an immediate rollback if any of the following occur within 15 minutes of deploy:

- `https://api.<domain>/api/v1/health/ready/` returns non-200 for > 2 minutes.
- HTTP 5xx error rate in `docker compose -f docker-compose.deploy.yml logs nginx` exceeds 1%.
- Critical business flow fails (e.g., authentication, organization lookup).
- Database migrations fail mid-execution or deadlock.

---

## 2. Automated rollback (CI/CD)

The production deployment workflow (`.github/workflows/deploy-production.yml`)
maintains a `.deploy_prev` marker containing the previous Git SHA.

If post-deploy health checks fail in the workflow:
1. It automatically checks out the SHA saved in `.deploy_prev`.
2. Re-runs `docker compose -f docker-compose.deploy.yml up -d --build`.
3. Re-runs health checks.

---

## 3. Manual rollback procedure (code-only)

If the failure does **not** involve schema changes (migrations):

```bash
cd /opt/logistimus

# 1. Identify previous working commit
PREV_SHA=$(cat .deploy_prev 2>/dev/null || git rev-parse HEAD~1)
echo "Rolling back to: $PREV_SHA"

# 2. Check out previous commit
git checkout "$PREV_SHA"

# 3. Rebuild and restart services
docker compose -f docker-compose.deploy.yml up -d --build

# 4. Verify health
curl -fsS https://api.<domain>/api/v1/health/ready/
```

---

## 4. Manual rollback procedure (with database migration reversal)

If the failed deployment ran migrations that broke functionality:

### Option A: Clean migration rollback (preferred if migration is reversible)
```bash
cd /opt/logistimus

# 1. Inspect migration targets
docker compose -f docker-compose.deploy.yml exec -T api uv run python manage.py showmigrations

# 2. Revert the specific app's migration to the previous number
# Example: revert app 'core' migration 0005 to 0004
docker compose -f docker-compose.deploy.yml exec -T api uv run python manage.py migrate core 0004

# 3. Check out previous code commit
git checkout $(cat .deploy_prev)
docker compose -f docker-compose.deploy.yml up -d --build
```

### Option B: Full database restore (if migrations caused data corruption)
```bash
cd /opt/logistimus

# 1. Stop web traffic immediately to prevent split-brain writes
docker compose -f docker-compose.deploy.yml stop nginx api worker beat

# 2. Locate pre-deploy backup taken by deploy script
LATEST_BACKUP=$(ls -t backups/logistimus_*.dump | head -1)
echo "Restoring from: $LATEST_BACKUP"

# 3. Restore database into db service
docker compose -f docker-compose.deploy.yml exec -T db pg_restore \
    -U logistimus \
    -d logistimus \
    --clean \
    --if-exists \
    --no-owner \
    < "$LATEST_BACKUP"

# 4. Check out previous code version
git checkout $(cat .deploy_prev)

# 5. Bring services back up
docker compose -f docker-compose.deploy.yml up -d --build

# 6. Verify health
docker compose -f docker-compose.deploy.yml ps
curl -fsS https://api.<domain>/api/v1/health/ready/
```
