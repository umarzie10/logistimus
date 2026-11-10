# Staging Readiness — Logistimus

**Phase 9 deliverable** of the production readiness assessment.
Scope: everything needed to stand up, seed, verify, and run the first
staging environment safely — host prerequisites, environment files, GitHub
secrets/variables, synthetic seed policy, and honest gap tracking.

**Status legend:** `PASS` · `FAIL` · `NOT_CONFIGURED` · `NOT_VERIFIED` · `BLOCKED`

---

## 1. Staging definition & policy

| Decision | Setting / rule | Rationale |
|---|---|---|
| Settings module | `config.settings.prod` | Staging runs the **same hardened settings as production** (no `staging.py`). Differentiate environments through values, not code. Documented in `ENVIRONMENT_VARIABLES.md §0`. |
| Environment label | `DJANGO_ENV=staging` | Distinct from `production` in `/health/` reports and S3 key prefix (`staging/`); also unlocks `manage.py seed_staging` (which refuses on `DJANGO_ENV=production`). |
| Data policy | **SYNTHETIC DATA ONLY** | **Zero real customer, driver, vehicle, or employee data may ever enter staging.** Staging exists for integration testing, QA, and deployment practice — its security perimeter is lower than production (team-wide access, automated CI deploys). |
| Synthetic email domain | `@*.example.invalid` | RFC 2606 / RFC 6761 reserved TLD. Guaranteed never routable, never deliverable on the public internet, impossible to spam or leak to real people. |
| SMTP on staging | `NOT_CONFIGURED` (by design) | Staging cannot send external emails. Seeded users are created pre-verified (`email_verified_at=now`) so QA can log in immediately without an activation link. |
| Admin / superuser | None seeded | `seed_staging` never creates a superuser or platform admin. Superusers are provisioned manually via `manage.py createsuperuser` when needed. |

---

## 2. Synthetic seed tool — `manage.py seed_staging` (PASS)

New in Phase 9: `Backend/apps/core/management/commands/seed_staging.py`.
Loads a clean multi-tenant starter pack into a staging database.

### 2.1 Three independent safety guards (in order)

1. **`--yes-synthetic` flag required.** The command refuses to run bare (`CommandError`).
2. **Refuses on `DJANGO_ENV=production`.** Production settings with the default/production label block execution immediately. Staging sets `DJANGO_ENV=staging`.
3. **Refuses if the database contains ANY non-synthetic user.** Scans `User.objects` for emails not ending in `@example.invalid` or `.example.invalid`. Even if an operator accidentally points the command at a production database with `DJANGO_ENV=staging`, the presence of real user accounts blocks execution.

### 2.2 What gets seeded

| Entity | Count | Details |
|---|---|---|
| Organizations | 2 | `Northwind Freight (Staging)` (slug `northwind-freight-staging`), `Acme Logistics (Staging)` (slug `acme-logistics-staging`). Two tenants ensure tenant isolation can be verified in the UI. |
| Users | 4 | 2 per org (1 Owner + 1 Dispatcher / Fleet Manager). Pre-verified (`email_verified_at=now`). Emails: `owner@<slug>.example.invalid`, `dispatcher@<slug>.example.invalid`, `fleet@<slug>.example.invalid`. |
| Passwords | — | Supplied via `--password=...` (min 8 chars) or auto-generated as a 16-character token printed once. |
| Branches | 4 | 2 per org: 1 Headquarters (primary) + 1 Regional Depot / Cold Storage. |
| Departments | 4 | 2 per org (Operations, Dispatch, Warehouse, Fleet). |
| Builtin roles | 24 | 12 per org (`owner`, `dispatcher`, `fleet_manager`, `driver`, etc.) with full permission grants via `apps.permissions.services.seed_builtin_roles`. |
| Memberships | 4 | Maps seeded users to their org + role (`ACTIVE` status). Owner invited by `None`; others invited by the owner. |
| Invitations | 2 | 1 pending invitation per org (`newcomer@<slug>.example.invalid`) so invitation UI tables have real data. |
| Audit logs | 2 | `staging.seeded` event recorded per organization. |

### 2.3 Idempotency

Re-running `seed_staging` skips organizations that already exist (`Organization.objects.filter(name=...).exists()`), creates no duplicate rows, and reports `skipped (already present)`.

### 2.4 Evidence

