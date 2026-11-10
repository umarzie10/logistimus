"""System checks run by `manage.py check` (and CI).

1. RLS coverage: every tenant-owned model must have an RLS policy on its
   table (DATABASE_SCHEMA §15, SECURITY_PLAN §3.5) — enforced on PostgreSQL;
   skipped on SQLite test runs where RLS does not exist.
2. Permission coverage: every API view must declare either `permission_code`
   or explicit `permission_classes` (default-deny discipline, SECURITY_PLAN §2).
"""

from __future__ import annotations

from django.core.checks import Error, Tags, Warning, register

from apps.core import db

rls_tag = Tags.security


@register(Tags.security)
def rls_convention_check(app_configs, **kwargs):
    errors = []
    if not db._vendor_is_postgres():
        return errors  # RLS exists only on PostgreSQL; covered by CI pg tests

    from django.apps import apps

    enabled = set(db.rls_enabled_tables())
    # Only tables that physically exist can violate the convention. Without
    # this filter a brand-new database (no migrations applied yet) fails
    # E001 for every tenant model, which deadlocks deployment: `migrate`
    # runs system checks BEFORE applying migrations, so RLS could never be
    # created. Once a table exists, missing RLS is still a hard error.
    present = db.existing_tables()
    for model in apps.get_models():
        if not getattr(model, "traced_by_org", False):
            continue
        if not any(f.name == "organization" for f in model._meta.fields):
            continue
        table = model._meta.db_table
        if table in present and table not in enabled:
            errors.append(
                Error(
                    f"Tenant table '{table}' lacks a PostgreSQL RLS policy.",
                    hint=(
                        "Add enable_rls('table', 'policy') in a migration "
                        "(apps.core.db.enable_rls) — see DATABASE_SCHEMA §15."
                    ),
                    id="logistimus.E001",
                )
            )
    return errors


@register(Tags.compatibility)
def permission_coverage_check(app_configs, **kwargs):
    """Every API view must be explicit about its authorization."""
    from django.urls import URLResolver, get_resolver
    from rest_framework.views import APIView

    warnings = []

    def walk(resolver, prefix=""):
        for pattern in resolver.url_patterns:
            path = prefix + str(pattern.pattern)
            if isinstance(pattern, URLResolver):
                walk(pattern, path)
            else:
                callback = getattr(pattern.callback, "cls", None)
                if callback is not None and issubclass(callback, APIView):
                    view = callback
                    has_code = hasattr(view, "permission_code") or hasattr(view, "permission_codes")
                    has_explicit = "permission_classes" in view.__dict__
                    if not has_code and not has_explicit:
                        warnings.append(
                            Warning(
                                f"API view {path} declares neither permission_code "
                                "nor permission_classes.",
                                hint=(
                                    "Set permission_code='module.action' (catalog) "
                                    "or explicit permission_classes on the view class."
                                ),
                                id="logistimus.W001",
                            )
                        )

    try:
        walk(get_resolver())
    except Exception:  # pragma: no cover - resolver unavailable during setup
        return warnings
    return warnings
