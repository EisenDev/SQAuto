# ARCHITECTURE.md

# System Architecture

## DESIGN OVERVIEW

SQAuto is a project-based data migration platform. The system is designed to provide isolated staging environments (Sandboxes) within a structured project hierarchy.

The architecture is split into:
1. **Product Hierarchy Layer**: Organizations and Projects.
2. **Data Pipeline Layer**: Upload, Restore, Analyze, Map, Fix.
3. **Execution/Export Layer**: SQL File generation or Live DB pushing.

## HIGH-LEVEL COMPONENTS

### 1. Frontend (`apps/web`)
- **App Shell**: Side navigation and top header breadcrumbs.
- **Organization/Project Management**: CRUD for hierarchies.
- **Tool Workspace**: Scoped views for Analysis, Builder, and Live tools.
- **State Management**: Scoping all views to the active `project_id`.

### 2. Backend API (`apps/api`)
- **Hierarchy API**: `/organizations`, `/projects`.
- **Job Orchestration**: Managing SQL uploads within `project_id`.
- **Service Bridge**: Connecting scoped requests to internal logic.

### 3. Database Layer (PostgreSQL)
Logical split of data:

#### A. System Schema (`public`)
- `organizations`: Meta
- `projects`: Configs, mapping history, destinations.
- `jobs`: Meta, status, file references (Scoped to `project_id`).
- `migration_runs`: Execution history (Scoped to `project_id`).
- `migration_logs`: Audit logs.

#### B. Staging Schema (`staging`)
- Project-scoped sandboxes for raw and cleaned data.

### 4. Shared Services (`services/`)
- **data_intelligence**: Scoped integrity checks.
- **migration_engine**: Target DB handling and execution.
- **smart_fix**: Problem resolution engine.

---

## PROJECT SCOPING & ISOLATION

Strict rules for data isolation:

1. **API Scoping**: Every data-retrieval call must validate the `project_id`.
2. **UI Scoping**: Navigating between projects must clear active job buffers.
3. **Log Separation**: Project A logs must never be visible to Project B.
4. **Tool Locking**: Analysis and Builder tools are locked until a SQL dump is extracted within the active project.

---

## REFACTORED DATA FLOW

### 1. Hierarchy Setup
- Create `Organization`.
- Create `Project` under `Organization`.

### 2. Job Initialization
- Select `Project`.
- Upload SQL dump → `Job` is created with `project_id`.
- Restore to `staging`.

### 3. Scoped Analysis
- Run Diagnostics, visualizer, and quality checks.
- Results are stored and retrieved by `project_id`.

### 4. Workflow Branching
- **Branch A (Primary)**: Use Migration Builder → Mapping/Fixing/Translate → Export Scoped SQL File.
- **Branch B (Secondary)**: Use Live Tools → Destination DB → Simulation → Push to Live.

---

## ARCHITECTURAL RULES

1. **Organization is Parent**: No project can exist without an organization.
2. **Job is Scoped**: All analysis and migration artifacts must link to `project_id`.
3. **Side Nav replaces Tabs**: The UI must reflect a tool-based sidebar rather than a monolithic sequential dashboard.
4. **Locking Logic**: Prevent tool access until prerequisite data (Extraction) is available.
5. **Read-only Source**: The uploaded dump remains the immutable source.
6. **Isolation**: No cross-project data leakage allowed.