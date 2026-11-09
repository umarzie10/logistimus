"""RBAC endpoints (API_SPECIFICATION §5)."""

from __future__ import annotations

from django.db import IntegrityError
from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import ApiError, ConflictApiError, NotFoundApiError
from apps.core.openapi import (
    STR,
    arr,
    extend_schema,
    inline_serializer,
    obj,
    s,
)
from apps.permissions import catalog, services
from apps.permissions.models import Permission, Role
from apps.permissions.serializers import (
    RoleCreateSerializer,
    RoleSerializer,
    RoleUpdateSerializer,
    apply_role_permissions,
)


@extend_schema(
    summary="List permission catalog grouped by module",
    responses={
        200: obj(
            results=arr(
                obj(
                    module=STR,
                    label=STR,
                    permissions=arr(
                        obj(
                            code=STR,
                            object=STR,
                            action=STR,
                            description=STR,
                        )
                    ),
                )
            )
        )
    },
    tags=["Permissions"],
)
class PermissionCatalogView(APIView):
    """Full catalog grouped by module — any authenticated member."""

    permission_code = "org.permission.view"

    def get(self, request):
        groups: dict[str, dict] = {}
        for perm in Permission.objects.order_by("module", "object", "action"):
            group = groups.setdefault(
                perm.module,
                {"module": perm.module, "label": "", "permissions": []},
            )
            group["label"] = catalog.MODULES.get(perm.module, {}).get("label", perm.module.title())
            group["permissions"].append(
                {
                    "code": perm.code,
                    "object": perm.object,
                    "action": perm.action,
                    "description": perm.description,
                }
            )
        return Response({"results": list(groups.values())})


@extend_schema(
    summary="Get caller's effective permissions",
    responses={
        200: obj(
            role=s(nullable=True),
            permissions=arr(STR),
        )
    },
    tags=["Permissions"],
)
class MePermissionsView(APIView):
    """Effective permission codes for (user, current org) — UI gating only.

    The server always re-checks the same set on every endpoint; this just
    lets the frontend hide what would 403.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.core import context  # noqa: PLC0415

        org_id = context.get_org_id()
        role = context.get_role()
        if org_id is None:
            # Platform admin without org context: full catalog (they bypass
            # org permission checks anyway); a member without org: empty.
            codes = catalog.all_codes() if request.user.is_platform_admin else []
            return Response({"role": None, "permissions": codes})
        codes = sorted(services.effective_permissions(org_id, role or ""))
        return Response({"role": role, "permissions": codes})


class RoleListCreateView(APIView):
    """GET org roles (built-in + custom) / POST create a custom role."""

    permission_codes = {
        "GET": "org.role.view",
        "POST": "org.role.create",
    }

    @extend_schema(
        summary="List roles in organization",
        responses={
            200: inline_serializer(
                "RoleListResponse",
                fields={"results": RoleSerializer(many=True)},
            )
        },
        tags=["Permissions"],
    )
    def get(self, request):
        roles = Role.objects.prefetch_related("grants__permission")
        return Response({"results": RoleSerializer(roles, many=True).data})

    @extend_schema(
        summary="Create a custom role",
        request=RoleCreateSerializer,
        responses={201: RoleSerializer},
        tags=["Permissions"],
    )
    def post(self, request):
        serializer = RoleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if Role.objects.filter(name=data["name"]).exists():
            raise ApiError("validation_error", "Role name already exists in this organization.")
        try:
            role = Role.objects.create(
                name=data["name"],
                label=data.get("label", ""),
                description=data.get("description", ""),
                is_builtin=False,
            )
        except IntegrityError as exc:  # concurrent create
            raise ApiError(
                "validation_error",
                "Role name already exists in this organization.",
            ) from exc
        apply_role_permissions(role, data.get("permissions", []))
        services.invalidate_role_cache(role.organization_id)
        role = Role.objects.prefetch_related("grants__permission").get(pk=role.pk)
        return Response(
            RoleSerializer(role).data,
            status=status.HTTP_201_CREATED,
        )


class RoleDetailView(APIView):
    """PATCH update / DELETE remove a custom role (built-ins undeletable)."""

    permission_codes = {
        "PATCH": "org.role.change",
        "DELETE": "org.role.delete",
    }

    def _get_role(self, pk) -> Role:
        try:
            # TenantManager scopes to the request org; cross-org -> 404.
            return Role.objects.get(pk=pk)
        except (Role.DoesNotExist, ValueError) as exc:
            raise NotFoundApiError() from exc

    @extend_schema(
        summary="Update a custom role",
        request=RoleUpdateSerializer,
        responses={200: RoleSerializer},
        tags=["Permissions"],
    )
    def patch(self, request, pk):
        role = self._get_role(pk)
        serializer = RoleUpdateSerializer(role, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        role.label = data.get("label", role.label)
        role.description = data.get("description", role.description)
        role.save()
        if "permissions" in data:
            apply_role_permissions(role, data["permissions"])
        services.invalidate_role_cache(role.organization_id)
        role = Role.objects.prefetch_related("grants__permission").get(pk=role.pk)
        return Response(RoleSerializer(role).data)

    @extend_schema(
        summary="Delete a custom role",
        responses={204: None},
        tags=["Permissions"],
    )
    def delete(self, request, pk):
        role = self._get_role(pk)
        if role.is_builtin:
            raise ConflictApiError("builtin_role", "Built-in roles cannot be deleted.")
        try:
            org_id = role.organization_id
            role.delete()
        except ProtectedError as exc:
            raise ConflictApiError(
                "role_in_use",
                "This role is still assigned to members.",
            ) from exc
        services.invalidate_role_cache(org_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


__all__ = [
    "MePermissionsView",
    "PermissionCatalogView",
    "RoleDetailView",
    "RoleListCreateView",
]
