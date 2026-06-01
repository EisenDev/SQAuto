# DOCS.md

# SQL Dump Data Migration Platform Documentation

## PROJECT OVERVIEW

SQAuto is a project-based data migration platform designed to securely manage the transition of legacy database structures into modern systems. 

For local Windows and Linux setup, see [Running Locally](./RUNNING_LOCALLY.md).

The platform follows a **Supabase-style project workspace** structure:
- **Organization**: Top-level grouping (e.g., "Agency A", "Company B").
- **Project**: Individual migration targets (e.g., "Legacy CRM Migration", "Inventory Overhaul").
- **Project Workspace**: A dedicated environment with side-navigation tools scoped to the project's active SQL dump.

## PRODUCT HIERARCHY

1. **Organization Page**: 
   - Manage multiple organizations.
   - List available entities.
2. **Project Page**: 
   - View projects within an organization.
   - Create new projects.
   - See latest job status and creation dates.
3. **Project Workspace**:
   - Sidebar navigation providing access to Analysis, Migration Builder, and Live Database tools.
   - Centered around an active **SQL Dump Job**.

---

## CORE MODULES

### 1. Project Management
Responsible for:
- Scoping data isolation.
- Managing user access within organizations.
- Maintaining project-specific settings and destinations.

### 2. Dump Restore Module (Sandbox)
Responsible for:
- Restoring SQL dumps safely into project-scoped sandboxes.
- Handling large dumps with progressive loading.
- Creating isolated staging environments.

### 3. Schema Profiler & Analysis
Responsible for:
- Table/Column detection and integrity checking.
- Mapping relationship graphs.
- Scoring data quality (duplicates, orphans, NULL density).

### 4. Migration Builder
Responsible for:
- **Mapping**: Source to Target column binds.
- **Smart Fixes**: Proposing and applying structural repairs.
- **Export**: Generating new Clean/Translated SQL files (Primary workflow).

### 5. Live Database Tools (Optional)
Responsible for:
- Direct database pushing (PostgreSQL).
- Real-time comparison (Reconciliation).
- Simulation and Execution logs.

---

## ROADMAP

### Phase 1–3: Foundation (Complete ✓)
- Migration Execution foundation.
- Data Intelligence Layer (Integrity checks, Mapping).
- Controlled Execution (Preview/Commit).

### Phase 3.2: Product Architecture Refactor (Current)
Transform from a single-page dashboard to a project-scoped application:
- **Project Scoping**: All logs/runs/jobs belong to a `project_id`.
- **Side Navigation**: Replace 1–4 tabs with a structured sidebar.
- **Organization/Project hierarchy**: Unified landing pages.
- **UI Decoupling**: Move Export out of Diagnostics into the Migration Builder.

### Phase 4: Smart Fix & Mapping Assistance
- AI-driven column binding.
- Detailed fix previews and pre-execution repair pipeline.

### Phase 5+: Advanced Translation & Analytics
- Multi-dialect SQL translation studio.
- Comprehensive migration risk dashboards.

---

## UI STRUCTURE

### Sidebar (Project Workspace)

A. **Project** 
- Overview
- SQL Upload (Project Entrance)

B. **Analysis**
- Extraction Diagnostics (Stats, logs, AI insights)
- Source of Truth Explorer (Table/Row data)
- Schema Visualizer (Graph)
- Data Quality Check (Integrity issues)

C. **Migration Builder**
- Schema Mapping
- Smart Fix Suggestions
- SQL Translation
- Export SQL File (Primary Export)

D. **Live Database Tools (Optional)**
- Live Destination Database Connection
- Live Database Simulation
- Source vs Target Reconciliation
- Push to Live Database

E. **Settings**
- Project Settings
- Job History
- Audit Logs

---

## USER FLOW

1. **Create Organization**: Setup your entity.
2. **Create Project**: Define your migration goal.
3. **Enter Workspace**: Navigate to the sidebar.
4. **Upload SQL**: Unlock the "Analysis" and "Migration Builder" tools.
5. **Analyze**: Use Diagnostics and Visualizer to understand the dump.
6. **Build Migration**: Map columns, apply fixes, and **Export a new SQL file**.
7. **(Optional) Live Migration**: Connect a database and push directly.

---

## JOB LIFECYCLE (Scoped to Project)

Each Project holds its active Job state:
- Uploaded
- Restoring
- Analyzing
- Extracting
- Cleaning
- Repairing Relations
- Validating
- Ready for Export

---

## DESIGN PRINCIPLES

- **Project Scoping**: No cross-project data leakage.
- **Sidebar Clarity**: Tools are grouped logically by workflow stage.
- **Unlocking Logic**: Analysis tools stay disabled until a SQL dump is extracted.
- **SQL-File First**: Direct DB pushing is secondary to providing high-quality SQL exports.
