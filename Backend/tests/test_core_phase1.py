"""Phase 1: health endpoints, error envelope, pagination, request context."""
from __future__ import annotations

import pytest


@pytest.mark.django_db
class TestHealth:
    def test_health_is_public_and_ok(self, api):
        resp = api.get("/api/v1/health/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert "version" in body and "time" in body
        # liveness must not depend on DB/redis
        assert "dependencies" not in body

    def test_health_returns_request_id_header(self, api):
        resp = api.get("/api/v1/health/")
        assert "X-Request-Id" in resp
        assert len(resp["X-Request-Id"]) >= 16

    def test_health_echoes_client_request_id(self, api):
        resp = api.get("/api/v1/health/", HTTP_X_REQUEST_ID="corr-123")
        assert resp["X-Request-Id"] == "corr-123"

    def test_readiness_ok(self, api):
        resp = api.get("/api/v1/health/ready/")
        # SQLite + locmem cache are reachable in tests
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ready"
        assert body["dependencies"] == {"database": "ok", "redis": "ok"}


@pytest.mark.django_db
class TestErrorEnvelope:
    def test_404_uses_envelope(self, api):
        resp = api.get("/api/v1/does-not-exist/")
        assert resp.status_code == 404
        body = resp.json()
        assert set(body) == {"error"}
        assert body["error"]["code"] in ("not_found", "invalid_credentials")
        assert isinstance(body["error"]["message"], str)
        assert body["error"]["request_id"] == resp["X-Request-Id"]

    def test_error_payload_shape_from_helper(self):
        from apps.core.exceptions import error_payload

        payload = error_payload("invalid_transition", "Nope", {"allowed_from": ["draft"]})
        assert payload["error"]["code"] == "invalid_transition"
        assert payload["error"]["details"] == {"allowed_from": ["draft"]}
        assert "request_id" in payload["error"]

    def test_unregistered_code_rejected(self):
        from apps.core.exceptions import ApiError

        with pytest.raises(ValueError):
            ApiError(code="made_up_code")

    @pytest.mark.django_db
    def test_debug_html_404_normalized_to_envelope(self, api, settings):
        """DEBUG=True serves Django's HTML debug page — the contract still
        wins for API clients (ApiErrorEnvelopeMiddleware)."""
        settings.DEBUG = True
        resp = api.get(
            "/api/v1/does-not-exist/",
            HTTP_ACCEPT="application/json",
        )
        assert resp.status_code == 404
        assert "application/json" in resp["Content-Type"]
        body = resp.json()
        assert body["error"]["code"] == "not_found"

    @pytest.mark.django_db
    def test_browser_navigation_keeps_debug_page(self, api, settings):
        """A human navigating in a browser keeps the HTML debug page."""
        settings.DEBUG = True
        resp = api.get(
            "/api/v1/does-not-exist/",
            HTTP_ACCEPT="text/html,application/xhtml+xml",
        )
        assert resp.status_code == 404
        assert "text/html" in resp["Content-Type"]


@pytest.mark.django_db
class TestPaginationContract:
    def test_envelope_keys(self, api, org):
        from apps.core.models import AuditLog

        for i in range(25):
            AuditLog.objects.create(
                organization=org, action="test.event", object_id=str(i)
            )

        # exercise StandardPagination directly (unscoped: envelope contract,
        # tenant scoping is covered by TestTenantContextLifecycle)
        from django.test import RequestFactory
        from rest_framework.request import Request

        from apps.core.pagination import StandardPagination

        factory = RequestFactory()
        django_req = factory.get("/x/?page=2&page_size=10")
        req = Request(django_req)
        paginator = StandardPagination()
        paginator.paginate_queryset(AuditLog.unscoped.all().order_by("-created_at"), req)
        data = paginator.get_paginated_response([])
        assert set(data) == {"count", "page", "page_size", "pages", "results"}
        assert data["count"] == 25
        assert data["page"] == 2
        assert data["page_size"] == 10
        assert data["pages"] == 3

    def test_max_page_size_capped(self):
        from django.test import RequestFactory
        from rest_framework.request import Request

        from apps.core.pagination import StandardPagination

        factory = RequestFactory()
        req = Request(factory.get("/x/?page_size=5000"))
        paginator = StandardPagination()
        assert paginator.get_page_size(req) == 100


@pytest.mark.django_db
class TestTenantContextLifecycle:
    def test_context_cleared_after_request(self, api):
        from apps.core import context

        assert context.get_org_id() is None
        api.get("/api/v1/health/")
        assert context.get_org_id() is None
        assert context.get_user_id() is None
        assert context.get_request_id() is None

    def test_tenant_manager_scopes_queryset(self, db, org, user):
        from apps.core import context
        from apps.core.models import AuditLog

        other = AuditLog.objects.create(action="a", organization_id=None)
        # unscoped create needs explicit org when context absent
        mine = AuditLog.objects.create(organization=org, action="b")

        token = context.set_org_id(org.id)
        try:
            ids = {str(a.id) for a in AuditLog.objects.all()}
        finally:
            context.reset(token, context._current_org_id)

        assert str(mine.id) in ids
        assert str(other.id) not in ids  # NULL org hidden from tenant scope

    def test_context_org_filter_independent_of_input(self, db, org):
        """A tenant query can never see rows of another org."""
        from apps.core import context
        from apps.core.models import AuditLog

        org2 = type(org).objects.create(name="Other", slug="other-co")
        row = AuditLog.objects.create(organization=org2, action="secret")

        token = context.set_org_id(org.id)
        try:
            assert not AuditLog.objects.filter(pk=row.pk).exists()
        finally:
            context.reset(token, context._current_org_id)
