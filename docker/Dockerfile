# Dockerfile

# ---- Stage 1: Backend (FastAPI) ----
FROM python:3.12-slim AS api
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# ---- Stage 2: Frontend (Next.js) ----
FROM node:20-alpine AS web
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy source
COPY . .

EXPOSE 3000

# ---- Stage 3: Worker (Python) ----
FROM python:3.12-slim AS worker
WORKDIR /app

# Install postgresql-client for large dump restoration
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8001

# Default target (none) – will be overridden in docker-compose
