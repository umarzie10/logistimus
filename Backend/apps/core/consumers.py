"""WebSocket consumers.

Base class implements the contract from API_SPECIFICATION §23:
- authenticate with `?token=<access_jwt>` in the connect query string
  (browsers cannot set headers on WebSocket handshakes);
- reject before joining any group (4401/4403 close codes);
- group names derive ONLY from the verified token `org` claim — a tenant
  can never subscribe to another tenant's channel;
- heartbeat ping/pong every 30 s.

`ping` is the Phase 1 connection-health channel; business channels
(tracking, dispatch, notifications, orders) join in Phases 3/6 and reuse
`OrgScopedConsumer.join_org_group()`.
"""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.core import context

User = get_user_model()

CLOSE_UNAUTHENTICATED = 4401
CLOSE_FORBIDDEN = 4403
HEARTBEAT_SECONDS = 30


class OrgScopedConsumer(AsyncJsonWebsocketConsumer):
    """JWT-authenticated consumer bound to the token's organization."""

    permission_code: str | None = None  # optional module.action gate at join

    async def connect(self):
        self.user = None
        self.org_id: UUID | None = None
        self.group_name: str | None = None

        token_str = _query_param(self.scope, "token")
        if not token_str:
            await self.close(code=CLOSE_UNAUTHENTICATED)
            return

        try:
            token = AccessToken(token_str)
            user_id = UUID(str(token.payload["sub"]))
        except (InvalidToken, TokenError, KeyError, ValueError):
            await self.close(code=CLOSE_UNAUTHENTICATED)
            return

        from asgiref.sync import sync_to_async

        user = await sync_to_async(self._load_user)(user_id)
        if user is None:
            await self.close(code=CLOSE_UNAUTHENTICATED)
            return

        org_claim = token.payload.get("org")
        if org_claim:
            try:
                self.org_id = UUID(str(org_claim))
            except ValueError:
                await self.close(code=CLOSE_UNAUTHENTICATED)
                return

        # Bind context for any DB access inside this consumer's coroutine
        context.set_user_id(user.id)
        context.set_org_id(self.org_id)
        context.set_platform_admin(user.is_platform_admin)

        if not await self.authorize():
            await self.close(code=CLOSE_FORBIDDEN)
            return

        await self.accept()
        await self.on_connected()

    # -- hooks for subclasses ------------------------------------------------
    async def authorize(self) -> bool:
        """Return False to reject (4403). Override for role gates."""
        return True

    async def on_connected(self) -> None:
        """Called after accept(); subclasses join groups / send state here."""

    async def join_org_group(self, suffix: str) -> None:
        """Join `org:{id}:{suffix}` — org comes from the verified token."""
        if self.org_id is None:
            await self.close(code=CLOSE_FORBIDDEN)
            return
        self.group_name = f"org:{self.org_id}:{suffix}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)

    async def receive_json(self, content: dict, **kwargs) -> None:
        # Generic consumers accept only control frames; subclasses extend.
        msg_type = content.get("type")
        if msg_type == "ping":
            await self.send_json({"type": "pong", "ts": _now()})
        elif msg_type == "heartbeat":
            await self.send_json({"type": "heartbeat", "ts": _now()})
        else:
            await self.send_json({"error": {"code": "message_not_supported"}})

    async def disconnect(self, code: int) -> None:
        if getattr(self, "group_name", None):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        context.set_org_id(None)
        context.set_user_id(None)

    # -- group broadcast helper (used by Phase 3/6 publishers) --------------
    async def broadcast(self, event: dict) -> None:
        await self.send_json(event)

    def _load_user(self, user_id: UUID):
        try:
            return User.objects.get(pk=user_id, is_active=True)
        except User.DoesNotExist:
            return None


class PingConsumer(OrgScopedConsumer):
    """`/ws/ping/` — authenticated connection health check."""

    async def on_connected(self) -> None:
        await self.send_json(
            {
                "type": "connected",
                "ts": _now(),
                "organization_id": str(self.org_id) if self.org_id else None,
                "heartbeat_seconds": HEARTBEAT_SECONDS,
            }
        )


def _query_param(scope: dict, key: str) -> str | None:
    from urllib.parse import parse_qsl

    query = scope.get("query_string", b"").decode("utf-8", errors="ignore")
    for k, v in parse_qsl(query):
        if k == key:
            return v
    return None


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")
