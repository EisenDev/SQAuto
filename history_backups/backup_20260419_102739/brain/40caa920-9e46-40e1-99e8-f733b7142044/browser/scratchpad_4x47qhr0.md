# Task: Verify Dashboard Functionality at sqauto.zeraynce.com

## Checklist
- [/] Navigate to http://sqauto.zeraynce.com/
- [ ] Verify dashboard loads
- [ ] Select the newest active job
- [ ] Verify 'READINESS' card shows 'X% - Decompressing (X MB / X MB)'
- [ ] Confirm MB counts increment over 10 seconds
- [ ] Confirm 'DATA EXTRACTED' card increments
- [ ] Final Report

## Observations
- Dashboard loaded successfully but shows 'STANDBY' status.
- 'READINESS' is 0%.
- Searched for job list/selector at top, bottom, and in 'Advanced Tools' but found none.
- Tried /jobs and it returned 404.
- Console logs are empty.
- Window maximized to ensure no elements are hidden.
- Currently waiting for a job to appear or status to change from STANDBY.
- Observed for several minutes with multiple reloads; no changes yet.
- Poll interval should be 3s according to summary, but UI remains static at 0%.
- No job list or 'Active Jobs' section found anywhere on the page (checked full screenshot beyond viewport).
- Encountered 502 Bad Gateway at /api/jobs, which resolved after a few minutes, suggesting backend recovery/restart.
- Dashboard is back but still shows 'STANDBY' and '0%'.
- No job list or active job selector visible as of yet (checked every section and full screenshot).
- Observed for over 20 minutes with multiple reloads and waits; no status change.
- Concluded that no active job is currently available to select or verify.
