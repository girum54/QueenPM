import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  ListTodo, Plus, Search, X, Calendar, Clock, Crown, Bot, Zap, MousePointerClick,
  CheckCircle2, Circle, AlertCircle, ArrowUpDown, ChevronDown, ChevronRight, CornerDownRight, Loader2, Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import {
  useStore, COLUMN_META, PRIORITY_STYLES, CREATED_BY_META,
  type Task, type ColumnId, type Priority, userById,
} from "@/lib/queen-store";
import { sprintsApi } from "@/lib/api/queen.api";
import { useAuth } from "@/lib/auth-store";

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
type SortBy = "created" | "priority" | "title" | "sprint";

function TasksPage() {
  const { tasks, users, addTask, activeProjectId, projectTabs } = useStore();
  const { user } = useAuth();
  const isStakeholder = user?.role === "stakeholder";

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
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [sprints, setSprints] = useState<any[]>([]);
  const [activeSprint, setActiveSprint] = useState<any | null>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch sprints and deliverables for current project
  useEffect(() => {
    if (!activeProjectId) return;
    async function loadSprints() {
      try {
        const projectSprints = await sprintsApi.getByProject(activeProjectId);
        setSprints(projectSprints);
        const active = projectSprints.find((s: any) => s.isActive);
        setActiveSprint(active || null);
        // Fetch deliverables for all sprints
        const allDeliverables = await Promise.all(
          projectSprints.map((s: any) => sprintsApi.getDeliverables(s.id))
        );
        setDeliverables(allDeliverables.flat());
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
        if (sortBy === "priority") {
          const order: Priority[] = ["urgent", "high", "medium", "low"];
          return order.indexOf(a.priority) - order.indexOf(b.priority);
        }
        if (sortBy === "sprint") {
          const sprintA = sprints.find((s) => s.id === a.sprintId);
          const sprintB = sprints.find((s) => s.id === b.sprintId);
          if (!sprintA && !sprintB) return 0;
          if (!sprintA) return 1;
          if (!sprintB) return -1;
          return sprintA.name.localeCompare(sprintB.name);
        }
        return 0;
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

  const handleAddTask = async (taskData: any) => {
    try {
      const task: Task = {
        id: `t_${Date.now()}`,
        title: taskData.title,
        priority: taskData.priority,
        column: taskData.column,
        createdBy: "ui",
        assigneeId: taskData.assigneeId || null,
        originMessageId: null,
        originChannelId: null,
        sprintId: taskData.sprintId,
        createdAt: Date.now(),
        projectId: activeProjectId,
        parentId: taskData.parentId || undefined,
      };
      await addTask(task);
      setNewParentId(null);
      setIsNewTaskOpen(false);
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  const openSubtaskModal = (parentId: string) => {
    setNewParentId(parentId);
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
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-4 sm:py-7 space-y-4 sm:space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className={`size-1.5 rounded-full bg-gradient-to-br ${activeProject?.color} shrink-0`} />
                {activeProject?.name} Tasks
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 tracking-tight">Project Tasks Explorer</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {stats.total} total items (including nested subtasks) · {stats.done} completed
              </p>
            </div>
            {!isStakeholder && (
              <button
                onClick={() => { setNewParentId(null); setIsNewTaskOpen(true); }}
                className="h-9 px-4 rounded-lg text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/20 inline-flex items-center justify-center gap-2 transition w-full sm:w-auto"
              >
                <Plus className="size-4" /> Create Task
              </button>
            )}
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            {[
              { label: "Total Project Tasks", value: stats.total, color: "text-slate-200" },
              { label: "Completed", value: stats.done, color: "text-slate-500" },
              { label: "Active Execution", value: stats.active, color: "text-slate-300" },
              { label: "Urgent Incidents", value: stats.urgent, color: "text-fuchsia-400" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2.5 sm:gap-3 bg-slate-900/40 border border-slate-900`}>
                <span className={`text-xl sm:text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</span>
                <span className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Filters & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 h-8 rounded-lg bg-slate-905/60 border border-slate-800/80 text-xs text-slate-300 w-full sm:w-56">
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
              className="h-8 px-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 outline-none cursor-pointer flex-1 sm:flex-initial"
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
              className="h-8 px-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 outline-none cursor-pointer flex-1 sm:flex-initial"
            >
              <option value="all">All Priorities</option>
              {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>

            <div className="h-5 w-px bg-slate-850 mx-1 hidden sm:block" />

            {/* Group by */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap overflow-x-auto pb-1 sm:pb-0 max-w-full">
              <ArrowUpDown className="size-3 shrink-0" /> <span className="shrink-0">Group:</span>
              {(["none", "sprint", "status", "priority"] as GroupBy[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`h-7 px-2.5 rounded-md font-medium capitalize transition shrink-0 ${
                    groupBy === g ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  {g === "none" ? "flat list" : g}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-slate-850 mx-1 hidden sm:block" />

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-8 px-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 outline-none cursor-pointer flex-1 sm:flex-initial"
            >
              <option value="created">Sort: Newest</option>
              <option value="priority">Sort: Priority</option>
              <option value="title">Sort: Title</option>
              <option value="sprint">Sort: Sprint</option>
            </select>

            <span className="w-full sm:w-auto text-right sm:ml-auto text-xs text-slate-600 tabular-nums">{filteredRoots.length} root tasks</span>
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
                            deliverables={deliverables}
                            onAddSubtask={() => openSubtaskModal(task.id)}
                            isStakeholder={isStakeholder}
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
      <CreateTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onSubmit={handleAddTask}
        parentId={newParentId}
        initialSprintId={activeSprint?.id || null}
        sprints={sprints}
        deliverables={deliverables}
        users={users}
      />
    </AppShell>
  );
}

interface RowProps {
  task: Task;
  subtasks: Task[];
  users: any[];
  sprints: any[];
  deliverables: any[];
  onAddSubtask: () => void;
  isStakeholder: boolean;
}

function TaskHierarchicalRow({ task, subtasks, users, sprints, deliverables, onAddSubtask, isStakeholder }: RowProps) {
  const [expanded, setExpanded] = useState(true);
  const [quickTitle, setQuickTitle] = useState("");
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const { addTask, updateTask, deleteTask, activeProjectId } = useStore();
  const assignee = userById(task.assigneeId, users);
  const colMeta = COLUMN_META[task.column];
  const CreatedIcon = task.createdBy === "ai" ? Bot : task.createdBy === "slash" ? Zap : MousePointerClick;
  const createdMeta = CREATED_BY_META[task.createdBy];
  const taskSprint = sprints.find((s) => s.id === task.sprintId);

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
      <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-2.5 hover:bg-slate-900/40 transition text-xs border-b border-slate-900/40">
        
        {/* Left: Expand, Status, Title, Description, Sprint */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Subtask expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            disabled={subtasks.length === 0}
            className={`size-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 disabled:opacity-20 transition shrink-0`}
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

          {/* Title & description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium break-words ${task.column === "deployed" ? "line-through text-slate-500" : "text-slate-200"}`}>
                {task.title}
              </span>
              {taskSprint && (
                <span className="px-1.5 py-0.2 rounded text-[8px] font-semibold bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                  {taskSprint.name}
                </span>
              )}
            </div>
            {task.description && (
              <span className="text-[10px] text-slate-500 line-clamp-1 block">{task.description}</span>
            )}
          </div>
        </div>

        {/* Right: Badges & Actions */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0 pl-7 sm:pl-0">
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
          <div className="shrink-0 flex items-center justify-end">
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
          {!isStakeholder && (
            <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0 flex-wrap">
              <select
                value={task.sprintId || ""}
                onChange={(e) => updateTask(task.id, { sprintId: e.target.value || null })}
                className="px-2 py-0.5 h-5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-350 outline-none cursor-pointer hover:bg-slate-800 transition max-w-[90px] sm:max-w-none truncate"
              >
                <option value="">Backlog</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {task.sprintId && (
                <select
                  value={task.deliverableId || ""}
                  onChange={(e) => updateTask(task.id, { deliverableId: e.target.value || null })}
                  className="px-2 py-0.5 h-5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-350 outline-none cursor-pointer hover:bg-slate-800 transition max-w-[90px] sm:max-w-none truncate"
                >
                  <option value="">No deliverable</option>
                  {deliverables
                    .filter((d) => d.sprintId === task.sprintId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.text}</option>
                    ))}
                </select>
              )}
              <button
                onClick={() => setIsQuickOpen(!isQuickOpen)}
                className="px-2 py-0.5 h-5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-350 hover:text-slate-100 transition"
              >
                + Subtask
              </button>
              {task.column !== "deployed" && (
                <button
                  onClick={() => updateTask(task.id, { column: "deployed" })}
                  className="px-2 py-0.5 h-5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[10px] text-emerald-400 hover:text-emerald-300 transition"
                  title="Mark as done"
                >
                  Done
                </button>
              )}
              <button
                onClick={() => { if (confirm(`Delete "${task.title}"?`)) deleteTask(task.id); }}
                className="px-1.5 py-0.5 h-5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-400 hover:text-rose-300 transition"
                title="Delete task"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Quick Add Subtask Input Line */}
      {isQuickOpen && (
        <form onSubmit={handleQuickAdd} className="pl-10 sm:pl-14 pr-4 py-1.5 bg-slate-900/20 border-b border-slate-900/50 flex items-center gap-2">
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
        <div className="pl-4 sm:pl-9 divide-y divide-slate-900/20 bg-slate-900/5">
          {subtasks.map((sub) => {
            const subAssignee = userById(sub.assigneeId, users);
            const subCol = COLUMN_META[sub.column];
            return (
              <div key={sub.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2 hover:bg-slate-900/30 transition text-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CornerDownRight className="size-3 text-slate-600 shrink-0" />
                  
                  {/* Status circle */}
                  <div className="shrink-0 pl-0.5">
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] break-words ${sub.column === "deployed" ? "line-through text-slate-650" : "text-slate-300"}`}>
                        {sub.title}
                      </span>
                      {(() => {
                        const subSprint = sprints.find((s) => s.id === sub.sprintId);
                        return subSprint ? (
                          <span className="px-1 py-0.2 rounded text-[8px] font-semibold bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                            {subSprint.name}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Right: Badges & Actions */}
                <div className="flex items-center gap-1.5 flex-wrap shrink-0 pl-5 sm:pl-0">
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
                  <div className="shrink-0 flex items-center justify-end">
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
                  {!isStakeholder && (
                    <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0 flex-wrap">
                      <select
                        value={sub.sprintId || ""}
                        onChange={(e) => updateTask(sub.id, { sprintId: e.target.value || null })}
                        className="px-2 py-0.5 h-5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-350 outline-none cursor-pointer hover:bg-slate-800 transition max-w-[90px] sm:max-w-none truncate"
                      >
                        <option value="">Backlog</option>
                        {sprints.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {sub.sprintId && (
                        <select
                          value={sub.deliverableId || ""}
                          onChange={(e) => updateTask(sub.id, { deliverableId: e.target.value || null })}
                          className="px-2 py-0.5 h-5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-350 outline-none cursor-pointer hover:bg-slate-800 transition max-w-[90px] sm:max-w-none truncate"
                        >
                          <option value="">No deliverable</option>
                          {deliverables
                            .filter((d: any) => d.sprintId === sub.sprintId)
                            .map((d: any) => (
                              <option key={d.id} value={d.id}>{d.text}</option>
                            ))}
                        </select>
                      )}
                      {sub.column !== "deployed" && (
                        <button
                          onClick={() => updateTask(sub.id, { column: "deployed" })}
                          className="px-2 py-0.5 h-5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[10px] text-emerald-400 hover:text-emerald-300 transition"
                          title="Mark as done"
                        >
                          Done
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm(`Delete "${sub.title}"?`)) deleteTask(sub.id); }}
                        className="px-1.5 py-0.5 h-5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-400 hover:text-rose-300 transition"
                        title="Delete subtask"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
