import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Plus, Pencil, Trash2, Check, X, Folder, KanbanSquare,
  MessageSquare, Sparkles, Crown, Loader2, AlertCircle, Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/queen-store";
import { projectsApi, type ApiProject, type ApiUser } from "@/lib/api/queen.api";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Queen PM" },
      { name: "description", content: "Create, manage and switch between your Queen PM projects." },
    ],
  }),
  component: ProjectsPage,
});

const COLOR_OPTIONS = [
  { label: "Fuchsia", value: "from-fuchsia-500 to-violet-600" },
  { label: "Sky", value: "from-sky-500 to-cyan-600" },
  { label: "Emerald", value: "from-emerald-500 to-teal-600" },
  { label: "Amber", value: "from-amber-500 to-orange-600" },
  { label: "Rose", value: "from-rose-500 to-pink-600" },
  { label: "Indigo", value: "from-indigo-500 to-blue-600" },
  { label: "Lime", value: "from-lime-500 to-green-600" },
  { label: "Red", value: "from-red-500 to-rose-600" },
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_OPTIONS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onChange(c.value)}
          className={`size-7 rounded-md bg-gradient-to-br ${c.value} ring-2 transition ${
            value === c.value
              ? "ring-white/80 scale-110"
              : "ring-transparent hover:ring-white/30"
          }`}
        />
      ))}
    </div>
  );
}

