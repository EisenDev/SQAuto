# Tasks: Industrial Parallel Sync

- [ ] Phase 1: Backend Heartbeat Integration
    - [ ] Update `services/dump_restore/service.py`:
        - [ ] Add `update_progress` helper that flushes Job profile to DB.
        - [ ] Integrate helper into the `while True` file-read loop.
        - [ ] Track compressed vs uncompressed bytes for dual metrics.
- [ ] Phase 2: Frontend Granular Status
    - [ ] Update `apps/web/src/app/page.tsx`:
        - [ ] Show `"X% - Decompressing (X MB / X MB)"` using the new metrics.
- [ ] Phase 3: Deployment & Verification
    - [ ] Perform a test upload.
    - [ ] Verify Supabase `profile` column is populated within seconds of starting.
