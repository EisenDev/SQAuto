# Verification Plan for SQAuto Dashboard

- [x] Load http://sqauto.zeraynce.com/ (HTTP only) - **Loaded successfully.**
- [x] Verify 5 cards: TABLES, ROWS, DATA EXTRACTED, DUPLICATE DATA, READINESS - **Confirmed 5 cards exist.**
- [x] Check console for 200 OK hits on /api/jobs and NO Network Error - **FAILED. Console shows ERR_CONNECTION_REFUSED for HTTPS and direct API access shows 502 Bad Gateway via HTTP.**
- [x] Confirm UI polish and responsiveness - **UI looks polished, but functional polling is failing.**

## Observations
1.  **HTTPS Mismatch**: The frontend (Next.js) is still trying to hit `https://sqauto.zeraynce.com/api/upload`.
2.  **API Down**: `http://sqauto.zeraynce.com/api/jobs` returns a **502 Bad Gateway**.
3.  **Visuals**: The 5 cards are present and the layout is clean.
