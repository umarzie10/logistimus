"""URL routes: /api/v1/roles/, /api/v1/permissions/, /auth/me/permissions/."""

from django.urls import path

from apps.permissions import views

app_name = "permissions"

urlpatterns = [
    path("roles/", views.RoleListCreateView.as_view(), name="role-list"),
    path("roles/<uuid:pk>/", views.RoleDetailView.as_view(), name="role-detail"),
    path("permissions/", views.PermissionCatalogView.as_view(), name="permission-catalog"),
    path("auth/me/permissions/", views.MePermissionsView.as_view(), name="me-permissions"),
]
