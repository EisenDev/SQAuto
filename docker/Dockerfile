# docker/Dockerfile

# --- Stage 1: Base Python ---
FROM python:3.12-slim AS python-base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    mariadb-client \
    pgloader \
    curl \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Stage 2: API ---
FROM python-base AS api
COPY . .
EXPOSE 8000
CMD ["gunicorn", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "apps.api.main:app", "--bind", "0.0.0.0:8000", "--timeout", "18000"]


# --- Stage 4: Web Builder ---
FROM node:20-alpine AS web-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci
COPY . .
# Next.js standalone build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN cd apps/web && npm run build

# --- Stage 5: Web Production ---
FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV production
# Copy necessary files for standalone output
COPY --from=web-builder /app/apps/web/.next/standalone ./
COPY --from=web-builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
