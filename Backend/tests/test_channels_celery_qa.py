"""WebSockets (Channels) & Background Tasks (Celery) QA Tests.

Verifies:
1. Channels connection authentication with ?token= query parameter.
2. Rejection of unauthenticated/tampered connections with close code 4401.
3. Message handling: ping/pong, heartbeat, unsupported message types.
4. Celery async task execution (verification, password reset, invitations).
"""

from __future__ import annotations

import pytest
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.core import mail
from django.utils import timezone

from apps.accounts.services import issue_access
from apps.accounts.tasks import send_password_reset_email, send_verification_email
from apps.core.consumers import CLOSE_UNAUTHENTICATED, PingConsumer
from apps.core.models import Organization, User
from apps.organizations.models import Membership
from apps.organizations.tasks import send_invitation_email
from apps.permissions.models import Role


@pytest.fixture()
def ws_auth():
    """Sets up an authenticated user and token for WebSocket tests."""
    org = Organization.objects.create(name="WS Freight", slug="ws-freight")
    user = User.objects.create_user(
        email="ws.user@freight.com",
        password="Password123!",
        email_verified_at=timezone.now(),
    )
    role = Role.objects.create(organization=org, name="owner", is_builtin=True)
    Membership.objects.create(organization=org, user=user, role=role)
    token, _ = issue_access(user, org.id, "owner")
    return {"org": org, "user": user, "token": token}


@pytest.mark.django_db(transaction=True)
class TestWebSocketChannels:
    """Tests Channels ASGI WebSocket consumer lifecycle."""

    def test_connect_without_token_rejected_4401(self):
        communicator = WebsocketCommunicator(PingConsumer.as_asgi(), "/ws/ping/")
        connected, close_code = async_to_sync(communicator.connect)()
        assert connected is False
        assert close_code == CLOSE_UNAUTHENTICATED

    def test_connect_with_invalid_token_rejected_4401(self):
        communicator = WebsocketCommunicator(
            PingConsumer.as_asgi(), "/ws/ping/?token=invalid-bogus-token"
        )
        connected, close_code = async_to_sync(communicator.connect)()
        assert connected is False
        assert close_code == CLOSE_UNAUTHENTICATED

    def test_connect_with_valid_token_accepted(self, ws_auth):
        async def run():
            token = ws_auth["token"]
            communicator = WebsocketCommunicator(PingConsumer.as_asgi(), f"/ws/ping/?token={token}")
            connected, _ = await communicator.connect()
            assert connected is True

            # Receive greeting frame
            response = await communicator.receive_json_from()
            assert response["type"] == "connected"
            assert response["organization_id"] == str(ws_auth["org"].id)
            assert response["heartbeat_seconds"] == 30

            # Test ping -> pong
            await communicator.send_json_to({"type": "ping"})
            pong = await communicator.receive_json_from()
            assert pong["type"] == "pong"
            assert "ts" in pong

            # Test heartbeat -> heartbeat
            await communicator.send_json_to({"type": "heartbeat"})
            hb = await communicator.receive_json_from()
            assert hb["type"] == "heartbeat"
            assert "ts" in hb

            # Test unknown message type
            await communicator.send_json_to({"type": "unknown_message"})
            err = await communicator.receive_json_from()
            assert err["error"]["code"] == "message_not_supported"

            await communicator.disconnect()

        async_to_sync(run)()


@pytest.mark.django_db
class TestCeleryBackgroundTasks:
    """Tests Celery shared tasks execution and email dispatch."""

    def test_send_verification_email_task(self):
        mail.outbox.clear()
        send_verification_email(to_email="test.verify@logistimus.com", code="654321")
        assert len(mail.outbox) == 1
        msg = mail.outbox[0]
        assert msg.to == ["test.verify@logistimus.com"]
        assert "654321" in msg.body
        assert "15 minutes" in msg.body

    def test_send_password_reset_email_task(self):
        mail.outbox.clear()
        send_password_reset_email(to_email="test.reset@logistimus.com", token="secret-reset-token")
        assert len(mail.outbox) == 1
        msg = mail.outbox[0]
        assert msg.to == ["test.reset@logistimus.com"]
        assert "secret-reset-token" in msg.body
        assert "60 minutes" in msg.body

    def test_send_invitation_email_task(self):
        mail.outbox.clear()
        send_invitation_email(
            to_email="colleague@logistimus.com",
            org_name="Central Logistics",
            role="Dispatcher",
            invited_by="Alisher",
        )
        assert len(mail.outbox) == 1
        msg = mail.outbox[0]
        assert msg.to == ["colleague@logistimus.com"]
        assert "Central Logistics" in msg.subject
        assert "Central Logistics" in msg.body
        assert "Dispatcher" in msg.body
        assert "Alisher" in msg.body
