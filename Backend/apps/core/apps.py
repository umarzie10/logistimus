from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    label = "core"
    verbose_name = "Core (identity, tenancy, audit)"

    def ready(self):  # pragma: no cover - imported by Django at startup
        # Register system checks (permission coverage, RLS conventions)
        from apps.core import checks  # noqa: F401
