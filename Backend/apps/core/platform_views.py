"""Platform Administration Views (/api/v1/platform/...)

Strictly gated behind `IsPlatformAdmin` (User.platform_role == 'platform_admin').
Ordinary tenant owners, admins, and members are completely rejected (403).
"""

from __future__ import annotations

import time

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import ApiError, NotFoundApiError
from apps.core.models import AuditLog, Organization, User
from apps.core.openapi import (
    BOOL,
    DATETIME,
    INT,
    STR,
    extend_schema,
    inline_serializer,
    obj,
    page,
    s,
    serializers,
)
from apps.core.pagination import StandardPagination
from apps.core.permissions import IsPlatformAdmin
from apps.organizations.models import ApiKey, Branch, Membership


class PlatformOverviewView(APIView):
    """Platform-level KPIs & system summary — strictly Super Admin only."""

    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    @extend_schema(
        summary="Platform Overview Metrics",
        description="Returns aggregate real platform metrics across all organizations.",
        responses={
            200: obj(
                organizations=obj(
                    total=INT,
                    active=INT,
                    pending=INT,
                ),
                users=obj(
                    total=INT,
                    verified=INT,
                ),
                infrastructure=obj(
                    total_branches=INT,
                    total_api_keys=INT,
                ),
                system=obj(
                    version=STR,
                    environment=STR,
                    database_ok=BOOL,
                    redis_ok=BOOL,
                ),
            )
        },
        tags=["Platform Admin"],
    )
    def get(self, request):
        db_ok = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            db_ok = False

        redis_ok = True
        try:
            cache.set("_ping", "1", timeout=5)
            redis_ok = cache.get("_ping") == "1"
        except Exception:
            redis_ok = False

        return Response(
            {
                "organizations": {
                    "total": Organization.objects.count(),
                    "active": Organization.objects.filter(is_active=True).count(),
                    "pending": Organization.objects.filter(
                        verification_status=Organization.VerificationStatus.PENDING
                    ).count(),
                },
                "users": {
                    "total": User.objects.count(),
                    "verified": User.objects.filter(email_verified_at__isnull=False).count(),
                },
                "infrastructure": {
                    "total_branches": Branch.unscoped.count(),
                    "total_api_keys": ApiKey.unscoped.count(),
                },
                "system": {
                    "version": getattr(settings, "VERSION", "0.1.0"),
                    "environment": getattr(settings, "DJANGO_ENV", "production"),
                    "database_ok": db_ok,
                    "redis_ok": redis_ok,
                },
            }
        )


class PlatformOrganizationsListView(APIView):
    """Paginated real tenant organizations list — Super Admin only."""

    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    pagination_class = StandardPagination

    @extend_schema(
        summary="List Platform Organizations",
        description="Returns paginated real tenant organizations.",
        responses={
            200: page(
                obj(
                    id=STR,
                    name=STR,
                    slug=STR,
                    legal_name=STR,
                    base_currency=STR,
                    fleet_size_band=STR,
                    verification_status=STR,
                    is_active=BOOL,
                    created_at=DATETIME,
                    members_count=INT,
                    branches_count=INT,
                )
            )
        },
        tags=["Platform Admin"],
    )
    def get(self, request):
        paginator = self.pagination_class()
        orgs = Organization.objects.all().order_by("-created_at")
        page_results = paginator.paginate_queryset(orgs, request)

        return Response(
            paginator.get_paginated_response(
                [
                    {
                        "id": str(o.id),
                        "name": o.name,
                        "slug": o.slug,
                        "legal_name": o.legal_name,
                        "base_currency": o.base_currency,
                        "fleet_size_band": o.fleet_size_band,
                        "verification_status": o.verification_status,
                        "is_active": o.is_active,
                        "created_at": o.created_at,
                        "members_count": Membership.unscoped.filter(organization_id=o.id).count(),
                        "branches_count": Branch.unscoped.filter(organization_id=o.id).count(),
                    }
                    for o in page_results
                ]
            )
        )