- **Unit / regression tests:** `tests/test_seed_staging.py` — 6 tests covering all 3 guards, happy path, idempotency, synthetic invariants, and login verification. **6/6 passed.**
- **Isolated full-lifecycle test (`/tmp/opencode/test_phase9_seed_isolated.sh`):**
  1. virgin `postgis/postgis:16-3.4` container booted on port 15433;
  2. `manage.py migrate` ran clean;
  3. `manage.py check_database_conventions` verified RLS on all 8 tenant tables;
  4. `manage.py seed_staging --yes-synthetic --password=...` created 2 orgs, 4 users, 4 branches, 4 departments, 4 memberships, 2 invitations, 24 roles;
  5. direct `psql` queries confirmed `orgs=2`, `users=4`, `non_synthetic=0`, `verified=4`, `roles=24`;
  6. second seed pass reported `organizations: 0`, `skipped (already present)`;
  7. container destroyed. Clean exit (`PHASE9_ISOLATION_TEST_PASS`).

---

## 3. Staging deployment checklist

To bring up staging on a real host for the first time, an operator completes
these steps in order:

### 3.1 Host prerequisites (`NOT_CONFIGURED` — no host exists yet)

- [ ] Linux host (Ubuntu 22.04+ or Debian 12 recommended, 2+ CPU, 4+ GB RAM, 40+ GB disk)
- [ ] Docker 24+ and Docker Compose v2 installed
- [ ] Inbound ports 80 and 443 open in firewall / security group
- [ ] Deploy user (e.g. `deploy`) with SSH key auth and `docker` group membership
- [ ] Staging domains pointing at host IP via DNS:
  - `app.staging.logistimus.example.com` (A record)
  - `api.staging.logistimus.example.com` (A record)

### 3.2 Host repository checkout & configuration

- [ ] Clone repository into `/opt/logistimus` (or `~/logistimus`):
  ```bash
  git clone https://github.com/Sardor-Dev-2010/Logistimus.git /opt/logistimus
  cd /opt/logistimus
  git checkout develop
  ```
- [ ] Create root `.env` from template (`chmod 600 .env`):
  ```bash
  POSTGRES_USER=logistimus
  POSTGRES_PASSWORD=<generated-32char-pw>
  POSTGRES_DB=logistimus
  MINIO_ROOT_USER=logistimus
  MINIO_ROOT_PASSWORD=<generated-32char-pw>
  NEXT_PUBLIC_API_URL=https://api.staging.logistimus.example.com/api/v1
  ```
- [ ] Create `Backend/.env` from template (`chmod 600 Backend/.env`):
  ```bash
  DJANGO_ENV=staging
  SECRET_KEY=<generated-50char-random-key>
  ALLOWED_HOSTS=api.staging.logistimus.example.com,api,localhost,127.0.0.1
  CORS_ALLOWED_ORIGINS=https://app.staging.logistimus.example.com
  FRONTEND_URL=https://app.staging.logistimus.example.com
  S3_ENDPOINT_URL=http://minio:9000
  S3_ACCESS_KEY_ID=logistimus
  S3_SECRET_ACCESS_KEY=<same-as-MINIO_ROOT_PASSWORD>
  S3_BUCKET_NAME=logistimus-media
  S3_REGION_NAME=us-east-1
  S3_USE_SSL=false
  SECURE_SSL_REDIRECT=true
  SECURE_HSTS_SECONDS=0  # keep 0 on staging until domains are stable
  ```
