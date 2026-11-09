"""URL routes: /api/v1/auth/... (API_SPECIFICATION §3)."""

from django.urls import path

from apps.accounts import views

app_name = "accounts"

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path(
        "auth/verify-email/",
        views.VerifyEmailView.as_view(),
        name="verify-email",
    ),
    path(
        "auth/resend-verification/",
        views.ResendVerificationView.as_view(),
        name="resend-verification",
    ),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/refresh/", views.RefreshView.as_view(), name="refresh"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/session/", views.SessionView.as_view(), name="session"),
    path(
        "auth/switch-organization/",
        views.SwitchOrganizationView.as_view(),
        name="switch-organization",
    ),
    path(
        "auth/forgot-password/",
        views.ForgotPasswordView.as_view(),
        name="forgot-password",
    ),
    path(
        "auth/reset-password/",
        views.ResetPasswordView.as_view(),
        name="reset-password",
    ),
    path(
        "auth/change-password/",
        views.ChangePasswordView.as_view(),
        name="change-password",
    ),
    path(
        "auth/login-history/",
        views.LoginHistoryView.as_view(),
        name="login-history",
    ),
]
