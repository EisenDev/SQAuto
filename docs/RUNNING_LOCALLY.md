# Running Locally

This guide explains how to run SQAuto on Windows and Linux for local development.

## What Starts Locally

`./run.sh` starts:
- PostgreSQL staging and metadata databases in Docker
- Redis in Docker
- FastAPI backend on `http://localhost:8000`
- Next.js frontend on `http://localhost:3000`

The uploaded SQL dump remains the source of truth. Local services are for sandboxed development only.

## Requirements

- Python 3.12+
- Node.js 20+ recommended
- npm
- Docker with Docker Compose
- Bash shell

## Quick Start

From the repository root:

```bash
./run.sh
```

If everything starts correctly:

```text
API: http://localhost:8000
Web: http://localhost:3000
Health: http://localhost:8000/health
```

Stop the app with `Ctrl+C`.

## Environment File

`.env` is optional for local development. If it is missing, `./run.sh` uses local defaults:

```text
METADATA_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:55433/sqauto
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:55433/sqauto
STAGING_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:55433/staging_db
REDIS_URL=redis://localhost:6379/0
API_PORT=8000
WEB_PORT=3000
SQAUTO_DB_PORT=55433
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

To customize settings:

```bash
cp .env.example .env
```

Then edit `.env`.

You can also override ports for one run:

```bash
API_PORT=8010 WEB_PORT=3010 SQAUTO_DB_PORT=55434 ./run.sh
```

## Windows

Recommended setup is Windows Subsystem for Linux, using Docker Desktop for the containers.

1. Install WSL 2 and a Linux distro, such as Ubuntu.
2. Install Docker Desktop for Windows.
3. In Docker Desktop, enable WSL integration for your distro:
   - Open Docker Desktop
   - Go to Settings
   - Open Resources
   - Open WSL Integration
   - Enable integration for your Linux distro
4. Open the WSL terminal.
5. Go to the repo:

```bash
cd /mnt/c/sqauto/SQAuto
./run.sh
```

If Docker is not available inside WSL, you may see:

```text
The command 'docker' could not be found in this WSL 2 distro.
```

Fix that by enabling Docker Desktop WSL integration for the distro you are using, then open a new WSL terminal and try again.

## Linux

Install Docker Engine, Docker Compose, Python, Node.js, and npm using your distro package manager or your preferred version manager.

On Ubuntu-like systems:

```bash
python3 --version
node --version
npm --version
docker --version
docker compose version
```

Then run:

```bash
cd /path/to/SQAuto
./run.sh
```

If your user cannot access Docker, add your user to the Docker group and open a new terminal session:

```bash
sudo usermod -aG docker "$USER"
```

## Manual Mode

Use this only when you already have PostgreSQL and Redis running outside `./run.sh`.

```bash
npm run install:all
npm run dev:api
npm run dev:web
```

Make sure `.env` points to the services you want to use. Keep staging work isolated from production databases.

## Troubleshooting

### Missing `.env`

This is allowed for local development. `./run.sh` will use local defaults.

### Docker Not Found in WSL

Enable Docker Desktop WSL integration for your distro, then restart the WSL terminal.

### Port Already in Use

`./run.sh` tries to find free API and web ports when the Python virtual environment exists. You can also choose ports manually:

```bash
API_PORT=8010 WEB_PORT=3010 ./run.sh
```

### Database Port Conflict

Choose a different exposed Postgres port:

```bash
SQAUTO_DB_PORT=55434 ./run.sh
```

If you use `.env`, update `METADATA_DATABASE_URL`, `DATABASE_URL`, and `STAGING_DATABASE_URL` to use the same port.

### Production or Supabase Metadata Database

For Supabase metadata, update `.env` with the Supabase pooler URL:

```text
METADATA_DATABASE_URL=postgresql+psycopg://postgres.[PROJECT_ID]:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_URL=postgresql+psycopg://postgres.[PROJECT_ID]:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
```

Keep `STAGING_DATABASE_URL` pointed at a staging database. Do not point staging workflows at production data.
