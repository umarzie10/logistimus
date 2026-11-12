# Railway build for the Logistimus backend.
#
# The repository is a monorepo (Backend/ + Frontend/), and `railway up`
# uploads the whole repository as the build context. This Dockerfile
# therefore copies from Backend/ explicitly, mirroring Backend/Dockerfile
# (which is used by docker-compose with Backend/ as its context).
#
# Runtime image: single stage, used by api / worker / beat.

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# uv for reproducible installs (uv.lock is committed)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY Backend/pyproject.toml Backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY Backend/ ./
RUN uv sync --frozen --no-dev

# Static collection for whitenoise, under the real prod settings module.
# prod.py fails closed at import (dev SECRET_KEY sentinel, non-postgres
# DATABASE_URL, empty S3_ENDPOINT_URL), so build-only values are supplied
# for this RUN step ONLY (not ENV — they must never persist into the runtime
# image config): collectstatic never opens a DB/S3 connection, it only reads
# settings. `|| true` is deliberately NOT used — a silent failure would ship
# an image with empty staticfiles/ and 404 CSS in production.
RUN SECRET_KEY=build-time-collectstatic-only-key-not-for-runtime-50chars-plus \
    S3_ENDPOINT_URL=http://minio:9000 \
    DATABASE_URL=postgres://build-only:build-only@localhost:5432/build_only \
    uv run manage.py collectstatic --noinput --settings=config.settings.prod

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000"]
