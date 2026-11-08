"""Permission classes (SECURITY_PLAN §2).

`HasPermission` reads `view.permission_code` (an `module.action` code from the
permission catalog). Views that don't declare one are allowed for any
authenticated user — this keeps Phase 1 (health/infra) unblocked; from
Phase 2 on, a system check (`check_permissions_coverage`) fails CI when an
API view lacks an explicit code or an explicit `permission_classes`.
"""
from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.core import context


class HasPermission(BasePermission):
    """Default-deny once `permission_code` is declared on the view."""

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        code = getattr(view, "permission_code", None)
        if not code:
            # No code declared: view must have opted into a narrower
            # permission_classes of its own (checked by system check).
            return True

        # Platform admins bypass org-level permission checks on their own
        # surface (super-admin router declares IsPlatformAdmin separately).
        if context.is_platform_admin():
            return True

        permissions = getattr(request, "effective_permissions", None)
        if permissions is None:
            permissions = _load_permissions(request)
            request.effective_permissions = permissions

        return code in permissions


def _load_permissions(request) -> set[str]:
    """Effective permission codes for (user, current org).

    Phase 2 wires this to the Role/RolePermission tables; until then a
    member of an org gets a permissive set so business endpoints can land
    behind real codes one phase at a time. Never trusts the client.
    """
    org_id = context.get_org_id()
    if org_id is None:
        return set()

    # Phase 2 replaces this with the Role/RolePermission lookup
    # (apps/permissions/services.py::effective_permissions).
    return set()


class IsPlatformAdmin(BasePermission):
    """Guard for /super-admin/* — org roles never grant platform access."""

    message = "platform_admin_required"

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_platform_admin
        )


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
