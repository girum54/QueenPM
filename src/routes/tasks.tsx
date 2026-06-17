import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ListTodo, Plus, Search, Filter, ChevronDown, X,
  Calendar, Clock, Crown, Bot, Zap, MousePointerClick,
  CheckCircle2, Circle, AlertCircle, ArrowUpDown,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useStore, COLUMN_META, PRIORITY_STYLES, CREATED_BY_META,
  type Task, type ColumnId, type Priority, userById,
} from "@/lib/queen-store";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Queen PM" },
      { name: "description", content: "All tasks across every sprint and project." },
    ],
  }),
  component: TasksPage,
});

const SPRINT_GROUPS = [
  { id: "sprint-q3-4", label: "Sprint Q3 - Iteration 4", active: true },
  { id: "sprint-q3-3", label: "Sprint Q3 - Iteration 3", active: false },
  { id: "sprint-q3-2", label: "Sprint Q3 - Iteration 2", active: false },
  { id: "backlog", label: "Backlog", active: false },
];

const TASK_SPRINT_MAP: Record<string, string> = {
  t1: "sprint-q3-4", t2: "sprint-q3-4", t4: "sprint-q3-4",
  t5: "sprint-q3-4", t10: "sprint-q3-4", t12: "sprint-q3-4",
  t3: "sprint-q3-3", t9: "sprint-q3-3",
  t6: "sprint-q3-3", t7: "sprint-q3-2", t8: "sprint-q3-2",
  t11: "sprint-q3-2",
};

type GroupBy = "sprint" | "status" | "priority";
type SortBy = "created" | "priority" | "title";

