"""RBAC serializers (API_SPECIFICATION §5)."""

from __future__ import annotations

from rest_framework import serializers

from apps.permissions.models import Permission, Role, RolePermission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["code", "module", "object", "action", "description"]


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    is_builtin = serializers.BooleanField(read_only=True)

    class Meta:
        model = Role
        fields = ["id", "name", "label", "description", "is_builtin", "permissions"]

    def get_permissions(self, obj: Role) -> list[str]:
        # Prefetched by the view; grant rows are org-scoped like the role.
        return sorted(rp.permission.code for rp in obj.grants.all())


class RoleCreateSerializer(serializers.ModelSerializer):
    permissions = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Role
        fields = ["name", "label", "description", "permissions"]

    def validate_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Role name is required.")
        if value in ("owner", "super_admin"):
            raise serializers.ValidationError("This role name is reserved.")
        return value

    def validate_permissions(self, value: list[str]) -> list[str]:
        known = set(Permission.objects.values_list("code", flat=True))
        unknown = sorted(set(value) - known)
        if unknown:
            raise serializers.ValidationError(f"Unknown permission codes: {', '.join(unknown)}")
        return value


class RoleUpdateSerializer(RoleCreateSerializer):
    class Meta(RoleCreateSerializer.Meta):
        fields = ["label", "description", "permissions"]


def apply_role_permissions(role: Role, codes: list[str]) -> None:
    """Replace a role's grants atomically (server-side org only)."""
    from django.db import transaction

    permission_ids = list(Permission.objects.filter(code__in=codes).values_list("id", flat=True))
    with transaction.atomic():
        RolePermission.objects.filter(role=role).delete()
        RolePermission.objects.bulk_create(
            [
                RolePermission(
                    organization_id=role.organization_id,
                    role=role,
                    permission_id=pk,
                )
                for pk in permission_ids
            ],
            batch_size=500,
        )
