"use client";

import React from "react";
import { Plus, RefreshCw, Server, ShieldAlert, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  EmptyState,
  PageFrame,
  PageHeader,
  SectionCard,
  StatusBadge,
  useProjectWorkspaceData,
  WorkspaceNote,
  WorkspaceTarget,
  workspaceActions,
  workspaceMeta,
  workspacePageShell,
} from "@/components/workspace/project-workspace";
import { createMigrationTarget, deleteMigrationTarget, listMigrationTargets, testMigrationTargetConnection } from "@/lib/api";

export default function DestinationPage({ params }: { params: { projectId: string } }) {
  const workspace = useProjectWorkspaceData(params.projectId);
  const [targets, setTargets] = React.useState<WorkspaceTarget[]>([]);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    host: "",
    port: "5432",
    database_name: "",
    username: "",
    password: "",
  });

  const normalizedHost = form.host.trim().toLowerCase();
  const hostWarning =
    normalizedHost === "localhost" || normalizedHost === "127.0.0.1" || normalizedHost === "::1"
      ? "localhost points to the SQAuto backend container/server, not your laptop database. Use host.docker.internal, a docker-compose service name, or a reachable DB host."
      : null;

  function validateForm() {
    const missing = [
      !form.name.trim() ? "connection name" : null,
      !form.host.trim() ? "host" : null,
      !form.port.trim() ? "port" : null,
      !form.database_name.trim() ? "database" : null,
      !form.username.trim() ? "username" : null,
      !form.password ? "password" : null,
    ].filter(Boolean) as string[];
    if (missing.length) {
      return `Provide ${missing.join(", ")} before testing or saving this destination.`;
    }
    return null;
  }

  const loadTargets = React.useCallback(async () => {
    try {
      const result = await listMigrationTargets(params.projectId);
      setTargets(result as WorkspaceTarget[]);
      setPageError(null);
    } catch (error: any) {
      setTargets([]);
      setPageError(error?.message || "Unable to load real data");
    }
  }, [params.projectId]);

  React.useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const testConnection = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setTesting(true);
    try {
      const response = await testMigrationTargetConnection({
        host: form.host,
        port: Number(form.port),
        database_name: form.database_name,
        username: form.username,
        password: form.password,
        db_type: "postgresql",
        ssl_mode: "prefer",
      });
      if (response.success) {
        toast.success("Connection test passed");
      } else {
        toast.error(response.hint ? `${response.message || response.error}\n${response.hint}` : response.message || response.error || "Connection test failed");
      }
    } catch (error: any) {
      toast.error(error?.hint ? `${error.message}\n${error.hint}` : error?.message || "Connection test failed");
    }
    setTesting(false);
  };

  const saveTarget = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      const response = await createMigrationTarget(params.projectId, {
        ...form,
        port: Number(form.port),
        db_type: "postgresql",
        ssl_mode: "prefer",
      });
      setTargets((current) => [response as unknown as WorkspaceTarget, ...current]);
      setOpen(false);
      toast.success("Destination saved");
      setPageError(null);
    } catch (error: any) {
      toast.error(error?.message || "Unable to save destination");
    }
    setSaving(false);
  };

  return (
    <PageFrame>
      <div className={workspacePageShell}>
        <PageHeader
          title={workspaceMeta.destination.title}
          description={workspaceMeta.destination.description}
          actions={
            <>
              <button className={workspaceActions.secondary} onClick={loadTargets}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className={workspaceActions.primary} onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                Add destination
              </button>
            </>
          }
        />

        <WorkspaceNote usingMockData={false} loading={workspace.loading} error={workspace.error || pageError} />

        <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="h-4 w-4" />
            Use with caution
          </div>
          <p className="mt-1 text-amber-100/80">These credentials are for validation and migration planning. Production writes should remain explicitly operator-controlled.</p>
        </div>

        <SectionCard title="Connections" description="Saved destination database endpoints">
          <DataTable
            columns={[
              {
                key: "name",
                label: "Connection",
                render: (row) => (
                  <div>
                    <div className="font-medium text-white">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.host}:{row.port}</div>
                  </div>
                ),
              },
              { key: "database_name", label: "Database" },
              { key: "username", label: "User" },
              {
                key: "ssl_mode",
                label: "SSL",
                render: (row) => <StatusBadge status="completed">{row.ssl_mode || "prefer"}</StatusBadge>,
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <button
                    className={workspaceActions.secondary}
                    onClick={async () => {
                      try {
                        await deleteMigrationTarget(params.projectId, row.id);
                        setTargets((current) => current.filter((item) => item.id !== row.id));
                      } catch (error: any) {
                        toast.error(error?.message || "Unable to remove destination");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                ),
              },
            ]}
            rows={targets}
          />
          {targets.length === 0 ? <div className="mt-4"><EmptyState title="No data available yet" description="No live destinations are saved for this project yet." /></div> : null}
        </SectionCard>

        {open ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-[0_40px_120px_rgba(2,6,23,0.65)]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">New Destination</h2>
                  <p className="mt-1 text-sm text-slate-400">Store a target connection for simulation and migration planning.</p>
                </div>
                <button className={workspaceActions.secondary} onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["name", "Connection name"],
                  ["host", "Host"],
                  ["port", "Port"],
                  ["database_name", "Database"],
                  ["username", "Username"],
                  ["password", "Password"],
                ].map(([key, label]) => (
                  <label key={key} className="space-y-2 text-sm text-slate-300">
                    <span>{label}</span>
                    <input
                      type={key === "password" ? "password" : "text"}
                      value={(form as any)[key]}
                      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2.5 text-slate-100 outline-none"
                    />
                  </label>
                ))}
              </div>

              {hostWarning ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {hostWarning}
                </div>
              ) : null}

              <div className="mt-6 flex justify-end gap-3">
                <button className={workspaceActions.secondary} onClick={testConnection} disabled={testing}>
                  <Server className="h-4 w-4" />
                  {testing ? "Testing…" : "Test Connection"}
                </button>
                <button className={workspaceActions.primary} onClick={saveTarget} disabled={saving}>
                  <Plus className="h-4 w-4" />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PageFrame>
  );
}
