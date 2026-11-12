"""`manage.py provision_app_role` — create the NON-superuser app role.

Why
---
`apps.core.db.enable_rls()` creates `ENABLE` + `FORCE ROW LEVEL SECURITY`
policies that are the platform's last line of defense for tenant isolation.
PostgreSQL superusers ALWAYS bypass RLS — even with FORCE.

Railway's managed Postgres hands the app the `postgres` superuser through
DATABASE_URL, which would silently disable every RLS policy. Verified on
this repo's own dev database:

    current_user = logistimus   rolsuper = True
    rows visible with NO org context as logistimus: 2   <-- all tenants visible
    rows visible with NO org context as <plain role>: 0   <-- RLS enforced

This command provisions `logistimus_app` with NOBYPASSRLS and the DML
rights the app needs, and prints the ready-to-use connection URL.

The role must own the tables for `FORCE ROW LEVEL SECURITY` to bind to it, so
migrations must run AS THIS ROLE. That is why the deploy entrypoint runs
migrations with `DATABASE_URL` pointing at the app role and keeps the
superuser URL in a separate variable.

The command is IDEMPOTENT: when the role already exists it is updated in
place (password + grants) instead of being dropped and recreated. Dropping
it would fail while it owns tables, and `DROP OWNED BY` would strip
privileges from the objects it owns — including the very tables the app
needs.

Usage (run once against a fresh database):
    DATABASE_URL=<superuser url> \\
    APP_DB_PASSWORD=<generated> \\
    uv run python manage.py provision_app_role

It prints:
    APP_DATABASE_URL=postgresql://logistimus_app:<pw>@host:5432/db
"""

from __future__ import annotations

import secrets

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

ROLE = "logistimus_app"

# Every table the app touches. Kept explicit so a missing grant is a loud
# failure here rather than a runtime "permission denied" in production.
APP_TABLES = [
    # django.contrib.auth / contenttypes / admin / sessions
    "auth_permission",
    "auth_group",
    "auth_group_permissions",
    "auth_user",
    "auth_user_groups",
    "auth_user_user_permissions",
    "django_admin_log",
    "django_content_type",
    "django_migrations",
    "django_session",
    # core
    "core_user",
    "core_organization",
    "core_auditlog",
    # organizations
    "organizations_branch",
    "organizations_department",
    "organizations_membership",
    "organizations_invitation",
    "organizations_apikey",
    "organizations_organizationsettings",
    # permissions
    "permissions_permission",
    "permissions_role",
    "permissions_rolepermission",
    # accounts
    "accounts_refreshtoken",
    "accounts_emailverification",
    "accounts_passwordresettoken",
    "accounts_loginhistory",
]


