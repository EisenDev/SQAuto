# Direct Server Fix: Resolving Build Issues

The "Bad Gateway" persists because the `docker-web` container failed to build/start due to system memory constraints. The server has 8GB of RAM with no swap space, which is insufficient for a full `npm ci` build cycle while other services are running.

## Proposed Actions on Server

### 1. Free Up Memory
I will stop all running containers temporarily to maximize available RAM for the build process.
- **Command**: `sudo docker compose -f SQAuto/docker/docker-compose.yml down`

### 2. Enable Swap Space
I will add a 2GB swap file to the server. This prevents the `npm` build process from hanging or crashing the system when it hits RAM limits.
- **Commands**:
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  ```

### 3. Rebuild and Start Services
I will run the build again. With 2GB of swap and the fixed `Dockerfile` and `docker-compose.yml`, the build should now complete successfully.
- **Command**: `sudo docker compose -f SQAuto/docker/docker-compose.yml up -d --build`

### 4. Initialize Database
Once the services are up, I will run the initialization script inside the container.
- **Command**: `sudo docker exec sqauto_api python3 scripts/init_db.py`

## User Review Required

> [!IMPORTANT]
> **Swap Creation**: Adding swap is a standard procedure for small VMs (like Azure/AWS burstable instances) to handle build spikes. It will not delete any of your data.

> [!WARNING]
> **Temporary Downtime**: During the build (approx 5-10 mins), the site will be completely down until the containers restart.

## Verification Plan
1. **Check Containers**: Run `sudo docker ps` to ensure both `api` and `web` are `Up`.
2. **Check Logs**: Run `sudo docker logs sqauto_web` to confirm the Next.js dev server is listening.
3. **Verify Site**: Confirm `https://sqauto.zeraynce.com` loads.
