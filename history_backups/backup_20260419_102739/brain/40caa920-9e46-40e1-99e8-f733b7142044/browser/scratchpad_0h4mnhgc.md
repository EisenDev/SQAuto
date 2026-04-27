# Verification Plan: SQAuto Dashboard Fix

## Checklist:
- [x] Navigate to http://sqauto.zeraynce.com/ (HTTP, no S)
- [x] Verify dashboard loads successfully
- [x] Verify presence of 5 cards: TABLES, ROWS, DATA EXTRACTED, DUPLICATE DATA, READINESS
- [failed] Verify polling works (no 'Network Error' alerts)
- [x] Confirm UI is polished and responsive

## Findings:
- Dashboard loads at http://sqauto.zeraynce.com/.
- All 5 cards (TABLES, ROWS, DATA EXTRACTED, DUPLICATE DATA, READINESS) are present and correctly formatted.
- **Critical Issue**: The frontend is still attempting to reach the backend via **HTTPS** (`https://sqauto.zeraynce.com/api/upload`), which is resulting in `net::ERR_CONNECTION_REFUSED`.
- The 'Network Error' alert was not seen in the UI (no visible modal or toast), but background polling is clearly failing.
- The UI remains in a "STANDBY" / "0%" state because it cannot fetch data from the server.
- The industrial setup is ready on the server side, but the frontend configuration (likely `NEXT_PUBLIC_API_URL`) still points to HTTPS and needs to be updated to match the new HTTP-only setup.
