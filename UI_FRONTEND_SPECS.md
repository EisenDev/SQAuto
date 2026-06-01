# UI_FRONTEND_SPECS.md

## Design Philosophy

- **Supabase-Style Workspace**: Clean sidebar, top header for context, and project-based scoping.
- **Micro-Animations**: Subtle transitions during sidebar switching and status updates.
- **Unlocking UX**: Visual state changes (grayscale/opaque → colored/sharp) when SQL upload unlocks specialized tools.
- **Instructional Empty States**: Guided prompts when a user enters a workspace without prerequisite data.

---

## Workspace Layout

### 1. Main Container
- **Side Navigation** (Fixed width, dark mode support).
- **Tool Workspace** (Flexible main area).
- **Top Header** (Breadcrumbs: Org / Project, Active Job Badge).

### 2. Side Navigation Items

#### A. Project
- **Overview**: Stats, activity, latest status.
- **SQL Upload**: Entry point for initializing/updating project data.

#### B. Analysis (Unlock on Extraction)
- **Extraction Pipeline**: Detailed logs, table counts, size metrics.
- **Data Explorer**: Paginated table/row browsing.
- **Schema Visualizer**: Relationship graph (React Flow).
- **Data Quality Check**: Integrity issue groups and fix suggestions.

#### C. Migration Builder (Unlock on Extraction)
- **Mapping Layer**: Column bind editor.
- **SQL Translation**: Heuristic conversion preview.
- **Export Gallery**: Download Clean SQL, Excel, or Dialect SQL.

#### D. Live Database Tools (Optional)
- **Destinations**: Live connection management.
- **Simulation**: Preview dry-runs.
- **Compare & Push**: Reconciliation and direct execution.

---

## Page-Specific Rules

### Organization Page
- Minimal grid list of organizations.
- Search filter for large lists.
- "New Organization" modal.

### Project Page (Org-Scoped)
- Dashboard showing cards for each project.
- Status indicator on card: (No Data / Analyzing / Ready).
- "New Project" creation flow.

### Tool Workspaces
- **Diagnostics**: No export controls allowed here. Moved to Builder.
- **Mapping**: Dynamic sticky table headers for long column lists.
- **Visualizer**: Future Placeholder overlap markers for integrity failures.

---

## Tool Locking States

- Items in **Analysis** and **Migration Builder** are `disabled` (visible but non-interactive) until `job.status === 'completed'`.
- Sidebar labels show a `lock` icon when disabled.
- Clicking a locked item shows a tooltip: "Upload and extract a SQL dump to unlock this tool."

---

## Style Tokens (Supabase-Inspired)

- **Sidebar Background**: `#1c1c1c` (Dark) / `#f8f9fa` (Light).
- **Active Nav Item**: Teal-400 accent boundary.
- **Status Badges**:
  - `Ready`: 🟢 Green
  - `Waiting`: 🟡 Amber
  - `Error`: 🔴 Red
  - `Offline`: ⚪ Grey
- **Breadcrumb separator**: `/` subtle grey.
