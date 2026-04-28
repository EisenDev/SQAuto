# FILE_STRUCTURE.md

# Repository Structure

SQAuto is organized as a monorepo containing a FastAPI backend and a Next.js frontend.

## DIRECTORY TREE

```text
SQAuto/
├── apps/
│   ├── api/
│   │   ├── main.py
│   │   ├── router.py
│   │   ├── models.py      # Updated: Org/Project models
│   │   ├── database.py
│   │   ├── routers/
│   │   │   ├── organizations.py   # NEW
│   │   │   ├── projects.py        # NEW
│   │   │   ├── explorer.py
│   │   │   ├── export.py
│   │   │   └── migration.py
│   └── web/
│       ├── app/           # Next.js App Router
│       │   ├── (auth)/    # Future auth
│       │   ├── (org)/     # Organizations & Projects list
│       │   └── [project]/ # Project Workspace w/ Sidebar
│       ├── components/
│       │   ├── sidebar/   # NEW: Sidebar Layout
│       │   ├── layout/    # Top Header, Breadcrumbs
│       │   ├── analysis/  # Diagnostics, Explorer, Visualizer
│       │   ├── builder/   # Mapping, Export, Translation
│       │   └── live/      # Destinations, Simulation, Push
├── docs/                  # Centralized Documentation
│   ├── AGENT.md
│   ├── ARCHITECTURE.md
│   ├── DOCS.md
│   ├── FILE_STRUCTURE.md
│   ├── SAFETY_RULES.md
│   └── UI_FRONTEND_SPECS.md
├── services/              # Domain Services
│   ├── data_intelligence/
│   ├── migration_engine/
│   └── smart_fix/
└── workers/               # Background task workers
```

## KEY UPDATES

1. **Hierarchy Scoping**: API routers now support `/organizations/` and `/projects/` prefixes.
2. **Frontend Routing**: Next.js App Router uses `[projectId]` dynamic segments to scope the entire workspace.
3. **Component Relocation**: Export delivery is now part of the `builder/` directory, while Diagnostics remains in `analysis/`.