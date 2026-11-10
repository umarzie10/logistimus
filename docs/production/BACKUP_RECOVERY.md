# Backup & Recovery — Logistimus

**Phase 7 deliverable** of the production readiness assessment.
Scope: what is backed up, how often, how long it is kept, how it is proven
restorable, and exactly how to get the data back.

Governing rule (from `DATABASE_READINESS.md` §18): **a backup is invalid
until a restore test succeeds in isolation.** §5 below is that test.

**Status legend:** `PASS` · `FAIL` · `NOT_CONFIGURED` · `NOT_VERIFIED` · `BLOCKED`

---

## 1. What is backed up — and what is not

| Asset | Backed up? | Mechanism | Status |
|---|---|---|---|
| PostgreSQL database (schema + data) | **Yes** | `pg_dump -Fc` custom format | **PASS** |
| Redis | No | by design — cache + Celery broker only; Django sessions live in Postgres (`django_session`). Losing it loses in-flight jobs, not data | **PASS (by design)** |
| MinIO / S3 objects | No | **no `FileField`/`ImageField` exists anywhere in `apps/`** today, so there is no user media to lose. Revisit the moment uploads ship | `NOT_CONFIGURED` (no data at risk yet) |
| TLS certificates (`infrastructure/tls/`) | No | git-ignored, host-local; reissuable from the CA in minutes | `NOT_CONFIGURED` (documented) |
| Host `.env` / `Backend/.env` | No | secrets are intentionally never in git; re-create from the operator's password manager + `ENVIRONMENT_VARIABLES.md` | `NOT_CONFIGURED` (documented) |
| Application code | Yes | git (remote `origin`) | **PASS** |
| Container images / build | rebuildable | `docker compose build` from a pinned ref | **PASS (by design)** |

Dump format is **`pg_dump -Fc`** (custom/compressed): smaller than plain SQL,
and `pg_restore` can restore selectively or completely.

---

## 2. Tooling

| Tool | Path | What it does |
|---|---|---|
| Backup | `infrastructure/backup/backup.sh [repo_dir]` | `pg_dump -Fc` → `backups/logistimus-<UTC>.dump`, then **validates** the archive (non-empty, `pg_restore --list` TOC ≥ 20 lines, TOC covers ≥ every public table), then **retention** (deletes dumps older than `RETENTION_DAYS`, default 14, never the one just written), optional off-host copy (§6) |
| Restore test | `infrastructure/backup/restore-test.sh <dump> [source_container]` | throws up a **virgin** PostGIS container (image init scripts skipped), restores with `--exit-on-error`, then compares table list, per-table row counts and TOC structure against the source; removes the container on PASS, keeps it on FAIL |
| Nightly job | `.github/workflows/backup.yml` | daily 03:17 UTC (+ manual dispatch) → ssh to the production host → `backup.sh` → **restore-tests the dump it just made** |
| Pre-deploy dump | `.github/workflows/deploy-production.yml` → *Back up database before touching anything* | `pg_dump -Fc` into `backups/logistimus-predeploy-<UTC>.dump` **before** any code change, validated with `pg_restore --list` (unreadable archive aborts the deploy), named with the `logistimus-*` prefix so retention applies |

All three call the same commands; nothing is hard-coded to a different
database name — user/db are read from the host's compose env file, falling
back to `logistimus`.

---

## 3. Cadence & retention

| Knob | Value | Where |
|---|---|---|
| Scheduled backup | daily `17 3 * * *` UTC | `backup.yml` |
| Restore test | **every scheduled run** (can be skipped via dispatch input) | `backup.yml` |
| Pre-deploy backup | on every production deploy | `deploy-production.yml` |
| Retention | 14 days (`RETENTION_DAYS`) | `backup.sh` |
| Dump location | `<checkout>/backups/` on the production host, **git-ignored** (`backups/`, `*.dump` added to `.gitignore` this phase) | — |
| Off-host copy | **not configured** | §6 |

Manual run on the host:

```bash
cd ~/logistimus
bash infrastructure/backup/backup.sh                 # backup only
bash infrastructure/backup/backup.sh && \
  bash infrastructure/backup/restore-test.sh \
      "$(ls -t backups/*.dump | head -1)" \
      "$(docker compose -f docker-compose.deploy.yml ps -q db)"   # backup + prove it
```

---

## 4. Backup verification — evidence

Isolated test stack: a throwaway PostGIS container (`phase7-src`) migrated
with the project's own migrations and seeded with **synthetic** rows
(`organizations=3 users=5`, `@example.invalid` addresses — no real data), then
the deploy compose `db` service loaded with the same dump so `backup.sh` ran
against the real compose path.