- [ ] TLS certificates in `infrastructure/tls/{fullchain,privkey}.pem` (Let's Encrypt / certbot or Cloudflare Origin CA)
- [ ] Update `infrastructure/nginx/nginx.conf`: set `server_name` to staging domains:
  - API block: `api.staging.logistimus.example.com`
  - Frontend block: `app.staging.logistimus.example.com`

### 3.3 GitHub Actions staging configuration

- [ ] Create `develop` branch from `main`:
  ```bash
  git checkout -b develop
  git push -u origin develop
  ```
- [ ] In GitHub repository Settings → Environments:
  - Create environment **`staging`** (no protection rules needed — auto-deploys on push to `develop`)
- [ ] Add Environment Secrets to `staging`:
  - `SSH_HOST`: staging host IP or hostname
  - `SSH_USER`: deploy user (e.g. `deploy`)
  - `SSH_KEY`: private SSH key for deploy user
- [ ] Add Environment Variables to `staging` (optional):
  - `CANARY_URL`: `https://api.staging.logistimus.example.com/api/v1/health/ready/`
- [ ] Add Repository Variables (Settings → Secrets and variables → Actions → Variables):
  - `STAGING_HOST`: staging host IP or hostname

### 3.4 First boot & seed procedure

Run once on the host:

```bash
# 1. Build and start stack
docker compose -f docker-compose.deploy.yml up -d --build

# 2. Wait for all 8 containers to become healthy
docker compose -f docker-compose.deploy.yml ps

# 3. Run database migrations
docker compose -f docker-compose.deploy.yml exec -T api uv run python manage.py migrate --noinput

# 4. Verify RLS and database conventions
docker compose -f docker-compose.deploy.yml exec -T api uv run python manage.py check_database_conventions

# 5. Seed synthetic staging data
docker compose -f docker-compose.deploy.yml exec -T api uv run python manage.py seed_staging --yes-synthetic

# 6. Verify health endpoints through nginx
curl -fsS https://api.staging.logistimus.example.com/api/v1/health/
curl -fsS https://api.staging.logistimus.example.com/api/v1/health/ready/
```

### 3.5 QA login credentials (synthetic)

After running `seed_staging` with default/printed password:

| Tenant | Role | Email | Notes |
|---|---|---|---|
| Northwind Freight | Owner | `owner@northwind-freight-staging.example.invalid` | Full admin permissions |
| Northwind Freight | Dispatcher | `dispatcher@northwind-freight-staging.example.invalid` | Dispatch/operations role |
| Acme Logistics | Owner | `owner@acme-logistics-staging.example.invalid` | Separate tenant — cannot see Northwind data |
| Acme Logistics | Fleet Manager | `fleet@acme-logistics-staging.example.invalid` | Fleet-scoped permissions |

To reset a password on staging:
```bash
docker compose -f docker-compose.deploy.yml exec -T api uv run python manage.py changepassword <email>
```

---

## 4. Status scorecard

| Category | Item | Status | Evidence / Notes |
|---|---|---|---|
| Staging config model | Reuses `prod.py` with `DJANGO_ENV=staging` | **PASS** | `prod.py` accepts non-dev `DJANGO_ENV`; `ENVIRONMENT_VARIABLES.md §0` |
| Tenancy & RLS | 8 tenant tables with RLS enforced | **PASS** | `check_database_conventions` verified in isolated container |
| Synthetic seed tool | `manage.py seed_staging` | **PASS** | 3 guards, idempotent, 6/6 tests pass, verified in PostGIS container |
| Data isolation | Every email on `@example.invalid` | **PASS** | Zero real-person data; non-synthetic guard blocks production runs |
| CI/CD staging pipeline | `.github/workflows/deploy-staging.yml` | **PASS (mechanism)** | Hardened in Phase 6; needs GitHub push + host to run |
| Staging host | Physical / cloud VM | `NOT_CONFIGURED` | Operator must provision |
| Staging domains / DNS | `app.staging.*`, `api.staging.*` | `NOT_CONFIGURED` | Operator must configure DNS |
| Staging TLS certs | Real certs for staging domains | `NOT_CONFIGURED` | Operator must provision via certbot / Cloudflare |
| GitHub environment | `staging` environment + secrets | `NOT_CONFIGURED` | Cannot be created until host exists |
| `develop` branch | Git branch for staging triggers | `NOT_CONFIGURED` | Local repo is on `main`; create when staging host is ready |
| SMTP on staging | Email sending | `NOT_CONFIGURED` | By design; seeded users are pre-verified |
| Sentry on staging | Error reporting | `NOT_CONFIGURED` | Optional; set `SENTRY_DSN` in `Backend/.env` |
| MinIO on staging | S3 object storage | `NOT_CONFIGURED` | Optional license decision (AIStor vs pgsty fallback); not blocking |

---

## 5. Verdict

**STAGING READINESS: MECHANISM READY — awaiting host provisioning.**

All code, migrations, seed tooling, and deployment scripts needed for staging
are built, tested, and verified in isolated containers:

- `manage.py seed_staging` safely populates a 2-tenant synthetic dataset with
  pre-verified accounts and refuses on production or on real-user databases.
- The stack configuration is proven at Phase 3/4 (full compose parity) and
  Phase 8 (8/8 container healthchecks + log rotation).
- The staging deploy workflow is hardened with injection guards, rollback,
  and health checks.

Next steps for the operator: provision a Linux host, point DNS records,
create the `staging` GitHub environment with SSH credentials, and push
to `develop`. No code changes remain for staging.
