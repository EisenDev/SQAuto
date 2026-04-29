"use client";

import React from "react";
import { RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { safeFetch } from "@/lib/api_client";
import {
  PageFrame,
  PageHeader,
  SectionCard,
  StatusBadge,
  useProjectWorkspaceData,
  WorkspaceNote,
  workspaceActions,
  workspaceMeta,
} from "@/components/workspace/project-workspace";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function SettingsPage({ params }: { params: { projectId: string } }) {
  const workspace = useProjectWorkspaceData(params.projectId);
  const [name, setName] = React.useState(workspace.project.name);
  const [description, setDescription] = React.useState(workspace.project.description || "");

  React.useEffect(() => {
    setName(workspace.project.name);
    setDescription(workspace.project.description || "");
  }, [workspace.project.description, workspace.project.name]);

  const save = async () => {
    const response = await safeFetch(`${API_URL}/projects/${params.projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    toast[response.success ? "success" : "warning"](response.success ? "Project updated" : "Saved locally only; backend did not confirm");
  };

  const reset = async () => {
    const response = await safeFetch(`${API_URL}/projects/${params.projectId}/reset`, { method: "POST" });
    toast[response.success ? "success" : "warning"](response.success ? "Project data reset" : "Reset action is unavailable right now");
  };

  const remove = async () => {
    const response = await safeFetch(`${API_URL}/projects/${params.projectId}`, { method: "DELETE" });
    toast[response.success ? "success" : "warning"](response.success ? "Project deleted" : "Delete endpoint did not confirm; no UI crash");
  };

  return (
    <PageFrame>
      <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
        <PageHeader
          title={workspaceMeta.settings.title}
          description={workspaceMeta.settings.description}
          badge={<StatusBadge status="idle">{workspace.project.id.slice(0, 8)}</StatusBadge>}
          actions={
            <button className={workspaceActions.secondary} onClick={workspace.reload}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          }
        />

        <WorkspaceNote usingMockData={false} loading={workspace.loading} error={workspace.error} />

        <SectionCard title="Project Info" description="Rename the project and update its description">
          <div className="grid gap-4">
            <label className="space-y-2 text-sm text-slate-300">
              <span>Project name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none" />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Description</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none" />
            </label>
            <div className="flex justify-end">
              <button className={workspaceActions.primary} onClick={save}>
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-6 md:grid-cols-2">
          <SectionCard title="Reset Data" description="Clear uploaded jobs while keeping the project shell intact">
            <p className="text-sm leading-6 text-slate-400">
              This removes project job records and resets the workspace back to a pre-upload state. Use it when you want a clean migration pass.
            </p>
            <div className="mt-5">
              <button className={workspaceActions.secondary} onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Reset data
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Danger Zone" description="Delete the project and all metadata references">
            <p className="text-sm leading-6 text-slate-400">
              This is destructive. The UI remains non-blocking, but the backend delete endpoint will run if it is available.
            </p>
            <div className="mt-5">
              <button className={workspaceActions.danger} onClick={remove}>
                <Trash2 className="h-4 w-4" />
                Delete project
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageFrame>
  );
}
