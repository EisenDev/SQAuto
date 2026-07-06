# docker/Dockerfile
# ============================================================
# Stage 1: Python base — shared by API + Celery worker
# ============================================================
FROM python:3.12-slim AS python-base

WORKDIR /app

# System deps (psycopg binary needs libpq, pgloader for migrations)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    postgresql-client \
    mariadb-client \
    pgloader \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source (all Python packages)
COPY apps/ ./apps/
COPY services/ ./services/
COPY configs/ ./configs/

# ============================================================
# Stage 2: API — FastAPI via Gunicorn/Uvicorn workers
# ============================================================
FROM python-base AS api

EXPOSE 8000

# API startup is slow on small VMs (imports heavy ML libs, runs DB migrations)
# start-period must exceed actual boot time before failures count
HEALTHCHECK --interval=15s --timeout=10s --start-period=180s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["gunicorn", \
     "-w", "1", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "apps.api.main:app", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "18000", \
     "--graceful-timeout", "30", \
     "--keep-alive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]

# ============================================================
# Stage 3: Celery Worker — background task processing
# ============================================================
FROM python-base AS worker

# TODO: create apps/api/celery_app.py when Celery tasks are added.
# For now keep the container alive as a no-op placeholder.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import sys; sys.exit(0)"

CMD ["python", "-u", "-c", \
     "import time; print('Celery worker placeholder — create apps/api/celery_app.py to enable'); exec('while True: time.sleep(3600)')"]


# ============================================================
# Stage 4: Web builder — Next.js standalone build
# ============================================================
FROM node:20-alpine AS web-builder

WORKDIR /app

# Install root workspace deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci --prefer-offline

# Copy full source for build
COPY apps/web/ ./apps/web/

# Build-time env — injected from CI secret
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN cd apps/web && npm run build

# ============================================================
# Stage 5: Web production — minimal Next.js standalone image
# ============================================================
FROM node:20-alpine AS web

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=256"

# Copy standalone server
COPY --from=web-builder /app/apps/web/.next/standalone ./

# Copy static assets (CSS, JS chunks, images)
COPY --from=web-builder /app/apps/web/.next/static ./apps/web/.next/static

# Copy public directory (icons, favicons, etc.)
COPY --from=web-builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
    CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
