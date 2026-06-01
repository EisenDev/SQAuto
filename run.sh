#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

REQUESTED_API_PORT="${API_PORT:-}"
REQUESTED_WEB_PORT="${WEB_PORT:-}"
REQUESTED_NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}"

API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"
PYTHON_BIN="$ROOT_DIR/.venv/bin/python"

set -a
source "$ROOT_DIR/.env"
set +a

API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"
API_PORT="${REQUESTED_API_PORT:-$API_PORT}"
WEB_PORT="${REQUESTED_WEB_PORT:-$WEB_PORT}"
SQAUTO_DB_PORT="${SQAUTO_DB_PORT:-55433}"

find_free_port() {
  "$PYTHON_BIN" - "$1" <<'PY'
import socket
import sys

port = int(sys.argv[1])
while True:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("0.0.0.0", port))
        except OSError:
            port += 1
            continue
        print(port)
        break
PY
}

if [ -x "$PYTHON_BIN" ]; then
  API_PORT="$(find_free_port "$API_PORT")"
  WEB_PORT="$(find_free_port "$WEB_PORT")"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to start the local Postgres and Redis services."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose -f "$COMPOSE_FILE")
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose -f "$COMPOSE_FILE")
else
  echo "Docker Compose is required."
  exit 1
fi

echo "[sqauto] Starting local Postgres on localhost:${SQAUTO_DB_PORT} and Redis..."
"${COMPOSE[@]}" up -d db_staging redis

echo "[sqauto] Waiting for Postgres..."
until docker exec sqauto_db_staging pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

echo "[sqauto] Ensuring metadata database exists..."
for attempt in {1..30}; do
  if docker exec sqauto_db_staging psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='sqauto'" 2>/dev/null | grep -q 1; then
    break
  fi

  if docker exec sqauto_db_staging createdb -U postgres sqauto >/dev/null 2>&1; then
    break
  fi

  if [ "$attempt" -eq 30 ]; then
    echo "Could not create or verify the sqauto metadata database."
    exit 1
  fi

  sleep 1
done

if [ ! -x "$PYTHON_BIN" ]; then
  echo "[sqauto] Creating Python virtual environment..."
  python3 -m venv "$ROOT_DIR/.venv"
  API_PORT="$(find_free_port "$API_PORT")"
  WEB_PORT="$(find_free_port "$WEB_PORT")"
fi

echo "[sqauto] Installing Python dependencies..."
"$PYTHON_BIN" -m pip install -r requirements.txt

if [ ! -d "$ROOT_DIR/node_modules" ]; then
  echo "[sqauto] Installing Node dependencies..."
  npm install
fi

mkdir -p "$ROOT_DIR/uploads" "$ROOT_DIR/uploads/temp_chunks" "$ROOT_DIR/uploads/export_artifacts"

if [ -n "$REQUESTED_NEXT_PUBLIC_API_URL" ]; then
  export NEXT_PUBLIC_API_URL="$REQUESTED_NEXT_PUBLIC_API_URL"
else
  export NEXT_PUBLIC_API_URL="http://localhost:${API_PORT}/api"
fi

cleanup() {
  echo
  echo "[sqauto] Stopping dev servers..."
  kill "${API_PID:-}" "${WEB_PID:-}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "[sqauto] Starting API on http://localhost:${API_PORT}"
"$PYTHON_BIN" -m uvicorn apps.api.main:app --reload --host 0.0.0.0 --port "$API_PORT" &
API_PID=$!

echo "[sqauto] Starting web app on http://localhost:${WEB_PORT}"
(cd "$ROOT_DIR/apps/web" && npm run dev -- --port "$WEB_PORT") &
WEB_PID=$!

echo
echo "[sqauto] Running:"
echo "  API: http://localhost:${API_PORT}"
echo "  Web: http://localhost:${WEB_PORT}"
echo "  Health: http://localhost:${API_PORT}/health"
echo
echo "Press Ctrl+C to stop the API and web dev servers."

wait "$API_PID" "$WEB_PID"
