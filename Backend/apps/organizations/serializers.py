"""Organization endpoint serializers (API_SPECIFICATION §4)."""

from __future__ import annotations

from rest_framework import serializers

from apps.core.models import Organization
from apps.organizations.models import ApiKey, Branch, Invitation, OrganizationSettings


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "legal_name",
            "tax_id",
            "headquarters_address",
            "base_currency",
            "verification_status",
            "fleet_size_band",
            "created_at",
        ]
        read_only_fields = ["id", "slug", "verification_status", "created_at"]


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ["id", "name", "type", "status", "is_primary", "address"]

    def validate_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Branch name is required.")
        return value


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationSettings
        fields = [
            "distance_unit",
            "date_format",
            "feature_flags",
            "notification_preferences",
        ]

    def validate_distance_unit(self, value: str) -> str:
        if value not in ("km", "mi"):
            raise serializers.ValidationError("distance_unit must be 'km' or 'mi'.")
        return value


class InvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.CharField(max_length=64)


class MemberRoleSerializer(serializers.Serializer):
    role = serializers.CharField(max_length=64)


class ApiKeyCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    scopes = serializers.ListField(
        child=serializers.CharField(max_length=100),
        allow_empty=True,
        required=False,
    )
    expires_in_days = serializers.IntegerField(
        required=False, min_value=1, max_value=3650, allow_null=True
    )


def membership_row(membership) -> dict:
    user = membership.user
    return {
        "user": {
            "id": str(user.id),
            "name": user.full_name,
            "email": user.email,
        },
        "role": membership.role.name,
        "status": membership.status,
        "last_login_at": user.last_login_at,
    }


def invitation_row(invitation: Invitation) -> dict:
    return {
        "id": str(invitation.id),
        "email": invitation.email,
        "role": invitation.role.name,
        "expires_at": invitation.expires_at,
        "accepted_at": invitation.accepted_at,
        "created_at": invitation.created_at,
    }


def api_key_row(key: ApiKey) -> dict:
    return {
        "id": str(key.id),
        "name": key.name,
        "prefix": f"{key.prefix}…",
        "scopes": key.scopes,
        "created_at": key.created_at,
        "expires_at": key.expires_at,
        "last_used_at": key.last_used_at,
        "revoked": key.revoked,
    }
