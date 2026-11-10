# CI/CD Readiness — Logistimus

**Phase 6 deliverable** of the production readiness assessment.
Scope: CI pipelines, staging/production deploy pipelines, approval gates,
the host configuration model, and required GitHub settings.

Every status below is backed by command output captured while the assessment
ran (2026-11-10). **Nothing was deployed anywhere during this assessment.**

**Status legend:** `PASS` · `FAIL` · `NOT_CONFIGURED` · `NOT_VERIFIED` · `BLOCKED`

---

## 1. CI pipelines

| Workflow | Trigger | Steps | Status |
|---|---|---|---|
| `backend.yml` — Backend CI | push/PR → `main` (paths: `Backend/**`, `infrastructure/**`) | uv sync → ruff → **pip-audit (new this phase)** → `manage.py check` → `makemigrations --check` + `migrate` → `check_database_conventions` → pytest+coverage, against a real PostGIS service container | **PASS (locally equivalent)** |
| `frontend.yml` — Frontend CI | push/PR → `main` (paths: `Frontend/**`) | npm ci → eslint → tsc → `next build` → `npm audit --audit-level=high` | **PASS (locally equivalent)** |

Local equivalents of every CI step were run during Phases 1–5:

```
uv run ruff check .                    → All checks passed!
uv run pip-audit                       → No known vulnerabilities found   (added to CI this phase)
uv run manage.py check                 → no issues (133-test suite green)
uv run manage.py makemigrations --check → No changes detected
uv run pytest                          → 133 passed
npx eslint --quiet                     → ESLINT_CLEAN
npx tsc --noEmit                       → TSC_CLEAN
npm run build                          → 31 routes
npm audit --audit-level=high           → 0 high/critical (7 moderate, dev-only)
```

**Changes made to CI this phase:**

1. **`pip-audit` step added to `backend.yml`.** Phase 5 found 5 CVEs in
   DRF 3.15.2 that no CI step would have caught (only frontend had an audit).
   Known CVEs now fail the backend build.
2. **Explicit `permissions: contents: read`** added to all four workflows
   (least privilege — none of them need write access). Since then two more
   workflows landed (`backup.yml` Phase 7, `canary.yml` Phase 8) and both
   declare it too — six for six.

### 1.1 CI gaps

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Workflows never executed | `NOT_VERIFIED` | Local `main` is **ahead of `origin/main` by 12 commits**; `gh run list` returns **empty**. The workflow files are not yet on GitHub. Activate with `git push origin main` (see §7). Pushing `main` runs CI only — `deploy-staging` triggers on `develop`, `deploy-production` is dispatch-only. |
| 2 | Branch protection on `main` | **`BLOCKED`** | `gh api …/branches/main/protection` → **HTTP 403: "Upgrade to GitHub Pro or make this repository public to enable this feature."** The repo is **private on a free plan**, so branch protection (required checks before merge) is not available at all. Workarounds: make the repo public, upgrade the plan, or accept merge gating by review discipline. |
| 3 | No scheduled dependency audit | `NOT_CONFIGURED` | `pip-audit`/`npm audit` run on push/PR only; no weekly cron. Cheap follow-up: `on: schedule:` on both workflows. |
| 4 | Coverage threshold not enforced | `NOT_CONFIGURED` | pytest collects coverage but no `--cov-fail-under` gate. |
| 5 | `develop` branch does not exist yet | `NOT_CONFIGURED` | `deploy-staging` triggers on `develop`; create the branch when a staging host exists. |

---

## 2. Deploy pipelines

### 2.1 Staging — `deploy-staging.yml`