```
$ bash infrastructure/backup/backup.sh
dumping logistimus (user logistimus) -> .../backups/logistimus-20261110T081132Z.dump
BACKUP_OK file=.../backups/logistimus-20261110T081132Z.dump bytes=102330 \
  toc_lines=264 tables=32 kept=3 pruned=0 retention_days=14
NOTE: dump is local to this host only — off-host copy is NOT configured (see BACKUP_RECOVERY.md §6).
EXIT=0
```

Retention proof — a dump aged 30 days was planted, the next run pruned it:

```
=== plant an expired dump, run 2: retention must prune it ===
BACKUP_OK file=.../logistimus-20261110T081029Z.dump bytes=102330 toc_lines=264 \
  tables=0->32 kept=2 pruned=1 retention_days=14
EXIT=0
```

The `backup.yml` remote script was executed locally with the same argv the ssh
side passes (`bash <script> <repo> true|false`) — both branches:

```
BACKUP_OK file=.../logistimus-20261110T081644Z.dump bytes=102330 toc_lines=264 tables=32 kept=4 pruned=0 ...
restore-testing backups/logistimus-20261110T081644Z.dump against container 38ae3609...
RESTORE_TEST_PASS ... tables=26                      (RUN_TEST=true)
...
restore test skipped (run_restore_test=false)         (RUN_TEST=false)
EXIT=0
```

---

## 5. Restore test — evidence (the rule from DATABASE_READINESS §18)

Procedure: dump → **virgin** PostGIS 16 container (no shared network, no host
ports, image bootstrap skipped so the target has *nothing* the dump did not
put there) → `pg_restore --no-owner --exit-on-error` → three independent
checks → teardown.

```
$ bash infrastructure/backup/restore-test.sh \
      backups/logistimus-20261110T081132Z.dump logistimus-db-1
waiting for logistimus-restore-test/restore_target to finish init and accept queries...
restoring backups/logistimus-20261110T081132Z.dump -> logistimus-restore-test/restore_target
pg_restore: OK (--exit-on-error, no errors)
restored tables: 26
source tables:   26
CHECK table list: IDENTICAL (26 tables)
CHECK row counts: IDENTICAL across 26 tables (8808 rows total)
CHECK TOC structure: IDENTICAL (249 entries vs 249)
RESTORE_TEST_PASS dump=backups/logistimus-20261110T081132Z.dump target=logistimus-restore-test tables=26
cleanup: removed logistimus-restore-test
EXIT=0
```

**Measured elapsed time: 10 s** (container start + init + restore + all three
checks) for a 102 KB / 8 808-row / 26-table database.

The same test was run twice more — once against the source container and once
against the `backup.yml` artifact — both `RESTORE_TEST_PASS`.

### 5.1 Defects found *by* the restore test (fixed this phase)

Building a trustworthy test found four real problems; each would have made a
"successful" backup unrestoreable or the test itself meaningless:

| # | Defect | Consequence | Fix |
|---|---|---|---|
| 1 | Readiness check used `pg_isready`/`select 1`, which also answer for Postgres' **temporary init server** | restore started while `/docker-entrypoint-initdb.d` was still running → raced the image's own PostGIS bootstrap → container exited 3 mid-restore | require **both** a working query **and** `server stopped` in the container logs (marks the temp server shutdown); fail fast with logs if the container dies |
| 2 | The PostGIS image pre-creates the `tiger`/`topology` schemas; the dump also contains `CREATE SCHEMA tiger` | `pg_restore` aborted on `schema "tiger" already exists` — a restore into a same-image database always failed | mount an **empty** dir over `/docker-entrypoint-initdb.d` in the throwaway container: virgin target, and a green run now also proves the dump is self-contained (extensions included) |
| 3 | TOC comparison included the per-database **OID** column | `FAIL: TOC structure differs (249 vs 249 entries)` on an otherwise perfect restore (only OIDs differed) | drop field 2 before comparing; classid/description/name/owner must match exactly |
| 4 | `backup.sh` counted `'; Table Data'` — wrong case *and* wrong format (`2616; 1259 16384 TABLE DATA …`) | reported `tables=0` for a 26-table database (misleading evidence, no real protection) | count `TABLE DATA`, **plus** a coverage guard: if the archive covers fewer tables than the live DB has, the dump is deleted and the run fails |
| 5 | TOC validation called `pg_restore` on the **host**, where no Postgres client exists | silent failure hidden by `2>/dev/null`; two empty outputs then compared *equal* (vacuous pass) | run `pg_restore` inside the container, and fail if the original TOC has < 20 entries |

---

## 6. Off-host copy — `NOT_CONFIGURED`

Today a dump exists only on the database host's disk. If that disk dies, the
backups die with it — the classic mistake.

`backup.sh` already supports it; it needs one variable in the host's compose
env file and an SSH key that can reach the target:

```bash
# in <checkout>/.env on the production host
BACKUP_COPY_TARGET=backup@nas.example.com:/srv/logistimus-backups
# or a local/mounted path:
BACKUP_COPY_TARGET=/mnt/nas/logistimus-backups
```

