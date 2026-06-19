import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus, ExternalLink, Crown, Bot, Zap, MousePointerClick, Filter, Search, X, Calendar, Clock, ArrowRight, ListTodo,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useStore, COLUMN_META, PRIORITY_STYLES, CREATED_BY_META,
  type ColumnId, type Priority, type Task, userById,
} from "@/lib/queen-store";

export const Route = createFileRoute("/board")({
  head: () => ({
    meta: [
      { title: "Board — Queen PM" },
      { name: "description", content: "Kanban execution board with drag-and-drop pipeline." },
    ],
  }),
  component: BoardPage,
});

const COLUMNS: ColumnId[] = ["new", "active", "staging", "deployed"];

// Hardcoded active sprint for now - in production this would come from store/API
const ACTIVE_SPRINT_ID = "d5d16315-fe1f-4c09-ab7b-c1e3d3f9fb0e"; // From seed data

function BoardPage() {
  const { tasks, updateTask, users, requestJump, activeProjectId, projectTabs } = useStore();
  const navigate = useNavigate();
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<ColumnId | null>(null);
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [query, setQuery] = useState("");

  const activeProject = useMemo(() => {
    return projectTabs.find((p) => p.id === activeProjectId) || projectTabs[0];
  }, [projectTabs, activeProjectId]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      // Must match active project
      if (t.projectId && t.projectId !== activeProjectId) return false;
      // Must be in the active sprint using sprintId
      if (!t.sprintId) return false; // Only show tasks that have a sprint assigned
      // Filter by search query
      if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [tasks, activeProjectId, query]);
  const byCol = useMemo(() => {
    const map: Record<ColumnId, Task[]> = { new: [], active: [], staging: [], deployed: [] };
    filtered.forEach((t) => map[t.column].push(t));
    return map;
  }, [filtered]);

  const handleDrop = (col: ColumnId) => {
    if (dragId) updateTask(dragId, { column: col });
    setDragId(null);
    setHoverCol(null);
  };

  const handleOriginJump = (t: Task) => {
    if (!t.originMessageId || !t.originChannelId) return;
    requestJump(t.originMessageId, t.originChannelId);
    navigate({ to: "/channels" });
  };

  return (
    <AppShell>
      <div className="h-full flex flex-col font-sans">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-800/80 bg-slate-900/30 px-5 py-3 sm:py-0 sm:h-12 shrink-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-semibold text-slate-100">{activeProject?.name} · Board</h1>
            <span className="text-xs text-slate-500">{filtered.length} tasks</span>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="flex items-center gap-2 px-2.5 h-8 rounded-md bg-slate-800/50 border border-slate-800 text-xs text-slate-300 flex-1 sm:flex-initial sm:w-48">
              <Search className="size-3.5 text-slate-505" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter tasks…"
                className="bg-transparent outline-none flex-1 placeholder:text-slate-505 min-w-0"
              />
            </div>
            <button className="h-8 px-2.5 rounded-md text-xs text-slate-300 border border-slate-800 hover:bg-slate-800/60 inline-flex items-center gap-1.5 transition">
              <Filter className="size-3.5" /> Filter
            </button>
            <Link to="/tasks" className="h-8 px-2.5 rounded-md text-xs font-medium bg-slate-800 border border-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100 inline-flex items-center gap-1.5 transition">
              <ListTodo className="size-3.5" /> Manage Tasks
            </Link>
          </div>
        </div>

        {/* Columns */}
        <div className="flex-1 min-h-0 overflow-x-auto">
          <div className="h-full grid grid-cols-4 gap-4 p-5 min-w-[1100px]">
            {COLUMNS.map((col) => {
              const meta = COLUMN_META[col];
              const items = byCol[col];
              const isHover = hoverCol === col;
              return (
                <div
                  key={col}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoverCol(col);
                  }}
                  onDragLeave={() => setHoverCol((h) => (h === col ? null : h))}
                  onDrop={() => handleDrop(col)}
                  className={`flex flex-col rounded-xl border bg-slate-900/30 min-h-0 transition ${
                    isHover ? "border-fuchsia-500/50 bg-slate-900/60" : "border-slate-800/80"
                  }`}
                >
                  <div className="px-3.5 py-3 flex items-center gap-2 border-b border-slate-800/80">
                    <span className={`size-1.5 rounded-full ${meta.dot}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${meta.accent}`}>
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">{items.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {items.length === 0 && (
                      <div className="text-[11px] text-slate-600 text-center py-8 border border-dashed border-slate-800 rounded-lg">
                        Drop tasks here
                      </div>
                    )}
                    {items.map((t) => (
                      <BoardCard
                        key={t.id}
                        task={t}
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => setModalTask(t)}
                        onOriginJump={() => handleOriginJump(t)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modalTask && (
        <AcceptAssignModal
          task={modalTask}
          onClose={() => setModalTask(null)}
          onSubmit={(patch) => {
            updateTask(modalTask.id, patch);
            setModalTask(null);
          }}
          users={users}
        />
      )}
    </AppShell>
  );
}

function BoardCard({
  task, onDragStart, onDragEnd, onClick, onOriginJump,
}: {
  task: Task;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
  onOriginJump: () => void;
}) {
  const assignee = userById(task.assigneeId);
  const trigger = CREATED_BY_META[task.createdBy];
  const TriggerIcon = task.createdBy === "ai" ? Bot : task.createdBy === "slash" ? Zap : MousePointerClick;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="group rounded-lg border border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900 p-3 cursor-grab active:cursor-grabbing transition"
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-slate-100 leading-snug">{task.title}</div>
          {task.description && (
            <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{task.description}</div>
          )}
        </div>
        {task.originMessageId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOriginJump();
            }}
            title="Jump to origin message"
            className="opacity-60 group-hover:opacity-100 size-6 grid place-items-center rounded text-slate-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 transition shrink-0"
          >
            <ExternalLink className="size-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center flex-wrap gap-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${trigger.className}`}>
          <TriggerIcon className="size-2.5" />
          {trigger.label}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {assignee ? (
            <div
              title={assignee.name}
              className={`size-5 rounded-full ${assignee.color} grid place-items-center text-[9px] font-bold text-white ring-1 ring-slate-900`}
            >
              {assignee.isAi ? <Crown className="size-2.5" /> : assignee.name[0]}
            </div>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30 font-semibold">
              Unassigned
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AcceptAssignModal({
  task, onClose, onSubmit, users,
}: {
  task: Task;
  onClose: () => void;
  onSubmit: (patch: Partial<Task>) => void;
  users: ReturnType<typeof useStore>["users"];
}) {
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId ?? "");
  const [mode, setMode] = useState<"deadline" | "days">(task.estimateDays ? "days" : "deadline");
  const [deadline, setDeadline] = useState<string>(task.deadline ?? "");
  const [days, setDays] = useState<number>(task.estimateDays ?? 3);
  const [column, setColumn] = useState<ColumnId>(task.column === "new" ? "active" : task.column);
  const [priority, setPriority] = useState<Priority>(task.priority);

  const submit = () => {
    onSubmit({
      assigneeId: assigneeId || null,
      column,
      priority,
      deadline: mode === "deadline" ? deadline || null : null,
      estimateDays: mode === "days" ? days : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50 animate-scale-in">
        <div className="px-5 py-4 border-b border-slate-800 flex items-start gap-3">
          <div className="size-9 rounded-lg bg-fuchsia-500/15 ring-1 ring-fuchsia-500/30 grid place-items-center">
            <Crown className="size-4 text-fuchsia-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-fuchsia-300">Accept & Assign</div>
            <div className="text-sm font-medium text-slate-100 truncate">{task.title}</div>
          </div>
          <button onClick={onClose} className="size-7 grid place-items-center rounded hover:bg-slate-800 text-slate-400">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Assignee */}
          <Field label="Assignee" hint="Pick a team engineer or hand off to Queen PM">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500"
            >
              <option value="">— Unassigned —</option>
              {users.filter((u) => u.id !== "me").map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.isAi ? "(AI)" : ""}
                </option>
              ))}
            </select>
          </Field>

          {/* Timeframe */}
          <Field label="Timeframe Allocation" hint="Choose a hard deadline or an estimate in days">
            <div className="flex gap-1 p-1 rounded-md bg-slate-800/60 border border-slate-700 mb-2 w-fit">
              <button
                onClick={() => setMode("deadline")}
                className={`px-3 h-7 rounded text-xs font-medium inline-flex items-center gap-1.5 transition ${
                  mode === "deadline" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Calendar className="size-3" /> Deadline
              </button>
              <button
                onClick={() => setMode("days")}
                className={`px-3 h-7 rounded text-xs font-medium inline-flex items-center gap-1.5 transition ${
                  mode === "days" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Clock className="size-3" /> Days
              </button>
            </div>
            {mode === "deadline" ? (
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500"
              />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value || "1", 10))}
                  className="w-24 h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500"
                />
                <span className="text-xs text-slate-400">days to complete</span>
              </div>
            )}
          </Field>

          {/* Routing */}
          <Field label="Route To Column" hint="Move this card straight out of New">
            <div className="grid grid-cols-4 gap-1.5">
              {COLUMNS.map((c) => {
                const m = COLUMN_META[c];
                const active = column === c;
                return (
                  <button
                    key={c}
                    onClick={() => setColumn(c)}
                    className={`h-9 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 transition ${
                      active
                        ? "bg-fuchsia-500/15 text-fuchsia-200 ring-1 ring-fuchsia-500/40"
                        : "bg-slate-800/60 border border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${m.dot}`} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Priority */}
          <Field label="Priority Confirmation" hint="Override the suggested severity">
            <div className="grid grid-cols-4 gap-1.5">
              {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => {
                const active = priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`h-9 rounded-md text-xs font-semibold uppercase tracking-wide transition ${
                      active ? PRIORITY_STYLES[p] + " ring-2" : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-3.5 rounded-md text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="h-9 px-3.5 rounded-md text-sm font-medium bg-fuchsia-500 hover:bg-fuchsia-400 text-white inline-flex items-center gap-1.5 shadow-lg shadow-fuchsia-500/20"
          >
            Confirm <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-200">{label}</label>
        {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
