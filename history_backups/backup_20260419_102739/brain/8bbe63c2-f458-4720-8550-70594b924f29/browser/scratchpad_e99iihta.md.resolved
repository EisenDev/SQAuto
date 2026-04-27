# Verification Plan for Data Reconciliation Engine

- [/] Navigate to http://localhost:49100.
- [ ] Upload data sources:
    - [ ] Excel: `/home/eisen/Downloads/Otumisyon/mock_data/input.xlsx`
    - [ ] Legacy SQL: `/home/eisen/Downloads/Otumisyon/mock_data/old_mock.sql`
    - [ ] Current SQL: `/home/eisen/Downloads/Otumisyon/mock_data/new_mock.sql`
- [ ] Click 'Upload Data Sources' and wait for success.
- [ ] Click 'Run Reconciliation Engine'.
- [ ] Verify 'Results & Review' tab:
    - [ ] 300 rows total.
    - [ ] 205 unchecked rows.
    - [ ] 84 Safe Updates.
- [ ] Verify '3. SQL Patch & Export' tab displays SQL.
- [ ] Confirm everything is working.

## Observations
- Typing file paths into `input type="file"` seems to work via `browser_press_key` if the element is focused, but it's finicky.
- The 'Upload Data Sources' button is likely enabled only after files are selected.
- A previous session ID `89f109f8-dd20-4528-aa4a-4e3c20d83cee` was seen in console logs, suggesting a backend state exists.
- Browser seems to have re-initialized (new PageId: `4C4B29F9E3CC6F59B1F6BAF42FC74840`).
