"""URL routes: /api/v1/platform/... (Super Admin only)."""

from django.urls import path

from apps.core import platform_views

app_name = "platform"

urlpatterns = [
    path("overview/", platform_views.PlatformOverviewView.as_view(), name="overview"),
    path(
        "organizations/",
        platform_views.PlatformOrganizationsListView.as_view(),
        name="organizations-list",
    ),
    path(
        "organizations/<uuid:pk>/",
        platform_views.PlatformOrganizationDetailView.as_view(),
        name="organization-detail",
    ),
    path("audit-logs/", platform_views.PlatformAuditLogsView.as_view(), name="audit-logs"),
    path("system-health/", platform_views.PlatformSystemHealthView.as_view(), name="system-health"),
]