function ProjectsPage() {
  const { projectTabs, activeProjectId, setActiveProjectId, addProjectTab, closeProjectTab, users } = useStore();

  // Remote-fetched full project list (richer than store's ProjectTab)
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Member management
  const [manageMembersProjectId, setManageMembersProjectId] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createColor, setCreateColor] = useState(COLOR_OPTIONS[0].value);
  const [creating, setCreating] = useState(false);

  // Edit state: id → { name, color }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  async function fetchProjects() {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.getAll();
      setProjects(data);
    } catch (e: any) {
      setError(e.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (showCreate) setTimeout(() => createInputRef.current?.focus(), 50);
  }, [showCreate]);

  useEffect(() => {
    if (editingId) setTimeout(() => editInputRef.current?.focus(), 50);
  }, [editingId]);

  async function handleCreate() {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const created = await projectsApi.create({ name: createName.trim(), color: createColor });
      setProjects((prev) => [created, ...prev]);
      // Also update the store so the sidebar tab appears
      await addProjectTab(createName.trim(), createColor);
      setCreateName("");
      setCreateColor(COLOR_OPTIONS[0].value);
      setShowCreate(false);
    } catch (e: any) {
      setError(e.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(p: ApiProject) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditColor(p.color);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const updated = await projectsApi.update(id, {
        name: editName.trim(),
        color: editColor,
      });
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (e: any) {
      setError(e.message || "Failed to update project");
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await projectsApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      closeProjectTab(id);
      setDeletingId(null);
    } catch (e: any) {
      setError(e.message || "Failed to delete project");
    }
  }

  function updateProjectMembers(projectId: string, members: ApiUser[]) {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, members } : p)),
    );
  }

  const manageMembersProject = manageMembersProjectId
    ? projects.find((p) => p.id === manageMembersProjectId)
    : null;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Sparkles className="size-3.5 text-fuchsia-400" /> Project Management
              </div>
              <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">Projects</h1>
              <p className="text-sm text-slate-400 mt-1">
                {projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace
              </p>
            </div>
            <button
              id="create-project-btn"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-xs font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition"
            >
              <Plus className="size-4" /> New Project
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-200">
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Create form */}
          {showCreate && (
            <div className="rounded-xl border border-fuchsia-500/30 bg-slate-900/60 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <h3 className="text-sm font-semibold text-slate-100">New Project</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Project Name</label>
                  <input
                    ref={createInputRef}
                    id="create-project-name"
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
                    placeholder="e.g. Project Aurora"
                    className="w-full h-9 rounded-md bg-slate-950/60 border border-slate-800 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 px-3 text-sm text-slate-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-2 block">Color</label>
                  <ColorPicker value={createColor} onChange={setCreateColor} />
                </div>
                {/* Preview */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800">
                  <div className={`size-9 rounded-lg bg-gradient-to-br ${createColor} grid place-items-center shadow`}>
                    <Crown className="size-4 text-white" />
                  </div>
                  <span className="text-sm text-slate-200 font-medium">{createName || "Project name"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => { setShowCreate(false); setCreateName(""); }}
                  className="h-8 px-3 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  id="confirm-create-project"
                  onClick={handleCreate}
                  disabled={creating || !createName.trim()}
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-xs font-semibold text-white transition"
                >
                  {creating ? <><Loader2 className="size-3.5 animate-spin" /> Creating...</> : <><Check className="size-3.5" /> Create</>}
                </button>
              </div>
            </div>
          )}

          {/* Project list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-fuchsia-400" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="size-16 rounded-2xl bg-fuchsia-500/10 ring-1 ring-fuchsia-500/30 flex items-center justify-center mb-4">
                <Folder className="size-8 text-fuchsia-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-200">No projects yet</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Create your first project to start organizing tasks, sprints, and channels.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((p) => {
                const isActive = p.id === activeProjectId;
                const isEditing = editingId === p.id;
                const isConfirmingDelete = deletingId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`group relative rounded-xl border bg-slate-900/40 p-5 flex flex-col gap-4 transition ${
                      isActive
                        ? "border-fuchsia-500/50 shadow-lg shadow-fuchsia-500/10"
                        : "border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 bg-fuchsia-500/15 ring-1 ring-fuchsia-500/30 rounded-full px-2 py-0.5">
                        Active
                      </span>
                    )}

                    {isEditing ? (
                      /* ── Edit mode ── */
                      <div className="space-y-3">
                        <input
                          ref={editInputRef}
                          id={`edit-project-${p.id}`}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(p.id); if (e.key === "Escape") cancelEdit(); }}
                          className="w-full h-9 rounded-md bg-slate-950/60 border border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 px-3 text-sm text-slate-100 outline-none"
                        />
                        <ColorPicker value={editColor} onChange={setEditColor} />
                        <div className="flex items-center gap-2">
                          <button
                            id={`save-edit-${p.id}`}
                            onClick={() => handleSaveEdit(p.id)}
                            disabled={saving || !editName.trim()}
                            className="inline-flex items-center gap-1 h-7 px-3 rounded-md bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-xs font-semibold text-white transition"
                          >
                            {saving ? <><Loader2 className="size-3 animate-spin" /> Saving...</> : <><Check className="size-3" /> Save</>}
                          </button>
                          <button onClick={cancelEdit} className="h-7 px-3 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : isConfirmingDelete ? (
                      /* ── Delete confirmation ── */
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-rose-300">
                          <AlertCircle className="size-4 shrink-0" />
                          Delete <span className="font-semibold">"{p.name}"</span>? This cannot be undone.
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            id={`confirm-delete-${p.id}`}
                            onClick={() => handleDelete(p.id)}
                            className="h-7 px-3 rounded-md bg-rose-500 hover:bg-rose-400 text-xs font-semibold text-white transition"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="h-7 px-3 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal view ── */
                      <>
                        <div className="flex items-start gap-3">
                          <div className={`size-10 rounded-xl bg-gradient-to-br ${p.color} grid place-items-center shadow-md shrink-0`}>
                            <Crown className="size-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1 pr-6">
                            <div className="text-sm font-semibold text-slate-100 truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              {p.id.slice(0, 8)}…
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              Created {new Date(p.createdAt).toLocaleDateString()}
                            </div>
                            {/* Member avatars */}
                            {(p.members?.length ?? 0) > 0 && (
                              <div className="flex items-center gap-1 mt-2">
                                <div className="flex -space-x-1.5">
                                  {p.members!.slice(0, 4).map((m) => (
                                    <div
                                      key={m.id}
                                      title={m.name}
                                      className={`size-5 rounded-full ring-2 ring-slate-900 ${m.color || "bg-slate-600"} grid place-items-center text-[8px] font-bold text-white`}
                                    >
                                      {m.isAi ? "Q" : m.name[0]}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[10px] text-slate-500">
                                  {p.members!.length} member{p.members!.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-auto">
                          <button
                            id={`manage-members-${p.id}`}
                            onClick={() => setManageMembersProjectId(p.id)}
                            className="size-8 rounded-md bg-slate-800 hover:bg-slate-700 grid place-items-center text-slate-400 hover:text-slate-200 transition"
                            title="Manage members"
                          >
                            <Users className="size-3.5" />
                          </button>
                          {!isActive && (
                            <button
                              id={`switch-project-${p.id}`}
                              onClick={() => setActiveProjectId(p.id)}
                              className="flex-1 h-8 rounded-md bg-fuchsia-500/10 ring-1 ring-fuchsia-500/30 hover:bg-fuchsia-500/20 text-xs font-semibold text-fuchsia-300 transition"
                            >
                              Switch to
                            </button>
                          )}
                          {isActive && (
                            <div className="flex-1 flex gap-2">
                              <a
                                href="/board"
                                className="flex-1 h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 inline-flex items-center justify-center gap-1.5 transition"
                              >
                                <KanbanSquare className="size-3" /> Board
                              </a>
                              <a
                                href="/channels"
                                className="flex-1 h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 inline-flex items-center justify-center gap-1.5 transition"
                              >
                                <MessageSquare className="size-3" /> Channels
                              </a>
                            </div>
                          )}
                          <button
                            id={`edit-project-btn-${p.id}`}
                            onClick={() => startEdit(p)}
                            className="size-8 rounded-md bg-slate-800 hover:bg-slate-700 grid place-items-center text-slate-400 hover:text-slate-200 transition"
                            title="Rename / recolor"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            id={`delete-project-btn-${p.id}`}
                            onClick={() => setDeletingId(p.id)}
                            disabled={projects.length <= 1}
                            className="size-8 rounded-md bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 grid place-items-center text-slate-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete project"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {manageMembersProject && (
        <ManageMembersModal
          project={manageMembersProject}
          onClose={() => setManageMembersProjectId(null)}
          systemUsers={users}
          onMembersChanged={(members) => updateProjectMembers(manageMembersProject.id, members)}
        />
      )}
    </AppShell>
  );
}

function ManageMembersModal({
  project,
  onClose,
  systemUsers,
  onMembersChanged,
}: {
  project: ApiProject;
  onClose: () => void;
  systemUsers: ReturnType<typeof useStore>["users"];
  onMembersChanged: (members: ApiUser[]) => void;
}) {
  const [projectMembers, setProjectMembers] = useState<ApiUser[]>(project.members ?? []);
  const [busyUserIds, setBusyUserIds] = useState<Record<string, boolean>>({});

  const handleToggleMember = async (user: typeof systemUsers[0]) => {
    const isMember = projectMembers.some((m) => m.id === user.id);
    setBusyUserIds((prev) => ({ ...prev, [user.id]: true }));
    try {
      if (isMember) {
        await projectsApi.removeMember(project.id, user.id);
        const updated = projectMembers.filter((m) => m.id !== user.id);
        setProjectMembers(updated);
        onMembersChanged(updated);
      } else {
        await projectsApi.addMember(project.id, user.id);
        const apiUser: ApiUser = {
          id: user.id,
          name: user.name,
          email: "",
          emailVerified: false,
          image: null,
          createdAt: "",
          updatedAt: "",
          username: user.handle,
          color: user.color,
          isAi: user.isAi,
        };
        const updated = [...projectMembers, apiUser];
        setProjectMembers(updated);
        onMembersChanged(updated);
      }
    } catch (e) {
      console.error("Failed to toggle project member:", e);
    } finally {
      setBusyUserIds((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-50 flex items-center gap-1.5">
              <Users className="size-4 text-fuchsia-400" /> Project Members
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Manage who has access to <span className="text-slate-300">{project.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-6 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 grid place-items-center transition"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {systemUsers.map((u) => {
            const isMember = projectMembers.some((m) => m.id === u.id);
            const isOwner = project.ownerId === u.id;
            const isBusy = busyUserIds[u.id];
            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-800/40 bg-slate-900/50 hover:bg-slate-950/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`size-8 rounded-full ${u.color} grid place-items-center text-xs font-bold text-white shrink-0`}>
                    {u.isAi ? <Crown className="size-4" /> : u.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                      {u.name}
                      {isOwner && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/30 rounded-full px-1.5 py-0.5">
                          Owner
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{u.handle}</div>
                  </div>
                </div>

                <button
                  disabled={isBusy || isOwner}
                  onClick={() => handleToggleMember(u)}
                  title={isOwner ? "Project owner cannot be removed" : undefined}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                    isMember
                      ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                      : "bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400"
                  }`}
                >
                  {isBusy ? "..." : isMember ? "Remove" : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
