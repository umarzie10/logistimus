"""core URL routes — mounted under /api/v1/health/ by config.urls."""
from django.urls import path

from apps.core import health

app_name = "core"

urlpatterns = [
    path("", health.HealthView.as_view(), name="health"),
    path("ready/", health.ReadinessView.as_view(), name="health-ready"),
]
