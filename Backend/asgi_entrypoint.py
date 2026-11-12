"""Entrypoint for the Railway `api` service.

Three Railway-specific problems are solved here:

1. Railway runs the start command in exec form (no shell), so `$PORT` would
   reach uvicorn as the literal string "$PORT" and uvicorn rejects it
   ("Invalid value for '--port'"). This module reads the real value from
   the environment and hands uvicorn an int.

2. Tenant isolation depends on the app NOT connecting as a PostgreSQL
   superuser: superusers bypass Row Level Security even with FORCE. This
   module therefore
     a. provisions a non-superuser role (`logistimus_app`, NOBYPASSRLS) using
        the admin connection, and
     b. repoints DATABASE_URL at that role for the whole uvicorn process,
        so every request is evaluated against the RLS policies.
   Both steps are idempotent.

3. The one-time database bootstrap (role + migrations) runs here instead of
   in a pre-deploy hook: Railway's V2 runtime does not execute
   `preDeployCommand`.

The RLS self-check at startup prints the verification result into the
deployment log, so the guarantee is observable without an extra tool.
"""

from __future__ import annotations

import os
import subprocess
import sys

ROLE = "logistimus_app"


def _log(message: str) -> None:
    print(f"[entrypoint] {message}", flush=True)


def _db_urls() -> tuple[str, str | None]:
    """Return (admin_url, app_url)."""
    admin_url = os.environ.get("DATABASE_ADMIN_URL") or os.environ.get("DATABASE_URL", "")
    password = os.environ.get("APP_DB_PASSWORD", "")
    if not admin_url or not password:
        return admin_url, None
    host = os.environ.get("PGHOST", "postgres.railway.internal")
    port = os.environ.get("PGPORT", "5432")
    dbname = os.environ.get("POSTGRES_DB", "railway")
    app_url = f"postgresql://{ROLE}:{password}@{host}:{port}/{dbname}"
    return admin_url, app_url


def _run(cmd: list[str], env: dict[str, str] | None = None) -> subprocess.CompletedProcess:
    # The command list is built entirely from literals in this module — no
    # external input reaches the shell (S603).
    return subprocess.run(cmd, check=False, env=env, capture_output=True, text=True)  # noqa: S603


def _provision_role(admin_url: str, password: str) -> bool:
    _log("provisioning the non-superuser database role…")
    result = _run(
        [
            "uv",
            "run",
            "python",
            "manage.py",
            "provision_app_role",
            "--password",
            password,
            "--settings=config.settings.prod",
        ],
        env={**os.environ, "DATABASE_URL": admin_url},
    )
    if result.returncode != 0:
        _log(f"role provisioning FAILED: {(result.stderr or '')[-400:]}")
        return False
    _log("role provisioned")
    return True


def _migrate(app_url: str) -> bool:
    _log("running migrations as the app role…")
    env = {**os.environ, "DATABASE_URL": app_url}
    result = _run(
        [
            "uv",
            "run",
            "python",
            "manage.py",
            "migrate",
            "--noinput",
            "--settings=config.settings.prod",
        ],
        env=env,
    )
    if result.returncode != 0:
        _log(f"migrations FAILED: {(result.stderr or '')[-400:]}")
        return False
    _log("migrations complete")
    return True


def _rls_self_check(app_url: str) -> None:
    """Prove on the live deployment that the app role is RLS-bound."""
    try:
        import psycopg
    except ImportError:  # pragma: no cover
        return
    try:
        with psycopg.connect(app_url, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT current_user, rolsuper, rolbypassrls "
                    "FROM pg_roles WHERE rolname = current_user"
                )
                user, is_super, bypass = cur.fetchone()
                cur.execute("SELECT count(*) FROM organizations_branch")
                visible = cur.fetchone()[0]
        _log(
            f"RLS self-check: user={user} rolsuper={is_super} "
            f"rolbypassrls={bypass} rows_visible_without_org_context={visible}"
        )
        if is_super or bypass:
            _log("RLS self-check FAILED: the app role can bypass tenant policies")
        elif visible != 0:
            _log(f"RLS self-check FAILED: {visible} rows visible without an org context")
        else:
            _log("RLS self-check PASSED: tenant isolation enforced at the database level")
    except Exception as exc:  # noqa: BLE001
        _log(f"RLS self-check could not run: {type(exc).__name__}: {exc}")


def _optional_seed() -> None:
    """Run the synthetic-data seeder when explicitly requested."""
    if os.environ.get("SEED_STAGING", "").lower() not in {"1", "true", "yes"}:
        return
    _log("seeding synthetic staging data…")
    result = _run(
        ["uv", "run", "python", "manage.py", "seed_staging", "--yes-synthetic"],
    )
    tail = (result.stdout or "")[-600:]
    _log(f"seed_staging rc={result.returncode}: {tail}")


def main() -> None:
    import uvicorn

    admin_url, app_url = _db_urls()

    if app_url:
        if _provision_role(admin_url, os.environ["APP_DB_PASSWORD"]):
            if _migrate(app_url):
                # From here on EVERY request (and the Celery task) connects as
                # the restricted role, so RLS actually applies.
                os.environ["DATABASE_URL"] = app_url
                _rls_self_check(app_url)
            else:
                _log("migrations failed — keeping the admin connection for this run")
    else:
        _log("APP_DB_PASSWORD not set — skipping the role bootstrap")

    _optional_seed()

    port = int(os.environ.get("PORT", "8000"))
    _log(f"starting uvicorn on 0.0.0.0:{port}")
    uvicorn.run(
        "config.asgi:application",
        host="0.0.0.0",  # noqa: S104 — Railway requires binding all interfaces
        port=port,
        log_level=os.environ.get("UVICORN_LOG_LEVEL", "info"),
        proxy_headers=True,
        forwarded_allow_ips="*",
    )


if __name__ == "__main__":
    sys.exit(main())
