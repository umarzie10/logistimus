"""WebSocket routes (mounted at /ws/ by config.asgi)."""

from django.urls import path

from apps.core.consumers import PingConsumer

websocket_urlpatterns = [
    path("ping/", PingConsumer.as_asgi(), name="ws-ping"),
    # Phase 3/6: tracking/, dispatch/, notifications/, orders/
]
