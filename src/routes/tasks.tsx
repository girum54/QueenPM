import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  ListTodo, Plus, Search, X, Calendar, Clock, Crown, Bot, Zap, MousePointerClick,
  CheckCircle2, Circle, AlertCircle, ArrowUpDown, ChevronDown, ChevronRight, CornerDownRight, Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useStore, COLUMN_META, PRIORITY_STYLES, CREATED_BY_META,
  type Task, type ColumnId, type Priority, userById,
} from "@/lib/queen-store";
import { sprintsApi } from "@/lib/api/queen.api";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Queen PM" },
      { name: "description", content: "All tasks inside the active project including subtasks." },
    ],
  }),
  component: TasksPage,
});



type GroupBy = "sprint" | "status" | "priority" | "none";
type SortBy = "created" | "priority" | "title";

function TasksPage() {
  const { tasks, users, addTask, activeProjectId, projectTabs } = useStore();

  const activeProject = useMemo(() => {
    return projectTabs.find((p) => p.id === activeProjectId) || projectTabs[0];
  }, [projectTabs, activeProjectId]);

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ColumnId | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortBy, setSortBy] = useState<SortBy>("created");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  // Modals / Inputs
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newColumn, setNewColumn] = useState<ColumnId>("new");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newSprintId, setNewSprintId] = useState<string | null>(null);
  const [sprints, setSprints] = useState<any[]>([]);
  const [activeSprint, setActiveSprint] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch sprints for current project
  useEffect(() => {
    if (!activeProjectId) return;
    async function loadSprints() {
      try {
        const projectSprints = await sprintsApi.getByProject(activeProjectId);
        setSprints(projectSprints);
        const active = projectSprints.find((s: any) => s.isActive);
        setActiveSprint(active || null);
        setNewSprintId(active?.id || null);
      } catch (e) {
        console.error("Failed to load sprints:", e);
      }
    }
    loadSprints();
  }, [activeProjectId]);

  // Active Project Tasks (including subtasks)
  const projectTasks = useMemo(() => {
    return tasks.filter((t) => !t.projectId || t.projectId === activeProjectId);
  }, [tasks, activeProjectId]);

  // Root tasks vs Subtasks map
  const { rootTasks, subtasksByParent } = useMemo(() => {
    const roots: Task[] = [];
    const subs: Record<string, Task[]> = {};
    
    projectTasks.forEach((t) => {
      if (t.parentId) {
        if (!subs[t.parentId]) subs[t.parentId] = [];
        subs[t.parentId].push(t);
      } else {
        roots.push(t);
      }
    });
    return { rootTasks: roots, subtasksByParent: subs };
  }, [projectTasks]);

  // Filtered root tasks
  const filteredRoots = useMemo(() => {
    return rootTasks
      .filter((t) => {
        // Search query applies to title
        if (query && !t.title.toLowerCase().includes(query.toLowerCase())) {
          // If a subtask matches, keep the parent
          const children = subtasksByParent[t.id] || [];
          const matchesChild = children.some((c) => c.title.toLowerCase().includes(query.toLowerCase()));
          if (!matchesChild) return false;
        }
        if (filterStatus !== "all" && t.column !== filterStatus) return false;
        if (filterPriority !== "all" && t.priority !== filterPriority) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "created") return b.createdAt - a.createdAt;
        if (sortBy === "title") return a.title.localeCompare(b.title);
        const order: Priority[] = ["urgent", "high", "medium", "low"];
        return order.indexOf(a.priority) - order.indexOf(b.priority);
      });
  }, [rootTasks, subtasksByParent, query, filterStatus, filterPriority, sortBy]);

  // Grouped root tasks
  const grouped = useMemo<{ id: string; label: string; badge?: string; badgeColor?: string; items: Task[] }[]>(() => {
    if (groupBy === "none") {
      return [{ id: "all", label: "All Tasks", items: filteredRoots }];
    }
    if (groupBy === "sprint") {
      const sprintGroups = sprints.map((s) => ({
        id: s.id,
        label: s.name,
        badge: s.isActive ? "Active" : undefined,
        badgeColor: s.isActive ? "text-fuchsia-300 bg-fuchsia-500/10 ring-1 ring-fuchsia-500/30" : "",
        items: filteredRoots.filter((t) => t.sprintId === s.id),
      }));
      sprintGroups.push({
        id: "backlog",
        label: "Backlog",
        badge: undefined,
        badgeColor: "",
        items: filteredRoots.filter((t) => !t.sprintId),
      });
      return sprintGroups.filter((g) => g.items.length > 0);
    }
    if (groupBy === "status") {
      return (["new", "active", "staging", "deployed"] as ColumnId[]).map((col) => {
        const meta = COLUMN_META[col];
        return {
          id: col,
          label: meta.label,
          badge: undefined,
          badgeColor: "",
          items: filteredRoots.filter((t) => t.column === col),
        };
      }).filter((g) => g.items.length > 0);
    }
    // priority
    return (["urgent", "high", "medium", "low"] as Priority[]).map((p) => ({
      id: p,
      label: p.charAt(0).toUpperCase() + p.slice(1),
      badge: undefined,
      badgeColor: "",
      items: filteredRoots.filter((t) => t.priority === p),
    })).filter((g) => g.items.length > 0);
  }, [filteredRoots, groupBy]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;
    if (!newSprintId) {
      alert("Please select a sprint");
      return;
    }
    setIsSubmitting(true);
    try {
      const task: Task = {
        id: `t_${Date.now()}`,
        title: newTitle.trim(),
        priority: newPriority,
        column: newColumn,
        createdBy: "ui",
        assigneeId: null,
        originMessageId: null,
        originChannelId: null,
        sprintId: newSprintId,
        createdAt: Date.now(),
        projectId: activeProjectId,
        parentId: newParentId || undefined,
      };
      await addTask(task);
      setNewTitle("");
      setNewParentId(null);
      setNewSprintId(activeSprint ? activeSprint.id : null);
      setIsNewTaskOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSubtaskModal = (parentId: string) => {
    setNewParentId(parentId);
    setNewPriority("medium");
    setNewColumn("new");
    setNewSprintId(activeSprint ? activeSprint.id : null);
    setIsNewTaskOpen(true);
  };

  const stats = useMemo(() => {
    const all = projectTasks;
    return {
      total: all.length,
      done: all.filter((t) => t.column === "deployed").length,
      active: all.filter((t) => t.column === "active").length,
      urgent: all.filter((t) => t.priority === "urgent").length,
    };
  }, [projectTasks]);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-8 py-7 space-y-6">

          {/* Header */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className={`size-1.5 rounded-full bg-gradient-to-br ${activeProject?.color} shrink-0`} />
                {activeProject?.name} Tasks
              </div>
              <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">Project Tasks & Epic Explorer</h1>
              <p className="text-sm text-slate-400 mt-1">
                {stats.total} total items (including nested subtasks) · {stats.done} completed
              </p>
            </div>
            <button
              onClick={() => { setNewParentId(null); setIsNewTaskOpen(true); }}
              className="h-9 px-4 rounded-lg text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/20 inline-flex items-center gap-2 transition"
            >
              <Plus className="size-4" /> Create Task
            </button>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Project Tasks", value: stats.total, color: "text-slate-200" },
              { label: "Completed", value: stats.done, color: "text-slate-500" },
              { label: "Active Execution", value: stats.active, color: "text-slate-300" },
              { label: "Urgent Incidents", value: stats.urgent, color: "text-fuchsia-400" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl px-4 py-3 flex items-center gap-3 bg-slate-900/40 border border-slate-900`}>
                <span className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</span>
                <span className="text-xs text-slate-500 font-medium">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Filters & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 h-8 rounded-lg bg-slate-905/60 border border-slate-800/80 text-xs text-slate-300 w-56">
              <Search className="size-3.5 text-slate-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter tasks or subtasks…"
                className="bg-transparent outline-none flex-1 placeholder:text-slate-600"
              />
              {query && (
                <button onClick={() => setQuery("")}><X className="size-3 text-slate-500 hover:text-slate-350" /></button>
              )}
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ColumnId | "all")}
              className="h-8 px-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {(["new", "active", "staging", "deployed"] as ColumnId[]).map((c) => (
                <option key={c} value={c}>{COLUMN_META[c].label}</option>
              ))}
            </select>

            {/* Priority filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
              className="h-8 px-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>

            <div className="h-5 w-px bg-slate-850 mx-1" />

            {/* Group by */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ArrowUpDown className="size-3" /> Group:
              {(["none", "sprint", "status", "priority"] as GroupBy[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`h-7 px-2.5 rounded-md font-medium capitalize transition ${
                    groupBy === g ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  {g === "none" ? "flat list" : g}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-slate-850 mx-1" />

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-8 px-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 outline-none cursor-pointer"
            >
              <option value="created">Sort: Newest</option>
              <option value="priority">Sort: Priority</option>
              <option value="title">Sort: Title</option>
            </select>

            <span className="ml-auto text-xs text-slate-600 tabular-nums">{filteredRoots.length} root tasks</span>
          </div>

          {/* Task Groups */}
          <div className="space-y-4">
            {grouped.length === 0 || (grouped.length === 1 && grouped[0].items.length === 0) ? (
              <div className="rounded-xl border border-slate-900 bg-slate-950/20 py-16 text-center">
                <ListTodo className="size-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No tasks in this project yet.</p>
              </div>
            ) : (
              grouped.map((group) => {
                const isCollapsed = collapsedGroups.has(group.id);
                return (
                  <div key={group.id} className="rounded-xl border border-slate-900 bg-slate-950/20 overflow-hidden">
                    {/* Group Header (if grouped) */}
                    {groupBy !== "none" && (
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-900/40 transition border-b border-slate-900"
                      >
                        <ChevronDown className={`size-3.5 text-slate-500 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                        <span className="text-xs font-semibold text-slate-200">{group.label}</span>
                        {group.badge && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${group.badgeColor}`}>
                            {group.badge}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-slate-600 tabular-nums">{group.items.length} tasks</span>
                      </button>
                    )}

                    {/* Task list */}
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-900">
                        {group.items.map((task) => (
                          <TaskHierarchicalRow
                            key={task.id}
                            task={task}
                            subtasks={subtasksByParent[task.id] || []}
                            users={users}
                            sprints={sprints}
                            onAddSubtask={() => openSubtaskModal(task.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* New Task / Subtask Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="size-4 text-fuchsia-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  {newParentId ? "Add Subtask" : "New Task"}
                </h3>
              </div>
              <button onClick={() => setIsNewTaskOpen(false)} className="size-7 grid place-items-center rounded hover:bg-slate-800 text-slate-505">
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Title</label>
                <input
                  autoFocus required value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={newParentId ? "Subtask description..." : "Task description..."}
                  className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500 transition"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Priority</label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Priority)}
                    className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500">
                    {(["urgent","high","medium","low"] as Priority[]).map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Status</label>
                  <select value={newColumn} onChange={(e) => setNewColumn(e.target.value as ColumnId)}
                    className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500">
                    {(["new","active","staging","deployed"] as ColumnId[]).map((c) => (
                      <option key={c} value={c}>{COLUMN_META[c].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Sprint *</label>
                <select value={newSprintId || ""} onChange={(e) => setNewSprintId(e.target.value || null)}
                  className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500">
                  <option value="">-- Select a sprint --</option>
                  {sprints
                    .filter((s) => !s.completedAt)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.isActive ? "(Active)" : "(Upcoming)"}
                      </option>
                    ))}
                </select>
              </div>

              {newParentId && (
                <div className="text-[10px] text-slate-550 italic">
                  * Creating nested subtask under parent task #{newParentId}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsNewTaskOpen(false)}
                  className="h-9 px-4 rounded-md text-xs font-medium text-slate-400 hover:bg-slate-800 transition">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="h-9 px-4 rounded-md text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {isSubmitting ? <><Loader2 className="size-3.5 animate-spin" /> {newParentId ? "Adding..." : "Creating..."}</> : (newParentId ? "Add Subtask" : "Create Task")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

interface RowProps {
  task: Task;
  subtasks: Task[];
  users: any[];
  sprints: any[];
  onAddSubtask: () => void;
}

function TaskHierarchicalRow({ task, subtasks, users, sprints, onAddSubtask }: RowProps) {
  const [expanded, setExpanded] = useState(true);
  const [quickTitle, setQuickTitle] = useState("");
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const { addTask, updateTask, activeProjectId } = useStore();
  const assignee = userById(task.assigneeId, users);
  const colMeta = COLUMN_META[task.column];
  const CreatedIcon = task.createdBy === "ai" ? Bot : task.createdBy === "slash" ? Zap : MousePointerClick;
  const createdMeta = CREATED_BY_META[task.createdBy];

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || isAdding) return;
    const currentTaskSprint = task.sprintId;
    if (!currentTaskSprint) {
      alert("Parent task must be in a sprint to create subtasks");
      return;
    }
    setIsAdding(true);
    try {
      await addTask({
        id: `t_${Date.now()}`,
        title: quickTitle.trim(),
        priority: "medium",
        column: "new",
        createdBy: "ui",
        assigneeId: null,
        originMessageId: null,
        originChannelId: null,
        sprintId: currentTaskSprint,
        createdAt: Date.now(),
        projectId: activeProjectId,
        parentId: task.id,
      });
      setQuickTitle("");
      setIsQuickOpen(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-slate-950/10">
      
      {/* Parent Task Row */}
      <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-900/40 transition text-xs border-b border-slate-900/40">
        
        {/* Subtask expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          disabled={subtasks.length === 0}
          className={`size-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 disabled:opacity-20 transition`}
        >
          {subtasks.length > 0 ? (
            expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />
          ) : (
            <span className="w-3.5 h-3.5 block" />
          )}
        </button>

        {/* Status circle */}
        <div className="shrink-0">
          {task.column === "deployed" ? (
            <CheckCircle2 className="size-4 text-slate-600" />
          ) : task.column === "active" ? (
            <AlertCircle className="size-4 text-slate-300" />
          ) : (
            <Circle className="size-4 text-slate-700" />
          )}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <span className={`font-medium truncate block ${task.column === "deployed" ? "line-through text-slate-500" : "text-slate-205"}`}>
            {task.title}
          </span>
          {task.description && (
            <span className="text-[10px] text-slate-500 truncate block">{task.description}</span>
          )}
        </div>

        {/* Priority */}
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>

        {/* Status badge */}
        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide shrink-0 ${colMeta.accent}`}>
          <span className={`size-1 rounded-full ${colMeta.dot}`} />
          {colMeta.label}
        </span>

        {/* Created By badge */}
        <span className={`hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0 ${createdMeta.className}`}>
          <CreatedIcon className="size-2.5" />
          {task.createdBy === "ai" ? "AI" : task.createdBy === "slash" ? "Slash" : "Manual"}
        </span>

        {/* Assignee */}
        <div className="shrink-0 w-16 flex justify-end">
          {assignee ? (
            <div
              title={assignee.name}
              className={`size-5 rounded-full ${assignee.color} grid place-items-center text-[9px] font-bold text-white ring-1 ring-slate-900`}
            >
              {assignee.isAi ? <Crown className="size-2.5" /> : assignee.name[0]}
            </div>
          ) : (
            <span className="text-[10px] text-slate-600">—</span>
          )}
        </div>

        {/* Add Subtask actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
          <select 
            value={task.sprintId || ""}
            onChange={(e) => updateTask(task.id, { sprintId: e.target.value || null })}
            className="px-2 py-0.5 h-5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-350 outline-none cursor-pointer hover:bg-slate-800 transition"
          >
            <option value="">Backlog</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={() => setIsQuickOpen(!isQuickOpen)}
            className="px-2 py-0.5 h-5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-350 hover:text-slate-100 transition"
          >
            + Subtask
          </button>
        </div>

      </div>

      {/* Quick Add Subtask Input Line */}
      {isQuickOpen && (
        <form onSubmit={handleQuickAdd} className="pl-14 pr-4 py-1.5 bg-slate-900/20 border-b border-slate-900/50 flex items-center gap-2">
          <CornerDownRight className="size-3 text-slate-600 shrink-0" />
          <input
            autoFocus
            required
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Type subtask name and press Enter..."
            className="flex-1 bg-transparent outline-none text-[11px] text-slate-200 placeholder:text-slate-650"
          />
          <button type="submit" disabled={isAdding} className="text-[10px] text-fuchsia-450 hover:text-fuchsia-300 font-semibold px-2 disabled:opacity-50 flex items-center justify-center">
            {isAdding ? <Loader2 className="size-3.5 animate-spin" /> : "Add"}
          </button>
          <button type="button" onClick={() => setIsQuickOpen(false)} className="text-[10px] text-slate-500 hover:text-slate-300">
            Cancel
          </button>
        </form>
      )}

      {/* Subtasks List */}
      {expanded && subtasks.length > 0 && (
        <div className="pl-9 divide-y divide-slate-900/20 bg-slate-900/5">
          {subtasks.map((sub) => {
            const subAssignee = userById(sub.assigneeId, users);
            const subCol = COLUMN_META[sub.column];
            return (
              <div key={sub.id} className="group flex items-center gap-2 px-4 py-2 hover:bg-slate-900/30 transition text-xs">
                <CornerDownRight className="size-3 text-slate-600 shrink-0" />
                
                {/* Status circle */}
                <div className="shrink-0 pl-1">
                  {sub.column === "deployed" ? (
                    <CheckCircle2 className="size-3.5 text-slate-600" />
                  ) : sub.column === "active" ? (
                    <AlertCircle className="size-3.5 text-slate-300" />
                  ) : (
                    <Circle className="size-3.5 text-slate-700" />
                  )}
                </div>

                {/* Subtask Title */}
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] ${sub.column === "deployed" ? "line-through text-slate-600" : "text-slate-300"}`}>
                    {sub.title}
                  </span>
                </div>

                {/* Priority */}
                <span className={`px-1 py-0.2 rounded text-[8px] font-semibold uppercase tracking-wide shrink-0 ${PRIORITY_STYLES[sub.priority]}`}>
                  {sub.priority}
                </span>

                {/* Status */}
                <span className={`flex items-center gap-1 px-1 py-0.2 rounded text-[8px] font-semibold uppercase tracking-wide shrink-0 ${subCol.accent}`}>
                  <span className={`size-1 rounded-full ${subCol.dot}`} />
                  {subCol.label}
                </span>

                {/* Assignee */}
                <div className="shrink-0 w-12 flex justify-end">
                  {subAssignee ? (
                    <div
                      title={subAssignee.name}
                      className={`size-4.5 rounded-full ${subAssignee.color} grid place-items-center text-[8px] font-bold text-white ring-1 ring-slate-950`}
                    >
                      {subAssignee.isAi ? <Crown className="size-2" /> : subAssignee.name[0]}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-650">—</span>
                  )}
                </div>

                {/* Add to sprint action */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0 ml-2">
                  <select 
                    value={sub.sprintId || ""}
                    onChange={(e) => updateTask(sub.id, { sprintId: e.target.value || null })}
                    className="px-2 py-0.5 h-5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-350 outline-none cursor-pointer hover:bg-slate-800 transition"
                  >
                    <option value="">Backlog</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
