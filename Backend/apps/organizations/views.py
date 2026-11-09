"""Organization endpoints (API_SPECIFICATION §4).

Authorization: spec "Role:owner/admin" maps to catalog codes (owner-only
actions get owner-only codes); spec "Member" maps to `IsOrgMember`.
Cross-tenant rows never resolve — TenantManager returns an empty queryset
and the API answers 404.
"""

from __future__ import annotations

from django.db import IntegrityError
from rest_framework import status
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core import audit, context
from apps.core.exceptions import (
    ApiError,
    ConflictApiError,
    NotFoundApiError,
)
from apps.core.models import Organization
from apps.core.openapi import (
    BOOL,
    DATETIME,
    STR,
    arr,
    extend_schema,
    inline_serializer,
    obj,
    page,
    s,
    serializers,
)
from apps.core.pagination import StandardPagination
from apps.core.permissions import HasPermission, IsOrgMember
from apps.organizations import serializers as org_serializers
from apps.organizations import services, tasks
from apps.organizations.models import (
    ApiKey,
    Branch,
    Invitation,
    Membership,
    OrganizationSettings,
)
from apps.permissions import services as perm_services
from apps.permissions.models import Role


class MemberReadMixin:
    """Spec "Member" reads vs "Role:…" writes on one endpoint.

    GET -> IsOrgMember (any member). Writes -> HasPermission reading the
    class's `permission_codes` (catalog code). `permission_classes` is set
    for the W001 system check and as the safe-method default.
    """

    permission_classes = [IsAuthenticated, IsOrgMember]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), IsOrgMember()]
        return [IsAuthenticated(), IsOrgMember(), HasPermission()]


def _current_org() -> Organization:
    org_id = context.get_org_id()
    if org_id is None:
        raise ApiError("forbidden", "No organization selected.")
    try:
        # Organization is the tenancy root (unscoped by design).
        return Organization.objects.get(pk=org_id, is_active=True, deleted_at__isnull=True)
    except Organization.DoesNotExist as exc:
        raise NotFoundApiError() from exc


_MEMBERSHIP_ROW_SCHEMA = obj(
    id=STR,
    user=obj(id=STR, name=STR, email=STR),
    role=STR,
    status=STR,
    last_login_at=s(nullable=True, format="date-time"),
)

_INVITATION_ROW_SCHEMA = obj(
    id=STR,
    email=STR,
    role=STR,
    expires_at=DATETIME,
    accepted_at=s(nullable=True, format="date-time"),
    created_at=DATETIME,
)

_API_KEY_ROW_SCHEMA = obj(
    id=STR,
    name=STR,
    prefix=STR,
    scopes=arr(STR),
    created_at=DATETIME,
    expires_at=s(nullable=True, format="date-time"),
    last_used_at=s(nullable=True, format="date-time"),
    revoked=BOOL,
)

_API_KEY_CREATE_RESPONSE = obj(
    id=STR,
    name=STR,
    prefix=STR,
    scopes=arr(STR),
    created_at=DATETIME,
    expires_at=s(nullable=True, format="date-time"),
    last_used_at=s(nullable=True, format="date-time"),
    revoked=BOOL,
    secret=STR,
)


