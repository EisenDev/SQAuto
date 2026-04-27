# UI_FRONTEND_SPECS.md

## Design Philosophy
- **Modern**: Use current web standards, responsive layout, and accessible components.
- **Minimalist**: Keep visual noise low; focus on essential information.
- **Clean Spacing**: Generous padding and margin to improve readability.
- **Readable Language**: Plain‑English labels, avoid technical jargon for end users.
- **User‑Friendly Labels**: Buttons and actions clearly describe their purpose.
- **Low Visual Clutter**: Limit the number of controls per view; use progressive disclosure for advanced options.

## Main Layout
1. **Top Header** – Branding, job status badge, global navigation toggle.
2. **Status Area** – Compact indicator of current job state (e.g., *Uploading*, *Profiling*, *Ready*).
3. **Upload Section** – Drag‑and‑drop box with progress bar and file details.
4. **Summary Cards** – Grid of cards showing key metrics (tables, rows, anomalies, readiness score).
5. **Extracted Tables View** – Paginated table list with search/filter and row count.
6. **Schema Visualizer** – Visual graph of tables and relationships (PK/FK).
7. **AI Explanation Panel** – Collapsible panel displaying AI‑generated schema explanations and suggestions.
8. **Export Panel** – Buttons for Excel, Clean SQL, Translated SQL, each with status tooltip.
9. **Migration Control Center** – Target DB connection, dry‑run validation, reconciliation summary, migration logs.
10. **Integrity Issues Panel** – Expandable sections showing duplicate PKs, orphan FKs, missing PKs, and high‐NULL columns.
11. **Schema Mapping Panel** – Editable mapping table (source column → target column) with type match indicators.
12. **Dialect Detection Badge** – Small badge on upload card showing detected SQL dialect (e.g., "🐘 PostgreSQL 92%").
13. **Collapsed Advanced Tools** – Accordion containing optional settings (chunk size, confidence thresholds, custom mappings).

## Main Pages
- **Dashboard** – Home view containing the layout above.
- **Job Details** – Detailed view of a single migration job, with timeline and logs.
- **Table Details** – Focused view for a specific table, showing raw vs cleaned data and AI notes.
- **Export Page** – Final export options and download links.
- **Migration Control Center** – Target database connection management, dry‑run execution, reconciliation results, and migration logs.
- **Integrity Issues Panel** – Data quality scan results with expandable issue sections, sample data, and counts per category.
- **Schema Mapping Panel** – Per-table column mapping editor with source/target columns, type match, and status indicators.
- **Settings Page** – Global configuration (environment variables, API keys) – admin only.

## UX Rules
- One primary action per card (e.g., *Start Extraction* button on the Upload card).
- Advanced options are collapsed by default; expand only when needed.
- Avoid jargon – use terms like *Data Quality* instead of *Anomaly Detection*.
- Statuses are shown with colored badges (green = ready, amber = in‑progress, red = error).
- Warnings appear inline with a subtle background and an exclamation icon.
- Basic responsive support: layout stacks vertically on narrow screens, retains readability on mobile.

## Style Rules
- **Typography**: Use a clean, legible font stack (e.g., `Inter`, fallback `system-ui`).
- **Borders & Shadows**: Soft borders (`1px solid #e2e8f0`) and subtle elevation (`shadow-sm`).
- **Spacing**: 1rem base spacing, consistent across components.
- **Color Palette**: Neutral professional tones – greys, blues, and accent teal for actions.
- **Status Badges**: Small pill‑shaped badges with background colors (`bg‑green‑100`, `bg‑amber‑100`, `bg‑red‑100`).
- **No Noisy Admin Panels**: Keep admin UI simple; hide complex controls behind the Advanced Tools accordion.

## Component Guidance
- **Cards**: Reusable `Card` component with header, body, optional footer.
- **Tables**: `DataTable` component with sortable columns, pagination, and empty‑state message.
- **Filters**: Simple dropdowns or search inputs placed above tables.
- **Upload Box**: Drag‑and‑drop area with fallback file selector; shows file name and size.
- **Status Badges**: `Badge` component accepting `status` prop (`ready`, `in_progress`, `error`).
- **Side Panels / Drawers**: For job logs or detailed AI explanations.
- **Modals**: Confirmation dialogs for destructive actions (e.g., *Delete Job*).
- **Loading States**: Skeleton loaders or spinners centered within cards.
- **Graph Nodes**: Custom React Flow nodes showing Table Name, PKs, and FKs.
- **Empty States**: Friendly illustration with a short call‑to‑action.
- **Error States**: Inline error message with retry button.
- **Integrity Issues**: Expandable `IssueSection` component with icon, count badge, and collapsible content area.
- **Schema Mapping Table**: Sortable mapping rows with editable target column input and type‐match toggle button.
- **Dialect Badge**: Pill‐shaped badge component showing emoji + dialect name + confidence percentage.
