# Implementation Plan - Industrial Parallel Sync

This plan eliminates the "blind spot" during massive SQL restores by integrating real-time progress heartbeats directly into the high-speed data piping loop.

## User Review Required

> [!IMPORTANT]
> **Parallel Visibility**: I will move the dashboard update logic so it runs **every 10MB** of data processed, rather than waiting for the entire file to stream. This ensures you see the numbers move immediately after starting.
> 
> **Metadata Precision**: I will fix the percentage calculation by tracking the exact bytes read from the compressed file on disk.

## Proposed Changes

### 1. Backend - Parallel Heartbeat

#### [MODIFY] [service.py](file:///home/eisen/Downloads/SQAuto/services/dump_restore/service.py)
- Integrate a `flush_progress` helper function inside the `while True` data-piping loop.
- Update `job.profile` metadata every 20-50MB of data processed.
- Track `disk_bytes_read` vs `db_bytes_written` to provide an accurate "Uncompressed" estimate.

### 2. Frontend - Dual Status Labels

#### [MODIFY] [page.tsx](file:///home/eisen/Downloads/SQAuto/apps/web/src/app/page.tsx)
- Update the `Readiness` card to show more granular status:
    - `"X% - Decompressing (X MB / X MB)"`
- Ensure the card updates fluidly even if the table count hasn't incremented yet (during the early schema setup phase).

## Open Questions

- **Buffer Size**: I'm currently using 10MB chunks. For a 1.8GB file, this is fine. I'll maintain this for optimal performance.

## Verification Plan

### Automated Tests
- Upload a 100MB sample and verify `db_session.commit()` happens multiple times during the streaming phase.
- Verify Supabase UI shows `profile` JSON data within 10 seconds of starting.

### Manual Verification
- I will perform a 1.8GB test and provide a recording showing the "DATA EXTRACTED" card moving from 0MB to 1.8GB in real-time as the file is read.
