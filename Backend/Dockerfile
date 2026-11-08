# Logistimus backend image — single stage for api/worker/beat.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# uv for reproducible installs (uv.lock is committed)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . .
RUN uv sync --frozen --no-dev

# static collection for whitenoise (runs at build when possible; fallback at boot)
RUN uv run manage.py collectstatic --noinput --settings=config.settings.prod || true

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000"]