class PlatformOrganizationDetailView(APIView):
    """Update organization status / verification — Super Admin only."""

    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    @extend_schema(
        summary="Update Tenant Status",
        description="Updates tenant active status or verification status.",
        request=inline_serializer(
            "PlatformOrgStatusUpdateRequest",
            fields={
                "is_active": serializers.BooleanField(required=False),
                "verification_status": serializers.ChoiceField(
                    choices=Organization.VerificationStatus.choices, required=False
                ),
            },
        ),
        responses={
            200: obj(
                id=STR,
                name=STR,
                is_active=BOOL,
                verification_status=STR,
            )
        },
        tags=["Platform Admin"],
    )
    def patch(self, request, pk):
        try:
            org = Organization.objects.get(pk=pk)
        except (Organization.DoesNotExist, ValueError) as exc:
            raise NotFoundApiError() from exc

        if "is_active" in request.data:
            org.is_active = bool(request.data["is_active"])
        if "verification_status" in request.data:
            status_val = request.data["verification_status"]
            if status_val in Organization.VerificationStatus.values:
                org.verification_status = status_val
            else:
                raise ApiError("validation_error", f"Invalid status '{status_val}'.")

        org.save(update_fields=["is_active", "verification_status", "updated_at"])
        return Response(
            {
                "id": str(org.id),
                "name": org.name,
                "is_active": org.is_active,
                "verification_status": org.verification_status,
            }
        )


class PlatformAuditLogsView(APIView):
    """Global platform audit trail — Super Admin only."""

    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    pagination_class = StandardPagination

    @extend_schema(
        summary="List Global Audit Logs",
        description="Returns system-wide audit logs across platform and all organizations.",
        responses={
            200: page(
                obj(
                    id=STR,
                    organization_id=s(nullable=True),
                    actor_email=s(nullable=True),
                    action=STR,
                    object_type=STR,
                    object_id=STR,
                    created_at=DATETIME,
                    ip=s(nullable=True),
                )
            )
        },
        tags=["Platform Admin"],
    )
    def get(self, request):
        paginator = self.pagination_class()
        logs = AuditLog.unscoped.all().order_by("-created_at")
        page_results = paginator.paginate_queryset(logs, request)

        return Response(
            paginator.get_paginated_response(
                [
                    {
                        "id": str(log_entry.id),
                        "organization_id": (
                            str(log_entry.organization_id) if log_entry.organization_id else None
                        ),
                        "actor_email": log_entry.actor_email,
                        "action": log_entry.action,
                        "object_type": log_entry.object_type,
                        "object_id": log_entry.object_id,
                        "created_at": log_entry.created_at,
                        "ip": log_entry.ip,
                    }
                    for log_entry in page_results
                ]
            )
        )


class PlatformSystemHealthView(APIView):
    """Detailed runtime system health & PostGIS state — Super Admin only."""

    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    @extend_schema(
        summary="Platform System Health",
        description="Returns live database, PostGIS extension, and cache telemetry.",
        responses={
            200: obj(
                database=obj(
                    connected=BOOL,
                    engine=STR,
                    postgis_version=s(nullable=True),
                    latency_ms=INT,
                ),
                cache=obj(
                    connected=BOOL,
                    backend=STR,
                ),
            )
        },
        tags=["Platform Admin"],
    )
    def get(self, request):
        start = time.perf_counter()
        db_ok = True
        postgis_ver = None
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            db_ok = False
        # PostGIS is OPTIONAL. The probe runs in its own try/except so a
        # database without the extension (e.g. Railway's managed Postgres)
        # still reports `connected: true` — only `postgis_version` stays
        # null. Folding it into the connectivity probe made a missing
        # extension look like a dead database.
        if db_ok and connection.vendor == "postgresql":
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT PostGIS_Version();")
                    postgis_ver = cursor.fetchone()[0]
            except Exception:
                postgis_ver = None
        db_latency = int((time.perf_counter() - start) * 1000)

        cache_ok = True
        try:
            cache.set("_health_check", "1", timeout=5)
            cache_ok = cache.get("_health_check") == "1"
        except Exception:
            cache_ok = False

        return Response(
            {
                "database": {
                    "connected": db_ok,
                    "engine": connection.vendor,
                    "postgis_version": postgis_ver,
                    "latency_ms": db_latency,
                },
                "cache": {
                    "connected": cache_ok,
                    "backend": settings.CACHES["default"]["BACKEND"].split(".")[-1],
                },
            }
        )
