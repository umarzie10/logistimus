"""Shared fixtures for the Logistimus test suite."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient


@pytest.fixture()
def api() -> APIClient:
    return APIClient()


@pytest.fixture()
def org(db):
    from apps.core.models import Organization

    return Organization.objects.create(name="Acme Logistics", slug="acme-logistics")


@pytest.fixture()
def user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        email="ops@acme.uz", password="Sup3rSecret!", first_name="Alisher", last_name="D."
    )
