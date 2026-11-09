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
        # Per-method codes: {"PATCH": "org.role.change", ...} — lets one
        # view serve update/delete behind different catalog entries.
        codes = getattr(view, "permission_codes", None)
        if codes:
            code = codes.get(request.method, code)
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

    Resolved through apps.permissions (RBAC tables, cached per org+role).
    `owner`/`super_admin` roles are seeded with the full catalog, so any
    catalog addition flows to them on the next seed/invalidation. Never
    trusts the client: org and role come from the server-validated context.
    """
    org_id = context.get_org_id()
    role = context.get_role()
    if org_id is None or not role:
        return set()

    from apps.permissions.services import effective_permissions  # noqa: PLC0415

    return effective_permissions(org_id, role)


class IsPlatformAdmin(BasePermission):
    """Guard for /super-admin/* — org roles never grant platform access."""

    message = "platform_admin_required"

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_platform_admin)


class IsOrgMember(BasePermission):
    """Spec "Member": authenticated AND bound to an organization.

    Used for reads every role may perform (own org profile, branches list,
    settings display). Organization data stays tenant-scoped either way —
    this only gates *access*, never *visibility scope*.
    """

    message = "No organization selected."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and context.get_org_id() is not None)


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
