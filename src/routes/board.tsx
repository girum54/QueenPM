import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus, ExternalLink, Crown, Bot, Zap, MousePointerClick, Filter, Search, ListTodo,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AcceptAssignModal } from "@/components/AcceptAssignModal";
import {
  useStore, COLUMN_META, PRIORITY_STYLES, CREATED_BY_META,
  type ColumnId, type Task, userById,
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
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);

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

  const handleDrop = async (col: ColumnId) => {
    if (dragId) {
      setIsProcessingDrop(true);
      await updateTask(dragId, { column: col });
      setIsProcessingDrop(false);
    }
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
  const { users } = useStore();
  const assignee = userById(task.assigneeId, users);
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
