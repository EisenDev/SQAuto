# Implementation Plan - Fixing Backend Startup & Clean UI

The "Failed to fetch" error is being caused by a **Backend Crash** during startup. The logs show that the API is failing to connect to PostgreSQL, which prevents it from finishing its initialization.

## User Review Required

> [!IMPORTANT]
> **PostgreSQL Status**: Please ensure that your PostgreSQL service is running on Port 5432 and that a database named `sqauto` exists.
> **Database Fallback**: I propose adding logic to handle database connection failures gracefully. If the DB is unreachable, the server will now start in a "limited mode" and report the error through the `/health` endpoint instead of crashing.

## Proposed Changes

### Backend (FastAPI)

#### [MODIFY] [main.py](file:///home/eisen/Downloads/SQAuto/apps/api/main.py)
- Wrap the `startup_event` logic in a try-except block.
- If the database connection fails, log a clear warning but allow the server to continue running (this prevents the "Failed to fetch" error by allowing the preflight requests to at least be handled, though actual DB calls will still fail until Postgres is up).

#### [MODIFY] [database.py](file:///home/eisen/Downloads/SQAuto/apps/api/database.py)
- Update the engine configuration to be more resilient (e.g., shorter connection timeouts for faster error reporting).

---

### Frontend (Next.js)

#### [MODIFY] [next.config.js](file:///home/eisen/Downloads/SQAuto/apps/web/next.config.js)
- Remove the deprecated `experimental.appDir` key to clean up the console output.

#### [MODIFY] [UploadCard.tsx](file:///home/eisen/Downloads/SQAuto/apps/web/src/components/UploadCard.tsx)
- Improve the error message when a "Failed to fetch" occurs to suggest checking the backend status explicitly.

## Open Questions

> [!NOTE]
> Would you like me to add an automatic fallback to an **SQLite** database if PostgreSQL is unavailable? This would allow you to use the dashboard logic for testing without needing a local Postgres install.

## Verification Plan

### Automated Tests
- I will run the backend locally and verify that it no longer crashes even if the DB is disconnected.
- I will check the `/api/health` endpoint to ensure it reports the correct DB status.

### Manual Verification
- Verify that the terminal logs no longer show the SQLAlchemy Traceback on startup.
- Verify that the browser console shows a clear error message instead of a generic "Failed to fetch" if the DB remains unreachable.
