"""DRF throttle scopes (API_SPECIFICATION §24, SECURITY_PLAN §6).

All scopes are Redis-backed via the default cache (dev: Redis container).
"""

from rest_framework.throttling import AnonRateThrottle as BaseAnonRateThrottle
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle


class UserRateThrottle(UserRateThrottle):
    scope = "user"


class AnonRateThrottle(BaseAnonRateThrottle):
    scope = "anon"


class LoginRateThrottle(ScopedRateThrottle):
    scope = "login"


class PasswordResetRateThrottle(ScopedRateThrottle):
    scope = "password_reset"


class PublicTrackRateThrottle(ScopedRateThrottle):
    scope = "public_track"


class AiChatRateThrottle(ScopedRateThrottle):
    scope = "ai_chat"
