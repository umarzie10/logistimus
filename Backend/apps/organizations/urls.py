"""URL routes: /api/v1/organizations/... (API_SPECIFICATION §4)."""

from django.urls import path

from apps.organizations import views

app_name = "organizations"

urlpatterns = [
    path("organizations/mine/", views.MyOrganizationsView.as_view(), name="org-mine"),
    path("organizations/current/", views.CurrentOrganizationView.as_view(), name="org-current"),
    path(
        "organizations/current/branches/",
        views.BranchListCreateView.as_view(),
        name="branch-list",
    ),
    path(
        "organizations/current/branches/<uuid:pk>/",
        views.BranchDetailView.as_view(),
        name="branch-detail",
    ),
    path(
        "organizations/current/settings/",
        views.OrganizationSettingsView.as_view(),
        name="org-settings",
    ),
    path(
        "organizations/current/members/",
        views.MemberListView.as_view(),
        name="member-list",
    ),
    path(
        "organizations/current/invitations/",
        views.InvitationListCreateView.as_view(),
        name="invitation-list",
    ),
    path(
        "organizations/current/invitations/<uuid:pk>/resend/",
        views.InvitationResendView.as_view(),
        name="invitation-resend",
    ),
    path(
        "organizations/current/invitations/<uuid:pk>/",
        views.InvitationDeleteView.as_view(),
        name="invitation-delete",
    ),
    path(
        "organizations/current/members/<uuid:user_id>/",
        views.MemberDetailView.as_view(),
        name="member-detail",
    ),
    path(
        "organizations/current/api-keys/",
        views.ApiKeyListCreateView.as_view(),
        name="apikey-list",
    ),
    path(
        "organizations/current/api-keys/<uuid:pk>/rotate/",
        views.ApiKeyRotateView.as_view(),
        name="apikey-rotate",
    ),
    path(
        "organizations/current/api-keys/<uuid:pk>/",
        views.ApiKeyRevokeView.as_view(),
        name="apikey-revoke",
    ),
]