function TasksPage() {
  const { tasks, users, addTask } = useStore();

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ColumnId | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("sprint");
  const [sortBy, setSortBy] = useState<SortBy>("created");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newColumn, setNewColumn] = useState<ColumnId>("new");

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false;
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
  }, [tasks, query, filterStatus, filterPriority, sortBy]);

  const grouped = useMemo(() => {
    if (groupBy === "sprint") {
      return SPRINT_GROUPS.map((sg) => ({
        id: sg.id,
        label: sg.label,
        badge: sg.active ? "Active" : undefined,
        badgeColor: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30",
        items: filtered.filter((t) => (TASK_SPRINT_MAP[t.id] ?? "backlog") === sg.id),
      })).filter((g) => g.items.length > 0);
    }
    if (groupBy === "status") {
      return (["new", "active", "staging", "deployed"] as ColumnId[]).map((col) => {
        const meta = COLUMN_META[col];
        return {
          id: col,
          label: meta.label,
          badge: undefined,
          badgeColor: "",
          items: filtered.filter((t) => t.column === col),
        };
      }).filter((g) => g.items.length > 0);
    }
    // priority
    return (["urgent", "high", "medium", "low"] as Priority[]).map((p) => ({
      id: p,
      label: p.charAt(0).toUpperCase() + p.slice(1),
      badge: undefined,
      badgeColor: "",
      items: filtered.filter((t) => t.priority === p),
    })).filter((g) => g.items.length > 0);
  }, [filtered, groupBy]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const task: Task = {
      id: `t_${Date.now()}`,
      title: newTitle.trim(),
      priority: newPriority,
      column: newColumn,
      createdBy: "ui",
      assigneeId: null,
      originMessageId: null,
      originChannelId: null,
      createdAt: Date.now(),
    };
    addTask(task);
    setNewTitle("");
    setIsNewTaskOpen(false);
  };

  const stats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter((t) => t.column === "deployed").length,
    active: tasks.filter((t) => t.column === "active").length,
    urgent: tasks.filter((t) => t.priority === "urgent").length,
  }), [tasks]);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-8 py-7 space-y-6">

          {/* ── Header ── */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <ListTodo className="size-3.5 text-fuchsia-400" /> All Tasks
              </div>
              <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">Task Registry</h1>
              <p className="text-sm text-slate-400 mt-1">
                {stats.total} tasks across all sprints · {stats.done} deployed · {stats.active} active · {stats.urgent} urgent
              </p>
            </div>
            <button
              onClick={() => setIsNewTaskOpen(true)}
              className="h-9 px-4 rounded-lg text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/20 inline-flex items-center gap-2 transition"
            >
              <Plus className="size-4" /> New Task
            </button>
          </div>

          {/* ── Stat chips ── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-slate-200", bg: "bg-slate-800/50" },
              { label: "Deployed", value: stats.done, color: "text-emerald-300", bg: "bg-emerald-500/10 ring-1 ring-emerald-500/20" },
              { label: "Active", value: stats.active, color: "text-sky-300", bg: "bg-sky-500/10 ring-1 ring-sky-500/20" },
              { label: "Urgent", value: stats.urgent, color: "text-rose-300", bg: "bg-rose-500/10 ring-1 ring-rose-500/20" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl px-4 py-3 flex items-center gap-3 ${s.bg}`}>
                <span className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</span>
                <span className="text-xs text-slate-500 font-medium">{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── Filters & Controls ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 h-8 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 w-56">
              <Search className="size-3.5 text-slate-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks…"
                className="bg-transparent outline-none flex-1 placeholder:text-slate-600"
              />
              {query && (
                <button onClick={() => setQuery("")}><X className="size-3 text-slate-500 hover:text-slate-300" /></button>
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

            <div className="h-5 w-px bg-slate-800 mx-1" />

            {/* Group by */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ArrowUpDown className="size-3" /> Group:
              {(["sprint", "status", "priority"] as GroupBy[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`h-7 px-2.5 rounded-md font-medium capitalize transition ${
                    groupBy === g ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-slate-800 mx-1" />

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

            <span className="ml-auto text-xs text-slate-600 tabular-nums">{filtered.length} shown</span>
          </div>

          {/* ── Task Groups ── */}
          <div className="space-y-4">
            {grouped.length === 0 && (
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 py-16 text-center">
                <ListTodo className="size-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No tasks match your filters.</p>
              </div>
            )}

            {grouped.map((group) => {
              const isCollapsed = collapsedGroups.has(group.id);
              return (
                <div key={group.id} className="rounded-xl border border-slate-800/60 bg-slate-900/20 overflow-hidden">
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-900/40 transition border-b border-slate-800/40"
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

                  {/* Task rows */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-800/30">
                      {group.items.map((task) => (
                        <TaskRow key={task.id} task={task} users={users} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── New Task Modal ── */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="size-4 text-fuchsia-400" />
                <h3 className="text-sm font-semibold text-slate-100">New Task</h3>
              </div>
              <button onClick={() => setIsNewTaskOpen(false)} className="size-7 grid place-items-center rounded hover:bg-slate-800 text-slate-500">
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Title</label>
                <input
                  autoFocus required value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Describe the task…"
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
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsNewTaskOpen(false)}
                  className="h-9 px-4 rounded-md text-xs font-medium text-slate-400 hover:bg-slate-800 transition">
                  Cancel
                </button>
                <button type="submit"
                  className="h-9 px-4 rounded-md text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/20 transition">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function TaskRow({ task, users }: { task: Task; users: ReturnType<typeof useStore>["users"] }) {
  const assignee = userById(task.assigneeId, users);
  const colMeta = COLUMN_META[task.column];
  const CreatedIcon = task.createdBy === "ai" ? Bot : task.createdBy === "slash" ? Zap : MousePointerClick;
  const createdMeta = CREATED_BY_META[task.createdBy];

  const daysSince = Math.round((Date.now() - task.createdAt) / 86400000);

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-900/40 transition text-xs">
      {/* Status icon */}
      <div className="shrink-0">
        {task.column === "deployed" ? (
          <CheckCircle2 className="size-4 text-emerald-400" />
        ) : task.column === "active" ? (
          <AlertCircle className="size-4 text-sky-400" />
        ) : (
          <Circle className="size-4 text-slate-600" />
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <span className={`font-medium truncate block ${task.column === "deployed" ? "line-through text-slate-500" : "text-slate-200"}`}>
          {task.title}
        </span>
        {task.description && (
          <span className="text-[11px] text-slate-600 truncate block">{task.description}</span>
        )}
      </div>

      {/* Priority */}
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
        {task.priority}
      </span>

      {/* Status */}
      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide shrink-0 ${colMeta.accent}`}>
        <span className={`size-1 rounded-full ${colMeta.dot}`} />
        {colMeta.label}
      </span>

      {/* Source */}
      <span className={`hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${createdMeta.className}`}>
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

      {/* Age */}
      <span className="hidden lg:block text-[10px] text-slate-600 shrink-0 tabular-nums w-12 text-right">
        {daysSince === 0 ? "Today" : `${daysSince}d ago`}
      </span>
    </div>
  );
}
