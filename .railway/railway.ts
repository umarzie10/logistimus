import {
  bucket,
  defineRailway,
  github,
  group,
  postgres,
  preserve,
  project,
  redis,
  ref,
  service,
} from "railway/iac";

/**
 * Logistimus — Railway infrastructure for the Django backend.
 *
 * Layout mirrors docker-compose.deploy.yml:
 *   api     — ASGI (Uvicorn) HTTP + WebSocket endpoint
 *   worker  — Celery worker
 *   beat    — Celery beat scheduler
 *   postgres / redis — managed data services
 *   media   — Railway Storage Bucket (S3-compatible, replaces MinIO)
 *
 * The Next.js frontend is deployed separately: it bakes NEXT_PUBLIC_API_URL
 * into the bundle at BUILD time, so it must not depend on the backend's
 * runtime domain.
 *
 * Source: the monorepo at github.com/Sardor-Dev-2010/Logistimus with the
 * root directory set to `Backend`, so Railway builds Backend/Dockerfile.
 *
 * Docs: docs/production/RAILWAY_DEPLOYMENT.md
 */

const REPO = "Sardor-Dev-2010/Logistimus";
const BACKEND_ROOT = "Backend";

export default defineRailway(() => {
  const db = postgres("postgres");
  const cache = redis("redis");
  const media = bucket("media", { region: "iad" });

  // Secrets and environment-specific values are set in the Railway dashboard
  // (or via `railway variable set`); `preserve()` keeps whatever Railway
  // already holds instead of overwriting it with a literal from this file.
  const secrets = {
    SECRET_KEY: preserve(),
    ALLOWED_HOSTS: preserve(),
    CORS_ALLOWED_ORIGINS: preserve(),
    FRONTEND_URL: preserve(),
    DEFAULT_FROM_EMAIL: preserve(),
    EMAIL_BACKEND: preserve(),
    EMAIL_HOST: preserve(),
    EMAIL_PORT: preserve(),
    EMAIL_HOST_USER: preserve(),
    EMAIL_HOST_PASSWORD: preserve(),
    // Password for the non-superuser PostgreSQL role created by
    // scripts/railway_bootstrap.sh. Set it with:
    //   railway variable set "APP_DB_PASSWORD=<random>" --service api
    APP_DB_PASSWORD: preserve(),
    // Superuser connection used ONLY to provision the restricted role.
    // asgi_entrypoint.py repoints DATABASE_URL at the restricted role for
    // every request, so tenant isolation is enforced by the database.
    DATABASE_ADMIN_URL: preserve(),
  };

  const commonEnv = {
    DJANGO_ENV: "production",
    DJANGO_SETTINGS_MODULE: "config.settings.prod",
    DEBUG: "False",
    REDIS_URL: cache.env.REDIS_URL,
    CELERY_BROKER_URL: cache.env.REDIS_URL,
    CELERY_RESULT_BACKEND: cache.env.REDIS_URL,
    // Railway Storage Bucket — S3-compatible, replaces the MinIO service.
    S3_ENDPOINT_URL: ref(media, "ENDPOINT"),
    S3_ACCESS_KEY_ID: ref(media, "ACCESS_KEY_ID"),
    S3_SECRET_ACCESS_KEY: ref(media, "SECRET_ACCESS_KEY"),
    S3_BUCKET_NAME: ref(media, "BUCKET"),
    S3_REGION_NAME: ref(media, "REGION"),
    S3_USE_SSL: "True",
  };

  // NOTE: no `source` — the services are deployed from the local directory
  // with `railway up` (the Railway GitHub App is not installed on this
  // private repo, so a github source cannot be authorised). Set the source
  // once the app is installed, then re-add `source: github(...)`.
  const api = service("api", {
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    // Railway runs the start command in exec form (no shell), so `$PORT`
    // would reach uvicorn as a literal string. asgi_entrypoint.py reads
    // PORT from the environment and passes a real int to uvicorn.
    start: "uv run python asgi_entrypoint.py",
    healthcheck: "/api/v1/health/ready/",
    healthcheckTimeout: 180,
    // The one-time database bootstrap (create the non-superuser PostgreSQL
    // role and run migrations AS it, so the FORCE ROW LEVEL SECURITY policies
    // bind to that role) runs inside asgi_entrypoint.py: Railway's V2 runtime
    // does not execute `preDeployCommand`. The step is idempotent.
    env: {
      ...commonEnv,
      DATABASE_URL: db.env.DATABASE_URL,
      // Railway terminates TLS at the edge and forwards plain HTTP internally,
      // so the app must not redirect — the edge already forces HTTPS.
      SECURE_SSL_REDIRECT: "False",
      SPECTACULAR_SETTINGS__SERVE_PERMISSIONS: "AllowAny",
      ...secrets,
    },
  });

  const worker = service("worker", {
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    start: "uv run celery -A config worker -l info --concurrency 2",
    env: {
      ...commonEnv,
      DATABASE_URL: db.env.DATABASE_URL,
      ...secrets,
    },
  });

  const beat = service("beat", {
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    start: "uv run celery -A config beat -l info",
    env: {
      ...commonEnv,
      DATABASE_URL: db.env.DATABASE_URL,
      ...secrets,
    },
  });

  const backend = group("Backend", [api, worker, beat, db, cache, media]);

  return project("logistimus", {
    resources: [backend],
  });
});