@extend_schema(
    summary="List current user's organizations",
    responses={
        200: obj(
            results=arr(
                obj(
                    organization_id=STR,
                    organization_name=STR,
                    slug=STR,
                    role=STR,
                    is_current=BOOL,
                )
            )
        )
    },
    tags=["Organizations"],
)
class MyOrganizationsView(APIView):
    """GET /organizations/mine/ — workspaces for the sidebar."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = (
            Membership.unscoped.filter(user=request.user)
            .select_related("organization", "role")
            .order_by("organization__name")
        )
        current = context.get_org_id()
        return Response(
            {
                "results": [
                    {
                        "organization_id": str(m.organization_id),
                        "organization_name": m.organization.name,
                        "slug": m.organization.slug,
                        "role": m.role.name,
                        "is_current": m.organization_id == current,
                    }
                    for m in rows
                ]
            }
        )


class CurrentOrganizationView(MemberReadMixin, APIView):
    """GET (Member) / PATCH (Role:owner/admin) /organizations/current/."""

    permission_codes = {"PATCH": "org.organization.change"}

    @extend_schema(
        summary="Get current organization details",
        responses={200: org_serializers.OrganizationSerializer},
        tags=["Organizations"],
    )
    def get(self, request):
        return Response(org_serializers.OrganizationSerializer(_current_org()).data)

    @extend_schema(
        summary="Update current organization profile",
        request=org_serializers.OrganizationSerializer,
        responses={200: org_serializers.OrganizationSerializer},
        tags=["Organizations"],
    )
    def patch(self, request):
        org = _current_org()
        serializer = org_serializers.OrganizationSerializer(org, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        before = {f: getattr(org, f) for f in serializer.validated_data}
        serializer.save()
        audit.record(
            action="org.profile.updated",
            request=request,
            object_type="organization",
            object_id=org.id,
            before=before,
            after=serializer.validated_data,
        )
        return Response(serializer.data)


class BranchListCreateView(MemberReadMixin, APIView):
    """GET (Member) list / POST (Role:admin) create — spec returns a plain
    `{count, results}` envelope, not the paginated one."""

    permission_codes = {"POST": "org.branch.create"}

    @extend_schema(
        summary="List organization branches",
        responses={
            200: inline_serializer(
                "BranchListResponse",
                fields={
                    "count": serializers.IntegerField(),
                    "results": org_serializers.BranchSerializer(many=True),
                },
            )
        },
        tags=["Organizations"],
    )
    def get(self, request):
        branches = Branch.objects.all()
        return Response(
            {
                "count": branches.count(),
                "results": org_serializers.BranchSerializer(branches, many=True).data,
            }
        )

    @extend_schema(
        summary="Create a new branch",
        request=org_serializers.BranchSerializer,
        responses={201: org_serializers.BranchSerializer},
        tags=["Organizations"],
    )
    def post(self, request):
        serializer = org_serializers.BranchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            branch = serializer.save()
        except IntegrityError as exc:
            raise ApiError("validation_error", "A branch with this name already exists.") from exc
        if branch.is_primary:
            Branch.objects.filter(is_primary=True).exclude(pk=branch.pk).update(is_primary=False)
        audit.record(
            action="org.branch.created",
            request=request,
            object_type="branch",
            object_id=branch.id,
            after=org_serializers.BranchSerializer(branch).data,
        )
        return Response(
            org_serializers.BranchSerializer(branch).data,
            status=status.HTTP_201_CREATED,
        )


class BranchDetailView(APIView):
    """PATCH /organizations/current/branches/{id}/ (Role:admin)."""

    permission_code = "org.branch.change"

    def _get(self, pk) -> Branch:
        try:
            return Branch.objects.get(pk=pk)
        except (Branch.DoesNotExist, ValueError) as exc:
            raise NotFoundApiError() from exc

    @extend_schema(
        summary="Update a branch",
        request=org_serializers.BranchSerializer,
        responses={200: org_serializers.BranchSerializer},
        tags=["Organizations"],
    )
    def patch(self, request, pk):
        branch = self._get(pk)
        before = org_serializers.BranchSerializer(branch).data
        serializer = org_serializers.BranchSerializer(branch, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except IntegrityError as exc:
            raise ApiError("validation_error", "A branch with this name already exists.") from exc
        if branch.is_primary:
            Branch.objects.filter(is_primary=True).exclude(pk=branch.pk).update(is_primary=False)
        audit.record(
            action="org.branch.updated",
            request=request,
            object_type="branch",
            object_id=branch.id,
            before=before,
            after=org_serializers.BranchSerializer(branch).data,
        )
        return Response(serializer.data)


class OrganizationSettingsView(MemberReadMixin, APIView):
    """GET (Member) / PATCH (Role:admin) — /organizations/current/settings/."""

    permission_codes = {"PATCH": "org.settings.change"}

    def _settings(self) -> OrganizationSettings:
        return services.get_or_create_settings(_current_org().id)

    @extend_schema(
        summary="Get organization settings",
        responses={200: org_serializers.SettingsSerializer},
        tags=["Organizations"],
    )
    def get(self, request):
        return Response(org_serializers.SettingsSerializer(self._settings()).data)

    @extend_schema(
        summary="Update organization settings",
        request=org_serializers.SettingsSerializer,
        responses={200: org_serializers.SettingsSerializer},
        tags=["Organizations"],
    )
    def patch(self, request):
        settings_obj = self._settings()
        before = org_serializers.SettingsSerializer(settings_obj).data
        serializer = org_serializers.SettingsSerializer(
            settings_obj, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        audit.record(
            action="org.settings.updated",
            request=request,
            object_type="organization_settings",
            object_id=settings_obj.id,
            before=before,
            after=serializer.validated_data,
        )
        return Response(serializer.data)


@extend_schema(
    summary="List organization members",
    responses={200: page(_MEMBERSHIP_ROW_SCHEMA)},
    tags=["Organizations"],
)
class MemberListView(APIView):
    """GET /organizations/current/members/?page=&role= (Role:admin)."""

    permission_code = "users.member.view"
    pagination_class = StandardPagination

    def get(self, request):
        memberships = Membership.objects.select_related("user", "role")
        role = request.query_params.get("role")
        if role:
            memberships = memberships.filter(role__name=role)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(memberships, request)
        return Response(
            paginator.get_paginated_response([org_serializers.membership_row(m) for m in page])
        )


@extend_schema(
    summary="Invite a new member",
    request=org_serializers.InvitationCreateSerializer,
    responses={
        200: _INVITATION_ROW_SCHEMA,
        201: _INVITATION_ROW_SCHEMA,
    },
    tags=["Organizations"],
)
class InvitationListCreateView(APIView):
    """POST /organizations/current/invitations/ (Role:admin)."""

    permission_code = "users.invitation.create"

    def post(self, request):
        serializer = org_serializers.InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        role_name = serializer.validated_data["role"]

        try:
            role = Role.objects.get(name=role_name)
        except Role.DoesNotExist as exc:
            raise ApiError("validation_error", f"Unknown role '{role_name}'.") from exc

        # Already a member? -> 409 (spec §4)
        from django.contrib.auth import get_user_model  # noqa: PLC0415

        User = get_user_model()
        existing_user = User.objects.filter(email=email).first()
        if existing_user and Membership.objects.filter(user=existing_user).exists():
            raise ConflictApiError("already_member", "This person is already a member.")

        # Duplicate pending invitation -> return it as-is (200, idempotent)
        pending = (
            Invitation.objects.filter(email=email, accepted_at__isnull=True)
            .exclude(expires_at__lt=_now())
            .first()
        )
        if pending:
            return Response(
                org_serializers.invitation_row(pending),
                status=status.HTTP_200_OK,
            )

        invitation, raw_token = services.create_invitation(
            email=email,
            role_id=role.id,
            invited_by_id=request.user.id,
            organization_id=context.get_org_id(),
        )
        org = _current_org()
        tasks.send_invitation_email.delay(
            to_email=email,
            org_name=org.name,
            role=role.label or role.name,
            invited_by=request.user.full_name,
        )
        audit.record(
            action="org.invitation.created",
            request=request,
            object_type="invitation",
            object_id=invitation.id,
            after={"email": email, "role": role.name},
        )
        # raw_token is intentionally not returned: acceptance happens by
        # proving mailbox ownership at email verification, not by token.
        _ = raw_token
        return Response(
            org_serializers.invitation_row(invitation),
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    summary="Resend invitation email",
    request=None,
    responses={202: None},
    tags=["Organizations"],
)
class InvitationResendView(APIView):
    """POST /organizations/current/invitations/{id}/resend/ -> 202."""

    permission_code = "users.invitation.create"

    def post(self, request, pk):
        try:
            invitation = Invitation.objects.get(pk=pk, accepted_at__isnull=True)
        except (Invitation.DoesNotExist, ValueError) as exc:
            raise NotFoundApiError() from exc
        from datetime import timedelta  # noqa: PLC0415

        from django.utils import timezone  # noqa: PLC0415

        invitation.token_hash, _ = services.generate_invitation_token()
        invitation.expires_at = timezone.now() + timedelta(days=services.INVITATION_TTL_DAYS)
        invitation.save(update_fields=["token_hash", "expires_at"])
        org = _current_org()
        tasks.send_invitation_email.delay(
            to_email=invitation.email,
            org_name=org.name,
            role=invitation.role.label or invitation.role.name,
            invited_by=request.user.full_name,
        )
        return Response(status=status.HTTP_202_ACCEPTED)


@extend_schema(
    summary="Revoke an invitation",
    responses={204: None},
    tags=["Organizations"],
)
class InvitationDeleteView(APIView):
    """DELETE /organizations/current/invitations/{id}/ -> 204."""

    permission_code = "users.invitation.delete"

    def delete(self, request, pk):
        try:
            invitation = Invitation.objects.get(pk=pk)
        except (Invitation.DoesNotExist, ValueError) as exc:
            raise NotFoundApiError() from exc
        invitation_id = invitation.id
        invitation.delete()
        audit.record(
            action="org.invitation.revoked",
            request=request,
            object_type="invitation",
            object_id=invitation_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


def _now():
    from django.utils import timezone  # noqa: PLC0415

    return timezone.now()


def _owner_count() -> int:
    return Membership.objects.filter(role__name="owner", status=Membership.Status.ACTIVE).count()


class MemberDetailView(APIView):
    """PATCH change role (Role:owner) / DELETE remove (Role:owner)
    — both on /organizations/current/members/{user_id}/ per spec §4."""

    permission_codes = {
        "PATCH": "users.member.change",
        "DELETE": "users.member.delete",
    }

    def _membership(self, user_id) -> Membership:
        try:
            return Membership.objects.get(user_id=user_id)
        except (Membership.DoesNotExist, ValueError) as exc:
            raise NotFoundApiError() from exc

    @extend_schema(
        summary="Update a member's role",
        request=org_serializers.MemberRoleSerializer,
        responses={200: _MEMBERSHIP_ROW_SCHEMA},
        tags=["Organizations"],
    )
    def patch(self, request, user_id):
        membership = self._membership(user_id)
        serializer = org_serializers.MemberRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role_name = serializer.validated_data["role"]
        try:
            new_role = Role.objects.get(name=role_name)
        except Role.DoesNotExist as exc:
            raise ApiError("validation_error", f"Unknown role '{role_name}'.") from exc

        old_role = membership.role.name
        if old_role == "owner" and new_role.name != "owner":
            if _owner_count() <= 1:
                raise ConflictApiError(
                    "last_owner", "An organization must keep at least one owner."
                )
        membership.role = new_role
        membership.save(update_fields=["role"])
        perm_services.invalidate_role_cache(membership.organization_id)
        audit.record(
            action="org.member.role_changed",
            request=request,
            object_type="membership",
            object_id=membership.id,
            before={"role": old_role},
            after={"role": new_role.name},
        )
        return Response(
            org_serializers.membership_row(
                Membership.objects.select_related("user", "role").get(pk=membership.pk)
            )
        )

    @extend_schema(
        summary="Remove a member from the organization",
        responses={204: None},
        tags=["Organizations"],
    )
    def delete(self, request, user_id):
        membership = self._membership(user_id)
        if membership.role.name == "owner" and _owner_count() <= 1:
            raise ConflictApiError("last_owner", "An organization must keep at least one owner.")
        membership_id = membership.id
        removed_email = membership.user.email
        membership.delete()
        audit.record(
            action="org.member.removed",
            request=request,
            object_type="membership",
            object_id=membership_id,
            before={"email": removed_email},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ApiKeyListCreateView(APIView):
    """GET list / POST create — secret returned exactly once on create."""

    permission_codes = {
        "GET": "org.apikey.view",
        "POST": "org.apikey.create",
    }

    @extend_schema(
        summary="List API keys",
        responses={200: obj(results=arr(_API_KEY_ROW_SCHEMA))},
        tags=["Organizations"],
    )
    def get(self, request):
        keys = ApiKey.objects.all()
        return Response({"results": [org_serializers.api_key_row(k) for k in keys]})

    @extend_schema(
        summary="Create an API key",
        request=org_serializers.ApiKeyCreateSerializer,
        responses={201: _API_KEY_CREATE_RESPONSE},
        tags=["Organizations"],
    )
    def post(self, request):
        serializer = org_serializers.ApiKeyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        key, secret = services.issue_api_key(
            name=data["name"],
            scopes=data.get("scopes", []),
            created_by_id=request.user.id,
            organization_id=context.get_org_id(),
            expires_in_days=data.get("expires_in_days"),
        )
        audit.record(
            action="org.apikey.created",
            request=request,
            object_type="api_key",
            object_id=key.id,
            after={"name": key.name, "scopes": key.scopes},
        )
        payload = org_serializers.api_key_row(key)
        payload["secret"] = secret  # shown once, never stored in plaintext
        return Response(payload, status=status.HTTP_201_CREATED)


class ApiKeyRotateView(APIView):
    """POST /organizations/current/api-keys/{id}/rotate/ — new secret once."""

    permission_code = "org.apikey.change"

    @extend_schema(
        summary="Rotate an API key",
        request=None,
        responses={200: _API_KEY_CREATE_RESPONSE},
        tags=["Organizations"],
    )
    def post(self, request, pk):
        try:
            key = ApiKey.objects.get(pk=pk)
        except (ApiKey.DoesNotExist, ValueError) as exc:
            raise NotFoundApiError() from exc
        if key.revoked:
            raise ConflictApiError("invalid_transition", "A revoked key cannot be rotated.")
        secret = services.rotate_api_key(key)
        audit.record(
            action="org.apikey.rotated",
            request=request,
            object_type="api_key",
            object_id=key.id,
        )
        payload = org_serializers.api_key_row(key)
        payload["secret"] = secret
        return Response(payload)


class ApiKeyRevokeView(APIView):
    """DELETE /organizations/current/api-keys/{id}/ -> 204 (revoke)."""

    permission_code = "org.apikey.delete"

    @extend_schema(
        summary="Revoke an API key",
        responses={204: None},
        tags=["Organizations"],
    )
    def delete(self, request, pk):
        from django.utils import timezone  # noqa: PLC0415

        try:
            key = ApiKey.objects.get(pk=pk)
        except (ApiKey.DoesNotExist, ValueError) as exc:
            raise NotFoundApiError() from exc
        if not key.revoked:
            key.revoked_at = timezone.now()
            key.save(update_fields=["revoked_at"])
            audit.record(
                action="org.apikey.revoked",
                request=request,
                object_type="api_key",
                object_id=key.id,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
