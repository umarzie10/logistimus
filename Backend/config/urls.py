"""Root URL configuration — every application endpoint lives under /api/v1/."""

from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from apps.core.errors import handler400, handler403, handler404, handler500

api_v1_patterns = [
    path("health/", include("apps.core.urls")),
    path("platform/", include("apps.core.platform_urls")),
    path("", include("apps.accounts.urls")),
    path("", include("apps.organizations.urls")),
    path("", include("apps.permissions.urls")),
]

urlpatterns = [
    path("api/v1/", include(api_v1_patterns)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# Every non-2xx response uses the shared JSON envelope — including paths that
# never reach a DRF view (unknown URL, permission denied at Django level).
handler400 = handler400
handler403 = handler403
handler404 = handler404
handler500 = handler500
