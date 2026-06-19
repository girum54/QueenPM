import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Crown, X, Calendar, Clock, ArrowRight } from "lucide-react";
import {
  COLUMN_META, PRIORITY_STYLES, useStore,
  type ColumnId, type Priority, type Task,
} from "@/lib/queen-store";
import { useAuth } from "@/lib/auth-store";
import { DatePicker } from "@/components/DatePicker";
import { sprintsApi } from "@/lib/api/queen.api";
import { formatDisplayDate, getSprintEndDate } from "@/lib/sprint-dates";
import { canAssignToUser, isProjectManager } from "@/lib/project-permissions";

const COLUMNS: ColumnId[] = ["new", "active", "staging", "deployed"];

export function AcceptAssignModal({
  task,
  onClose,
  onSubmit,
  users,
  subtitle,
}: {
  task: Task;
  onClose: () => void;
  onSubmit: (patch: Partial<Task>) => void;
  users: { id: string; name: string; isAi?: boolean }[];
  subtitle?: string;
}) {
  const { user: currentUser } = useAuth();
  const { activeProjectId, projectTabs } = useStore();

  const activeProject = useMemo(
    () => projectTabs.find((p) => p.id === activeProjectId),
    [projectTabs, activeProjectId],
  );
  const isPM = isProjectManager(activeProject, currentUser?.id);

  const initialAssignee = useMemo(() => {
    const current = task.assigneeId ?? "";
    if (!currentUser?.id) return current;
    if (canAssignToUser(activeProject, currentUser.id, current || null)) return current;
    return "";
  }, [task.assigneeId, currentUser?.id, activeProject]);

  const [assigneeId, setAssigneeId] = useState<string>(initialAssignee);

  useEffect(() => {
    setAssigneeId(initialAssignee);
  }, [task.id, initialAssignee]);
  const [mode, setMode] = useState<"deadline" | "days">(
    task.estimateDays && !task.deadline ? "days" : "deadline",
  );
  const [deadline, setDeadline] = useState<string>(task.deadline?.slice(0, 10) ?? "");
  const [sprintEndDate, setSprintEndDate] = useState<string>("");
  const [days, setDays] = useState<number>(task.estimateDays ?? 3);
  const [column, setColumn] = useState<ColumnId>(task.column === "new" ? "active" : task.column);
  const [priority, setPriority] = useState<Priority>(task.priority);

  useEffect(() => {
    let cancelled = false;
    async function loadSprintDeadline() {
      try {
        let sprint = null;
        if (task.sprintId) {
          sprint = await sprintsApi.getOne(task.sprintId);
        } else if (activeProjectId) {
          sprint = await sprintsApi.getActive(activeProjectId);
        }
        if (!sprint || cancelled) return;

        const end = getSprintEndDate(sprint.startDate, sprint.durationWeeks);
        setSprintEndDate(end);
        if (!task.deadline && !deadline) {
          setDeadline(end);
        }
      } catch {
        // No active sprint — leave deadline empty
      }
    }
    loadSprintDeadline();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, task.sprintId, task.deadline, activeProjectId]);

  const submit = () => {
    let finalAssigneeId = assigneeId || null;
    if (
      finalAssigneeId &&
      !canAssignToUser(activeProject, currentUser?.id, finalAssigneeId)
    ) {
      finalAssigneeId = currentUser?.id ?? null;
    }

    onSubmit({
      assigneeId: finalAssigneeId,
      column,
      priority,
      deadline: mode === "deadline" ? deadline || null : null,
      estimateDays: mode === "days" ? days : null,
    });
  };

  const assigneeOptions = useMemo(() => {
    if (!currentUser) return [];
    if (isPM) {
      return users.filter((u) => !u.isAi);
    }
    const me = users.find((u) => u.id === currentUser.id);
    return me ? [me] : [];
  }, [users, currentUser, isPM]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50 animate-scale-in">
        <div className="px-5 py-4 border-b border-slate-800 flex items-start gap-3">
          <div className="size-9 rounded-lg bg-fuchsia-500/15 ring-1 ring-fuchsia-500/30 grid place-items-center">
            <Crown className="size-4 text-fuchsia-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-fuchsia-300">
              Accept & Assign
            </div>
            <div className="text-sm font-medium text-slate-100 truncate">{task.title}</div>
            {subtitle && (
              <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>
            )}
          </div>
          <button onClick={onClose} className="size-7 grid place-items-center rounded hover:bg-slate-800 text-slate-400">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <Field
            label="Assignee"
            hint={
              isPM
                ? "Project manager — assign to anyone on the team"
                : "You can assign this task to yourself"
            }
          >
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500"
            >
              <option value="">— Unassigned —</option>
              {assigneeOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id === currentUser?.id ? `${u.name} (me)` : u.name}
                  {u.isAi ? " (AI)" : ""}
                </option>
              ))}
            </select>
            {!isPM && (
              <p className="text-[10px] text-slate-500 mt-1.5">
                Only the project manager can assign tasks to other team members.
              </p>
            )}
          </Field>

          <Field
            label="Timeframe Allocation"
            hint={sprintEndDate ? `Sprint ends ${formatDisplayDate(sprintEndDate)}` : "Choose a hard deadline or an estimate in days"}
          >
            <div className="flex gap-1 p-1 rounded-md bg-slate-800/60 border border-slate-700 mb-2 w-fit">
              <button
                type="button"
                onClick={() => setMode("deadline")}
                className={`px-3 h-7 rounded text-xs font-medium inline-flex items-center gap-1.5 transition ${
                  mode === "deadline" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Calendar className="size-3" /> Deadline
              </button>
              <button
                type="button"
                onClick={() => setMode("days")}
                className={`px-3 h-7 rounded text-xs font-medium inline-flex items-center gap-1.5 transition ${
                  mode === "days" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Clock className="size-3" /> Days
              </button>
            </div>
            {mode === "deadline" ? (
              <div className="space-y-2">
                <DatePicker
                  value={deadline}
                  onChange={setDeadline}
                  placeholder="Select deadline"
                />
                {sprintEndDate && deadline !== sprintEndDate && (
                  <button
                    type="button"
                    onClick={() => setDeadline(sprintEndDate)}
                    className="text-[10px] font-semibold text-fuchsia-400 hover:text-fuchsia-300 transition"
                  >
                    Use sprint end ({formatDisplayDate(sprintEndDate)})
                  </button>
                )}
              </div>
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

          <Field label="Route To Column" hint="Move this card straight out of New">
            <div className="grid grid-cols-4 gap-1.5">
              {COLUMNS.map((c) => {
                const m = COLUMN_META[c];
                const active = column === c;
                return (
                  <button
                    key={c}
                    type="button"
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

          <Field label="Priority Confirmation" hint="Override the suggested severity">
            <div className="grid grid-cols-4 gap-1.5">
              {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => {
                const active = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
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
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-md text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
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

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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
