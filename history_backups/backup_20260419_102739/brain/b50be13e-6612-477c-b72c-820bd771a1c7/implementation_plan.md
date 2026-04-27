# Stabilization Plan: Killing the Bad Gateway

The "Bad Gateway" means Nginx is ready, but it can't find the website running on Port 3000. This is usually because **Next.js** is only listening to "localhost" inside its container, making it invisible to the server.

## User Review Required

> [!IMPORTANT]
> **Diagnostic Logs**: I need to see the output of `sudo docker logs sqauto_web` to confirm why it's invisible.

## Proposed Changes

### 1. Web Container Binding Fix
#### [MODIFY] [docker-compose.yml](file:///home/eisen/Downloads/SQAuto/docker/docker-compose.yml)
- Force Next.js to bind to `0.0.0.0` (making it visible outside the container).
- Use the correct `-H` flag for Next.js.
- Add `HOSTNAME: 0.0.0.0` environment variable.

### 2. Nginx Connectivity Check
- Verify that Nginx is trying to talk to the correct IP.

## Open Questions

1. **Current Logs**: Can you run `sudo docker logs sqauto_web` and paste the last 10 lines? This will tell me if the app is crashed or just "shy".
