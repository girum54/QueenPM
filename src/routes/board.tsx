import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Plus, ExternalLink, Crown, Bot, Zap, MousePointerClick, Filter, Search, ListTodo, X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { AcceptAssignModal } from "@/components/AcceptAssignModal";
import {
  useStore, COLUMN_META, PRIORITY_STYLES, CREATED_BY_META,
  type ColumnId, type Task, type Priority, userById,
} from "@/lib/queen-store";
import { useAuth } from "@/lib/auth-store";

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

function BoardPage() {
  const { tasks, updateTask, addTask, users, requestJump, activeProjectId, projectTabs, activeSprintId } = useStore();
  const { user } = useAuth();
  const isStakeholder = user?.role === "stakeholder";
  const navigate = useNavigate();
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<ColumnId | null>(null);
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [quickAddCol, setQuickAddCol] = useState<ColumnId | null>(null);
  const [query, setQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);
  const [sprints, setSprints] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);

  // Fetch sprints and deliverables for the modal
  useEffect(() => {
    if (!activeProjectId) return;
    import("@/lib/api/queen.api").then((m) => {
      m.sprintsApi.getByProject(activeProjectId).then(async (data) => {
        setSprints(data);
        // Fetch deliverables for all sprints
        const allDeliverables = await Promise.all(
          data.map((s: any) => m.sprintsApi.getDeliverables(s.id))
        );
        setDeliverables(allDeliverables.flat());
      }).catch(console.error);
    });
  }, [activeProjectId]);

  const activeProject = useMemo(() => {
    return projectTabs.find((p) => p.id === activeProjectId) || projectTabs[0];
  }, [projectTabs, activeProjectId]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      // Must match active project
      if (t.projectId && t.projectId !== activeProjectId) return false;
      // Must be in the active sprint using sprintId
      if (!t.sprintId) return false; // Only show tasks that have a sprint assigned
      // Must match the current active sprint ID
      if (activeSprintId && t.sprintId !== activeSprintId) return false;
      // Filter by search query
      if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false;
      // Filter by priority
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      // Filter by assignee
      if (filterAssignee !== "all") {
        if (filterAssignee === "unassigned" && t.assigneeId !== null) return false;
        if (filterAssignee !== "unassigned" && t.assigneeId !== filterAssignee) return false;
      }
      return true;
    });
  }, [tasks, activeProjectId, activeSprintId, query, filterPriority, filterAssignee]);
  const byCol = useMemo(() => {
    const map: Record<ColumnId, Task[]> = { new: [], active: [], staging: [], deployed: [] };
    filtered.forEach((t) => map[t.column].push(t));
    return map;
  }, [filtered]);

  const handleDrop = async (col: ColumnId) => {
    if (isStakeholder) return;
    if (dragId) {
      setIsProcessingDrop(true);
      await updateTask(dragId, { column: col });
      setIsProcessingDrop(false);
    }
    setDragId(null);
    setHoverCol(null);
  };

  const handleCreateTask = async (taskData: any) => {
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
      setQuickAddCol(null);
    } catch (error) {
      console.error("Failed to create task on board:", error);
    }
  };

  const handleOriginJump = (t: Task) => {
    if (!t.originMessageId || !t.originChannelId) return;
    requestJump(t.originMessageId, t.originChannelId);
    navigate({ to: "/channels" });
  };

  return (
    <AppShell>
      {isProcessingDrop && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-4 bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="size-10 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-spin"></div>
            <div className="text-sm font-medium text-slate-200 animate-pulse">Syncing board...</div>
          </div>
        </div>
      )}
      <div className="h-full flex flex-col font-sans relative">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-800/80 bg-slate-900/30 px-5 py-3 sm:py-0 sm:h-12 shrink-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-semibold text-slate-100">{activeProject?.name} · Board</h1>
            <span className="text-xs text-slate-500">{filtered.length} tasks</span>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="flex items-center gap-2 px-2.5 h-8 rounded-md bg-slate-800/50 border border-slate-800 text-xs text-slate-300 flex-1 sm:flex-initial sm:w-48">
              <Search className="size-3.5 text-slate-505 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter tasks…"
                className="bg-transparent outline-none flex-1 placeholder:text-slate-505 min-w-0"
              />
              {query && (
                <button onClick={() => setQuery("")} className="shrink-0"><X className="size-3 text-slate-500 hover:text-slate-300" /></button>
              )}
            </div>
            {/* Priority filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
              className="h-8 px-2.5 rounded-md bg-slate-800 border border-slate-800 text-xs text-slate-300 outline-none cursor-pointer hover:bg-slate-700 transition"
            >
              <option value="all">All Priorities</option>
              {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>

            {/* Assignee filter */}
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="h-8 px-2.5 rounded-md bg-slate-800 border border-slate-800 text-xs text-slate-300 outline-none cursor-pointer hover:bg-slate-700 transition max-w-[120px]"
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <Link to="/tasks" className="h-8 px-2.5 rounded-md text-xs font-medium bg-slate-800 border border-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100 inline-flex items-center gap-1.5 transition">
              <ListTodo className="size-3.5" /> {isStakeholder ? "View Tasks" : "Manage Tasks"}
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
                    if (isStakeholder) return;
                    e.preventDefault();
                    setHoverCol(col);
                  }}
                  onDragLeave={() => !isStakeholder && setHoverCol((h) => (h === col ? null : h))}
                  onDrop={() => !isStakeholder && handleDrop(col)}
                  className={`flex flex-col rounded-xl border bg-slate-900/30 min-h-0 transition ${
                    isHover && !isStakeholder ? "border-fuchsia-500/50 bg-slate-900/60" : "border-slate-800/80"
                  }`}
                >
                  <div className="px-3.5 py-3 flex items-center gap-2 border-b border-slate-800/80 group">
                    <span className={`size-1.5 rounded-full ${meta.dot}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${meta.accent}`}>
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">{items.length}</span>
                    {!isStakeholder && (
                      <button
                        onClick={() => setQuickAddCol(col)}
                        className="ml-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 hover:bg-slate-800 rounded transition text-slate-400 hover:text-slate-200"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {items.length === 0 && (
                      <div className="text-[11px] text-slate-600 text-center py-8 border border-dashed border-slate-800 rounded-lg">
                        {isStakeholder ? "No tasks" : "Drop tasks here"}
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
                        isStakeholder={isStakeholder}
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

      <CreateTaskModal
        isOpen={quickAddCol !== null}
        onClose={() => setQuickAddCol(null)}
        onSubmit={handleCreateTask}
        initialColumn={quickAddCol || "new"}
        initialSprintId={activeSprintId}
        sprints={sprints}
        deliverables={deliverables}
        users={users}
      />
    </AppShell>
  );
}

function BoardCard({
  task, onDragStart, onDragEnd, onClick, onOriginJump, isStakeholder,
}: {
  task: Task;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
  onOriginJump: () => void;
  isStakeholder?: boolean;
}) {
  const { users } = useStore();
  const assignee = userById(task.assigneeId, users);
  const trigger = CREATED_BY_META[task.createdBy];
  const TriggerIcon = task.createdBy === "ai" ? Bot : task.createdBy === "slash" ? Zap : MousePointerClick;
  return (
    <div
      draggable={!isStakeholder}
      onDragStart={(e) => {
        if (isStakeholder) return;
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group rounded-lg border border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900 p-3 transition ${isStakeholder ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
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
