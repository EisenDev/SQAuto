# SQAuto Deployment & Bug Fixes

I have implemented the fixes for the "502 Bad Gateway" error, the React component crash, and the missing Supabase tables.

## Changes Overview

### 1. Fixes for 502 Bad Gateway
The 502 was caused by the backend failing to find Redis and incorrect Docker networking.
- **Added Redis**: A new Redis service is now included in `docker-compose.yml`.
- **Fixed Internal Networking**: API and Worker services now correctly talk to `redis:6379` instead of `localhost`.
- **Improved Nginx Proxying**: Updated `scripts/setup_nginx.sh` with headers required for Cloudflare compatibility.

### 2. Database Initialization
Created a new script to safely initialize your Supabase tables.
- **`scripts/init_db.py`**: Running this on your server will create all necessary tables in Supabase instantly.

### 3. Frontend & Environment Fixes
- **ExportPanel Bug**: Fixed the React prop mismatch that caused the local build to fail.
- **Production URL**: Updated `.env` to point to `https://sqauto.zeraynce.com/api`.

---

## Final Step: Run these on your Server

Since you've pushed to GitHub, follow these exact steps on your SSH terminal:

1.  **Pull latest changes**:
    ```bash
    git pull origin main
    ```

2.  **Initialize Supabase (IMPORTANT)**:
    This creates your database tables.
    ```bash
    # Make sure you are in the SQAuto root
    python3 scripts/init_db.py
    ```

3.  **Update Nginx**:
    ```bash
    bash scripts/setup_nginx.sh
    ```

4.  **Restart with Docker Compose**:
    Note: Use the space `docker compose` or the hyphen version depending on what you have installed.
    ```bash
    docker compose -f docker/docker-compose.yml down
    docker compose -f docker/docker-compose.yml up -d --build
    ```

> [!TIP]
> After running `docker compose up`, wait about 30 seconds for the containers to fully initialize before checking the website.

> [!IMPORTANT]
> Ensure you have run **Certbot** for SSL: `sudo certbot --nginx -d sqauto.zeraynce.com`.