A failed copy **fails the run** (no `BACKUP_OK` line → the nightly job goes
red) rather than silently keeping a local-only dump.

Status: mechanism **PASS**, configuration **`NOT_CONFIGURED`** — needs a
destination host/NAS that does not exist yet.

---

## 7. RPO / RTO

| Metric | Value | Basis |
|---|---|---|
| **RPO** (data loss on total host loss) | **≤ 24 h** typical, **0** for the pre-deploy window | daily 03:17 UTC dump + the validated dump taken *before every production deploy* |
| **RPO** (failed deploy, host alive) | **0** for code, restore-to-predeploy for data | `backups/logistimus-predeploy-*.dump` written before any code change |
| **RTO** (database only, host alive) | **≈ 10 s** measured for 26 tables / 8 808 rows; scale roughly linearly with size | §5 measurement |
| **RTO** (full stack on a new host) | **not measured** — no second host exists | §9 gap; runbook in `DISASTER_RECOVERY.md` (Phase 10) |

Honest caveat: 10 s is measured on a 102 KB synthetic database. A production
database with real volume will take longer; re-measure when staging has
representative data volume (Phase 9).

---

## 8. Known gaps / follow-ups

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | No WAL archiving / PITR | `NOT_CONFIGURED` | Cannot rewind to an arbitrary moment; RPO floor is the 24 h cadence. Options: `archive_mode=on` + WAL shipping, or nightly base backups with `pg_basebackup`. |
| 2 | Off-host copy | `NOT_CONFIGURED` | §6 — mechanism exists, destination doesn't |
| 3 | Dumps not encrypted at rest | `NOT_CONFIGURED` | `pg_dump -Fc` + optional `gpg`/age encryption before copy; do this together with §6 |
| 4 | Backup failure has no alerting | `NOT_CONFIGURED` | A red `Backup & Restore Test` run is visible only in the Actions tab. Wire to email/Sentry/Slack in Phase 8 |
| 5 | Scheduled workflow can't run yet | `NOT_VERIFIED` | workflow file not pushed (same as all four Phase 6 workflows); GitHub also disables schedules after 60 days of repo inactivity |
| 6 | MinIO/media volume | `NOT_CONFIGURED` | no media exists today (§1); must be added with the first upload feature |
| 7 | Restore RTO unmeasured at scale | `NOT_VERIFIED` | §7 caveat |
| 8 | Backup host == database host | `NOT_CONFIGURED` | same disk, same machine — only §6 removes this |

---

## 9. Verification performed this phase

| Check | Command | Result |
|---|---|---|
| Backup script syntax | `bash -n infrastructure/backup/backup.sh` | OK |
| Restore-test script syntax | `bash -n infrastructure/backup/restore-test.sh` | OK |
| Backup against the compose `db` | `bash infrastructure/backup/backup.sh` | `BACKUP_OK … toc_lines=264 tables=32` |
| Retention prunes expired dumps | planted 30-day-old dump, rerun | `pruned=1`, newest kept |
| Archive coverage guard | `TABLES >= DB public tables` | 32 ≥ 26, pass |
| **Restore in isolation** | `restore-test.sh <dump> <source>` ×3 | `RESTORE_TEST_PASS` ×3 — 26/26 tables, 8808/8808 rows, 249/249 TOC |
| Restore duration | `date` around the run | 10 s |
| Nightly workflow remote script | extracted heredoc, executed with argv (`true` and `false`) | `BACKUP_OK` + `RESTORE_TEST_PASS`; skip branch OK |
| New workflow YAML | duplicate-key-preserving loader | `YAML OK: .github/workflows/backup.yml` |
| New workflow remote script | `bash -n` | `bash -n OK (27 lines)` |
| Pre-deploy step hardening | `bash -n` on all deploy heredocs | 4/4 OK (`deploy-production.yml`) |
| Dumps can't be committed | `git check-ignore backups/x.dump` | ignored; scripts **not** ignored |
| Nothing deployed | no `up -d` of api/frontend/nginx; no remote host contacted | **PASS** (only an isolated test `db` service + throwaway containers) |

---

## 10. Verdict

**BACKUP & RECOVERY: PASS with follow-ups.**

Postgres is backed up on a schedule and before every production deploy, every
dump is validated at creation time, retention is enforced, and — the point of
this phase — **a restore into an isolated virgin database was executed and
passed all three checks** (table list, row counts, TOC structure) in 10 s.
The nightly job restore-tests its own output, so a silently corrupted backup
fails the day it is taken rather than the day it is needed.

Not yet covered: no PITR (24 h RPO floor), no off-host copy, no dump
encryption, no alerting on backup failure, and no measured RTO at production
data volume — all listed in §8 with owners in Phase 8/10.
