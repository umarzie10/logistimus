"""Container health probe — hits the readiness endpoint without following redirects.

Why not curl/wget: the python:3.12-slim runtime image ships neither.
Readiness (/health/ready/) pings DB + Redis, so an unhealthy dependency turns
into a non-zero exit and docker marks the container unhealthy.

The probe sends X-Forwarded-Proto: https so Django's SECURE_SSL_REDIRECT
does not answer 3xx — TLS terminates at nginx, not at this probe, and a
tolerated redirect would let the healthcheck pass without exercising the
DB/Redis checks. Any status other than 200 is unhealthy.
"""

from __future__ import annotations

import os
import sys
import urllib.error
import urllib.request

HEALTH_URL = os.environ.get("HEALTHCHECK_URL", "http://localhost:8000/api/v1/health/ready/")
TIMEOUT = float(os.environ.get("HEALTHCHECK_TIMEOUT", "3"))


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        return None


def main() -> int:
    opener = urllib.request.build_opener(_NoRedirect)
    # Tell Django the request already arrived over HTTPS (nginx terminates
    # TLS outside the container): without this, SECURE_SSL_REDIRECT answers
    # 3xx and the probe would pass without ever exercising DB/Redis checks.
    # nosec/noqa: S310 — URL comes from HEALTHCHECK_URL env (http/https only,
    # never file:/custom schemes); this is a health probe, not user input.
    request = urllib.request.Request(HEALTH_URL, headers={"X-Forwarded-Proto": "https"})  # noqa: S310
    try:
        status = opener.open(request, timeout=TIMEOUT).status
    except urllib.error.HTTPError as exc:
        status = exc.code
    except Exception as exc:  # noqa: BLE001 — any transport error = unhealthy
        print(f"unhealthy: {exc.__class__.__name__}", file=sys.stderr)
        return 1
    if status == 200:
        return 0
    print(f"unhealthy: HTTP {status}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