| Gate / step | Detail | Status |
|---|---|---|
| Trigger | push to `develop`, or `workflow_dispatch` | **PASS** |
| Never touches production | targets `STAGING_HOST` only; no prod secrets referenced | **PASS** |
| SSH bootstrap | key → `~/.ssh/id_ed25519` (chmod 600), `ssh-keyscan` with fail-if-empty check | **PASS (fixed this phase)** |
| Config presence checks | fails with actionable errors if the checkout, root env, or `Backend/.env` is missing | **PASS (fixed this phase)** |
| Deploy | fetch → `reset --hard origin/develop` → build → `migrate --noinput` → `up -d` → `ps` | **PASS (by inspection)** |
| Health verify | polls `/api/v1/health/ready/` up to 30×5 s, `Host` derived from `NEXT_PUBLIC_API_URL` in the host's env file; dumps `compose ps` on failure | **PASS (fixed this phase)** |
| Environment approval | `environment: staging` — no protection rules required (auto-deploys) | by design |

### 2.2 Production — `deploy-production.yml`

Two **independent** gates before anything runs:

| # | Gate | Mechanism | Status |
|---|---|---|---|
| 1 | Explicit human intent | `workflow_dispatch` only — pushing to `main` does **not** deploy; operator must type the exact string `DEPLOY PRODUCTION` (guard job compares and aborts on mismatch) | **PASS** |
| 2 | Reviewer approval | `environment: production` — GitHub blocks each job until a human approves in the UI | `NOT_CONFIGURED` (§5 — environment doesn't exist yet) |
| 3 | Fail-closed guard | guard job queries `gh api …/environments/production` and **aborts if no `required_reviewers` rule is configured** — without this, `environment:` alone would gate nothing | **PASS (by inspection)** |
| 4 | Pre-deploy backup | `pg_dump -Fc` to `pre-deploy-<UTC>.dump` on the host **before** any code change | **PASS (by inspection)** |
| 5 | Post-deploy verify | same health probe as staging, 30×5 s | **PASS (by inspection)** |
| 6 | Rollback on failure | `rollback` job (`if: failure() && needs.deploy.result == 'failure'`) resets the checkout to `.deploy_prev` (written **before** the reset), rebuilds, restarts, re-probes; if the marker is absent the deploy never changed the host and it reports "nothing to roll back" | **PASS (by inspection)** |

Explicit production approval is therefore **double-gated** (typed confirmation
+ environment reviewer) and **fails closed** if reviewers are not configured.

---

## 3. Defects found in the drafted workflows (fixed this phase)

The Phase 3 commit shipped first drafts of both deploy workflows. Reviewing
them as if reviewing someone else's PR found **seven real defects**, none of
which unit tests or YAML parsing could catch:

| # | Defect | Consequence | Fix |
|---|---|---|---|
| 1 | **Duplicate `env:` key** on the production `Deploy` step (two `env:` blocks under one step) | YAML duplicate mapping key — one block silently dropped, so either `DEPLOY_REF` or the three compose passwords vanished → `set -u` abort or compose refusing to start | Single `env:` block; and since config now lives in host files (§4), the passwords were removed from the workflow entirely |
| 2 | **`DEPLOY_REF` never crossed ssh** — runner-side `env:` is not visible in the remote heredoc | remote `git reset --hard "${DEPLOY_REF}"` hit an unbound variable under `set -u` → every prod deploy would fail at the reset | Values passed as argv: `bash -s -- '<path>' '<ref>'` → `$1`/`$2` (never on a command line as a bare secret; both are character-class-validated before interpolation) |
| 3 | **`echo "PREVIOUS_SHA=$previous" >> "$GITHUB_ENV"` ran on the remote host** | `$GITHUB_ENV` doesn't exist there; under `set -u` the deploy step died *after* `up -d` (stack deployed, step reported failure → spurious rollback) | Removed — rollback state is now a host-side file (`.deploy_prev`) |
| 4 | **`rollback` job read `needs.deploy.outputs.previous_sha`** but the deploy job declared no `outputs` | rollback always saw an empty SHA and only `echo`ed "manual rollback required" — a fake rollback | Real rollback: host-side `.deploy_prev` marker written before the reset, consumed by a genuine reset+rebuild+re-probe |
| 5 | **Health probe used `https://localhost/...`** with no `Host` header | relied on nginx default-server selection and on `localhost` being in `ALLOWED_HOSTS` — would silently probe the wrong vhost or fail once `localhost` is dropped from prod `ALLOWED_HOSTS` | `Host` header derived from the host's own `NEXT_PUBLIC_API_URL` (the same value nginx `server_name` and `ALLOWED_HOSTS` must match) — a config mismatch now **fails the deploy** instead of passing vacuously |
| 6 | **Bogus `known_hosts` line** in staging mixing `STAGING_HOST` with an unrelated IP from the runner's `/etc/hosts` | appended garbage to `known_hosts`; could match the wrong host key | Removed; `ssh-keyscan` only, plus a fail-if-empty check |
| 7 | **No `permissions:` on any workflow** | default token permissions apply (repo-wide read/write on `GITHUB_TOKEN` depending on org default) | explicit `permissions: contents: read` on all four; `environments: read` additionally on `deploy-production` (guard job's API query) |

Additionally: **stale-branch deploy** — production reset used the bare ref
(`git reset --hard main`), which resolves to the *local* branch, potentially
shipping an old revision. It now resolves `refs/remotes/origin/<ref>` when
that exists, so the fetched revision is what deploys.

---

## 4. Host configuration model (no secrets transit CI)

Compose reads its interpolation values from a root `.env` next to
`docker-compose.deploy.yml`, and the api/worker/beat services read Django
settings from `Backend/.env` (`env_file`). Both are git-ignored. The
workflows therefore only **run compose on the host** — passwords and the
secret key exist **only there**, never in GitHub:

```
Host (created once by an operator):
  <checkout>/.env          ← new .env.example (root) — POSTGRES_PASSWORD,
                             MINIO_ROOT_PASSWORD, NEXT_PUBLIC_API_URL (REQUIRED),
                             POSTGRES_*/MINIO_ROOT_USER/S3_ENDPOINT_URL (optional)
  <checkout>/Backend/.env  ← Backend/.env.example — SECRET_KEY, ALLOWED_HOSTS, CORS…
  <checkout>/infrastructure/tls/{fullchain,privkey}.pem   (git-ignored)

GitHub (only these):
  secrets: STAGING_SSH_KEY/_HOST/USER/PORT, PROD_SSH_KEY/HOST/USER/PORT
  variables (optional): STAGING_DEPLOY_PATH, PROD_DEPLOY_PATH
```

New this phase: **root `.env.example`** — the deploy compose file refuses to
start without three required vars (`POSTGRES_PASSWORD:?`,
`MINIO_ROOT_PASSWORD:?`, `NEXT_PUBLIC_API_URL:?`), but until now no template
documented them. Both deploy workflows now fail with an actionable message
(`copy .env.example and fill it in`) when either file is missing.

> Design note: the earlier drafts passed passwords as GitHub **variables**
> (plaintext — anyone with read access can see them). Removing them from CI
> entirely is strictly safer than moving them to `secrets`.

---

## 5. Required GitHub configuration (live probe)

Read-only `gh api` probe of the actual repository
(`Sardor-Dev-2010/Logistimus`, private, default branch `main`):

```
=== environments ===
(empty — no environments exist)
=== repository secrets ===
(empty)
=== repository variables ===
(empty)
=== branch protection: main ===
HTTP 403: "Upgrade to GitHub Pro or make this repository public to enable this feature."
=== registered workflows on remote ===
(empty — workflow files not pushed yet)
=== git status -sb ===
## main...origin/main [ahead 12]
=== gh run list ===
(empty — CI has never run)
```

### Setup checklist (operator, before first use)

| Step | Where | Status |
|---|---|---|
| `git push origin main` | activates Backend + Frontend CI (does **not** deploy anything) | `NOT_CONFIGURED` |
| Create environment `production` → add **required reviewers** | Settings → Environments. Without it the guard job **refuses to deploy** (by design) | `NOT_CONFIGURED` |
| Create environment `staging` (no rules — auto-deploy) | Settings → Environments | `NOT_CONFIGURED` |
| Add secrets `STAGING_SSH_KEY`, `STAGING_HOST`, `STAGING_USER`, `STAGING_PORT` | Settings → Secrets → Actions | `NOT_CONFIGURED` |
| Add secrets `PROD_SSH_KEY`, `PROD_HOST`, `PROD_USER`, `PROD_PORT` | ditto | `NOT_CONFIGURED` |
| Optional variables `STAGING_DEPLOY_PATH`, `PROD_DEPLOY_PATH` | default `$HOME/logistimus` | `NOT_CONFIGURED` |
| Create `develop` branch + staging host checkout with `.env`, `Backend/.env`, TLS certs | host | `NOT_CONFIGURED` |
| Branch protection / required checks on `main` | **impossible on free plan + private repo** | **`BLOCKED`** |

---

## 6. Verification performed this phase

| Check | Command | Result |
|---|---|---|
| Workflow YAML parses, no duplicate keys | `validate_wf.py` (duplicate-key-preserving loader) | `YAML OK` × 4 |
| Embedded remote scripts are valid bash | `bash -n` on all 6 heredoc blocks (Phase 6; `backup.yml` added a 7th in Phase 7, also `bash -n` OK) | `bash -n OK` × 6 |
| argv crossing ssh works | local `bash -s -- '<path>' '<ref>'` harness | `REPO_DIR=/opt/repo DEPLOY_REF=main`; empty path falls back to `$HOME/logistimus` (evaluated **remote-side**) |
| Injection guard | char-class test | `main`, `release/1.2` → ACCEPT; `a;rm -rf /`, `a'b`, `$(id)`, `a b` → REJECT |
| Host derivation from API URL | sed harness | `https://api.example.com/api/v1` → `api.example.com`; with port → host only; empty → caught by `[ -n ]` guard |
| Least privilege | all six workflows declare `permissions:` (four at Phase 6 + `backup.yml` + `canary.yml`) | `YAML OK … (no missing-top-level-permissions issues)` |
| Nothing deployed | `gh run list` empty; no staging/production host contacted | **PASS** |

---

## 7. Known gaps / follow-ups

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Workflows not on GitHub, never executed | `NOT_VERIFIED` | push `main` (CI only), then create environments/secrets per §5 |
| 2 | Branch protection impossible | **`BLOCKED`** | free plan + private repo → HTTP 403 (§1.1) |
| 3 | GitHub environments/secrets/variables | `NOT_CONFIGURED` | §5 checklist |
| 4 | Staging host does not exist | `NOT_CONFIGURED` | no machine to deploy to yet |
| 5 | TLS `server_name` placeholders | `NOT_CONFIGURED` | `api./app.logistimus.example.com` must become real domains on each host (the health probe now derives `Host` from `NEXT_PUBLIC_API_URL`, so a mismatch fails the deploy — it will not pass silently) |
| 6 | Scheduled dependency audits | `NOT_CONFIGURED` | add `on: schedule:` later |
| 7 | Rollback does not reverse migrations | `NOT_CONFIGURED` | forward-only by policy; see `ROLLBACK_PLAN.md` (Phase 10) |
| 8 | No deploy notifications | `NOT_CONFIGURED` | failures are visible only in the Actions run |

---

## 8. Verdict

**CI/CD READINESS: PASS with follow-ups.**

CI (backend + frontend) is complete and locally green, now including a
dependency audit on the backend. The deploy pipelines are double-gated for
production (typed confirmation + environment reviewers + fail-closed guard),
back up the database before touching code, verify health through the real
vhost, and roll back on failure. Seven defects in the initial drafts were
found by inspection and fixed — including a duplicate `env:` key and an
argument-passing bug that would have made **every production deploy fail**,
plus a fake rollback.

What is *not* yet proven: the workflows have never executed on GitHub
(`NOT_VERIFIED` — needs a push and repository configuration, §5), branch
protection is unavailable on the current plan (`BLOCKED`), and no staging
host exists yet. None of these can be closed from inside this assessment
without touching GitHub settings or deploying — both explicitly out of scope.
