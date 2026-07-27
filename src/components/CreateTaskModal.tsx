import React, { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { type Priority, type ColumnId, type Task, type User, COLUMN_META } from "@/lib/queen-store";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Omit<Task, "id" | "createdAt" | "createdBy" | "originMessageId" | "originChannelId" | "projectId">) => Promise<void>;
  parentId?: string | null;
  initialColumn?: ColumnId;
  initialPriority?: Priority;
  initialSprintId?: string | null;
  initialAssigneeId?: string | null;
  initialDeliverableId?: string | null;
  sprints: any[];
  deliverables: any[];
  users: User[];
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  parentId,
  initialColumn = "new",
  initialPriority = "medium",
  initialSprintId = null,
  initialAssigneeId = null,
  initialDeliverableId = null,
  sprints,
  deliverables,
  users,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(initialPriority);
  const [column, setColumn] = useState<ColumnId>(initialColumn);
  const [sprintId, setSprintId] = useState<string | null>(initialSprintId);
  const [deliverableId, setDeliverableId] = useState<string | null>(initialDeliverableId);
  const [assigneeId, setAssigneeId] = useState<string | null>(initialAssigneeId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    if (!sprintId) {
      alert("Please select a sprint");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        priority,
        column,
        sprintId,
        deliverableId,
        assigneeId,
        parentId: parentId || undefined,
        // Optional fields set to null/undefined or defaults by parent
      });
      setTitle(""); // Reset on success
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-fuchsia-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              {parentId ? "Add Subtask" : "New Task"}
            </h3>
          </div>
          <button onClick={onClose} className="size-7 grid place-items-center rounded hover:bg-slate-800 text-slate-505 transition">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Title</label>
            <input
              autoFocus required value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={parentId ? "Subtask description..." : "Task description..."}
              className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500 transition"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500">
                {(["urgent","high","medium","low"] as Priority[]).map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Status</label>
              <select value={column} onChange={(e) => setColumn(e.target.value as ColumnId)}
                className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500">
                {(["new","active","staging","deployed"] as ColumnId[]).map((c) => (
                  <option key={c} value={c}>{COLUMN_META[c].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Assignee</label>
            <select value={assigneeId || ""} onChange={(e) => setAssigneeId(e.target.value || null)}
              className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500">
              <option value="">-- Unassigned --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.isAi ? "(AI)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Sprint *</label>
            <select value={sprintId || ""} onChange={(e) => setSprintId(e.target.value || null)}
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Deliverable (optional)</label>
            <select value={deliverableId || ""} onChange={(e) => setDeliverableId(e.target.value || null)}
              className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500">
              <option value="">-- No deliverable --</option>
              {deliverables
                .filter((d) => !sprintId || d.sprintId === sprintId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.text}
                  </option>
                ))}
            </select>
          </div>

          {parentId && (
            <div className="text-[10px] text-slate-550 italic">
              * Creating nested subtask under parent task #{parentId.slice(-6)}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="h-9 px-4 rounded-md text-xs font-medium text-slate-400 hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="h-9 px-4 rounded-md text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
              {isSubmitting ? <><Loader2 className="size-3.5 animate-spin" /> {parentId ? "Adding..." : "Creating..."}</> : (parentId ? "Add Subtask" : "Create Task")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