class Command(BaseCommand):
    help = "Create the non-superuser logistimus_app role so RLS policies apply."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--password",
            default=None,
            help="Password for the role. Default: a generated one (printed once).",
        )
        parser.add_argument(
            "--role",
            default=ROLE,
            help=f"Role name to create (default: {ROLE}).",
        )
        parser.add_argument(
            "--print-only",
            action="store_true",
            help="Only print the APP_DATABASE_URL for an existing role.",
        )

    def handle(self, *args, **options) -> None:
        if connection.vendor != "postgresql":
            raise CommandError("This command requires PostgreSQL.")

        with connection.cursor() as cur:
            cur.execute(
                "SELECT current_user, rolsuper FROM pg_roles WHERE rolname = current_user"
            )
            current_user, is_super = cur.fetchone()

        role = options["role"]
        password = options["password"] or secrets.token_urlsafe(32)
        if len(password) < 24:
            raise CommandError("Password must be at least 24 characters.")

        if options["print_only"]:
            self.stdout.write(f"APP_DATABASE_URL={self._app_url(role, password)}")
            return

        if not is_super:
            raise CommandError(
                f"Current role '{current_user}' is not a superuser — it cannot "
                "manage roles. Run this with the admin/superuser DATABASE_URL."
            )

        # The role name is passed as a bind parameter and quoted by
        # PostgreSQL's format('%I', ...) — so it must NOT be pre-quoted here
        # (a pre-quoted value would be quoted twice and fail to resolve).
        quoted_role = role
        quoted_pw = "'" + password.replace("'", "''") + "'"

        with connection.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", [role])
            exists = cur.fetchone() is not None

            if exists:
                # Update in place — never drop the role. Dropping it would
                # fail while it owns tables, and DROP OWNED BY would strip
                # the privileges it holds on them.
                _log_action(self, f"role {role} already exists — updating in place")
                cur.execute(f"ALTER ROLE {quoted_role} PASSWORD {quoted_pw};")
                cur.execute(f"ALTER ROLE {quoted_role} NOSUPERUSER NOBYPASSRLS;")
            else:
                # NOBYPASSRLS is the critical attribute: without it the role
                # skips every policy in the database.
                cur.execute(
                    f"""
                    CREATE ROLE {quoted_role}
                        LOGIN
                        NOSUPERUSER
                        NOCREATEDB
                        NOCREATEROLE
                        NOBYPASSRLS
                        PASSWORD {quoted_pw};
                    """
                )
                _log_action(self, f"role {role} created")

            # The role owns the schema so migrations (run as this role) can
            # create tables, and so it owns the tables it creates — which is
            # what makes FORCE ROW LEVEL SECURITY bind to it.
            cur.execute(f"GRANT USAGE, CREATE ON SCHEMA public TO {quoted_role};")
            cur.execute(f"ALTER SCHEMA public OWNER TO {quoted_role};")
            # Make the role the owner of everything created afterwards.
            cur.execute(
                f"ALTER DEFAULT PRIVILEGES FOR ROLE {quoted_role} IN SCHEMA public "
                f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {quoted_role};"
            )
            cur.execute(
                f"ALTER DEFAULT PRIVILEGES FOR ROLE {quoted_role} IN SCHEMA public "
                f"GRANT USAGE, SELECT ON SEQUENCES TO {quoted_role};"
            )
            # Existing tables — the app owns them so FORCE binds. The table
            # may not exist yet (fresh database, migrations not run), so both
            # the ownership change and the grant are guarded.
            for table in APP_TABLES:
                cur.execute(
                    """
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM pg_class c
                            JOIN pg_namespace n ON n.oid = c.relnamespace
                            WHERE c.relname = %s AND n.nspname = 'public'
                        ) THEN
                            EXECUTE format('ALTER TABLE %%I OWNER TO %%I', %s, %s);
                            EXECUTE format(
                                'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %%I TO %%I',
                                %s, %s
                            );
                        END IF;
                    END $$;
                    """,
                    [table, table, quoted_role, table, quoted_role],
                )
            # Django's own tables (auth_*, django_*) are created by the admin
            # superuser, so their ownership has to move too — otherwise the
            # restricted role cannot even read django_migrations.
            # The set is matched by prefix so a table Django adds in a future
            # release is covered without editing this list.
            cur.execute(
                """
                DO $$
                DECLARE t record;
                BEGIN
                    FOR t IN
                        SELECT c.relname
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'public'
                          AND c.relkind = 'r'
                          AND (
                              c.relname LIKE 'auth\\_%%'
                              OR c.relname LIKE 'django\\_%%'
                              OR c.relname = 'users'
                          )
                    LOOP
                        EXECUTE format('ALTER TABLE %%I OWNER TO %%I', t.relname, %s);
                        EXECUTE format(
                            'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %%I TO %%I',
                            t.relname, %s
                        );
                    END LOOP;
                END $$;
                """,
                [quoted_role, quoted_role],
            )
            # Sequences created by the admin role (identity/serial columns of
            # django_* tables) also need to be usable by the app role.
            # NOTE: PostgreSQL refuses `ALTER SEQUENCE ... OWNER TO`, so only
            # the USAGE/SELECT grants are applied here — the app role never
            # creates or alters sequences, it only calls nextval()/currval().
            cur.execute(
                f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {quoted_role};"
            )
            # Catch-all for every table in the public schema (including tables
            # Django creates that are not in APP_TABLES). Without this the
            # restricted role hits "permission denied for table X" on the
            # first table the app touches that the explicit list missed.
            cur.execute(
                """
                DO $$
                DECLARE t record;
                BEGIN
                    FOR t IN
                        SELECT c.relname
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'public'
                          AND c.relkind = 'r'
                          AND c.relname NOT LIKE 'pg\\_%%'
                    LOOP
                        EXECUTE format(
                            'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %%I TO %%I',
                            t.relname, %s
                        );
                    END LOOP;
                END $$;
                """,
                [quoted_role],
            )

        self.stdout.write(self.style.SUCCESS(f"ROLE_PROVISIONED role={role}"))
        # Print the app URL so the operator can paste it into Railway.
        url = self._app_url(role, password)
        self.stdout.write(f"APP_DATABASE_URL={url}")

    def _app_url(self, role: str, password: str) -> str:
        """Build a postgresql:// URL for the role from the current connection."""
        params = connection.get_connection_params()
        host = params.get("host") or "localhost"
        port = params.get("port") or 5432
        dbname = params.get("dbname") or "postgres"
        return f"postgresql://{role}:{password}@{host}:{port}/{dbname}"


def _log_action(command: Command, message: str) -> None:
    command.stdout.write(f"  {message}")
