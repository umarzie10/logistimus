# Disaster Recovery (DR) Plan — Logistimus

Procedures for recovering the Logistimus system from catastrophic events
(total host loss, storage corruption, cloud datacenter failure).

---

## 1. Objectives: RPO & RTO

| Metric | Target | Current Reality & Limitation |
|---|---|---|
| **RPO (Recovery Point Objective)** | < 24 hours | **Backed by nightly `backup.sh` dumps.** If the host fails at 23:00, up to 20 hours of data since the 03:17 UTC dump is lost. To achieve RPO < 15 min, WAL archiving / continuous replication is required (documented in DATABASE_READINESS.md §8). |
| **RTO (Recovery Time Objective)** | < 2 hours | Rebuilding host from scratch + Docker install + restore dump takes ~30–45 minutes with trained personnel. |

---

## 2. Disaster scenarios & action runbooks

### Scenario A: Complete host failure (Hardware crash, VPS termination)

**Goal:** Recreate stack on a fresh host and restore from off-host backup.

1. **Provision new VM:**
   - Ubuntu 22.04 LTS, 4 GB RAM, 40 GB SSD.
   - Attach same public IP if elastic, or update DNS A records for `api.` and `app.`.

2. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

3. **Clone codebase:**
   ```bash
   git clone https://github.com/Sardor-Dev-2010/Logistimus.git /opt/logistimus
   cd /opt/logistimus
   ```

4. **Reconstruct `.env` and `Backend/.env`:**
   Retrieve secrets from your off-host password manager / vault (Bitwarden, 1Password).

5. **Retrieve latest validated backup:**
   Download the latest `logistimus_*.dump` from your secondary backup storage / off-host destination. Place in `/opt/logistimus/backups/`.

6. **Start PostgreSQL only:**
   ```bash
   docker compose -f docker-compose.deploy.yml up -d db
   # Wait for healthcheck
   until docker compose -f docker-compose.deploy.yml ps db | grep -q "(healthy)"; do sleep 2; done
   ```

7. **Restore database:**
   ```bash
   docker compose -f docker-compose.deploy.yml exec -T db pg_restore \
       -U logistimus -d logistimus --clean --if-exists --no-owner \
       < backups/logistimus_LATEST.dump
   ```

8. **Start remaining services:**
   ```bash
   # Provision TLS certs into infrastructure/tls/
   docker compose -f docker-compose.deploy.yml up -d --build
   ```

9. **Verification:**
   Run `check_database_conventions` and test API readiness:
   ```bash
   docker compose -f docker-compose.deploy.yml exec -T api uv run python manage.py check_database_conventions
   curl -fsS https://api.<domain>/api/v1/health/ready/
   ```

---

### Scenario B: Database volume corruption (PostgreSQL won't boot)

1. Stop services:
   ```bash
   docker compose -f docker-compose.deploy.yml down
   ```
2. Remove corrupted volume:
   ```bash
   docker volume rm logistimus_pgdata
   ```
3. Re-create db service and restore from backup (Steps 6 & 7 of Scenario A).

---

## 3. Off-host backup sync (MANDATORY REQUIREMENT)

`backup.sh` supports `BACKUP_COPY_TARGET` (e.g. `user@backup-server:/var/backups/logistimus`).
An operator must configure this variable in the host environment or crontab:
```bash
export BACKUP_COPY_TARGET="backup-user@backup-vault.internal:/storage/logistimus"
```
**A backup stored only on the production host is NOT a disaster recovery plan.**
