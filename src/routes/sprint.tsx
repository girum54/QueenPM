import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Calendar, Clock, KanbanSquare, CheckCircle2,
  ArrowRight, History, Settings, Target, ArrowUpRight,
  Circle
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore, COLUMN_META } from "@/lib/queen-store";
import { useAuth } from "@/lib/auth-store";
import { sprintsApi } from "@/lib/api/queen.api";

export const Route = createFileRoute("/sprint")({
  head: () => ({
    meta: [
      { title: "Active Sprint — Queen PM" },
      { name: "description", content: "Track your active sprint progress, tasks, and deliverables." },
    ],
  }),
  component: SprintPage,
});

interface Sprint {
  id: string;
  name: string;
  style: string;
  durationDays: number;
  startDate: string;
  goal: string;
  deliverables: { id: string; text: string; done: boolean }[];
  isActive: boolean;
  completedAt?: string | null;
}

function SprintPage() {
  const { tasks, activeProjectId } = useStore();
  const { user } = useAuth();
  const isStakeholder = user?.role === "stakeholder";
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [allSprints, setAllSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);

  useEffect(() => {
    if (!activeProjectId) return;
    async function fetchActiveSprint() {
      try {
        setLoading(true);
        const activeSprint = await sprintsApi.getActive(activeProjectId);
        if (activeSprint) {
          setSprint({
            id: activeSprint.id,
            name: activeSprint.name,
            style: activeSprint.style || "",
            durationDays: activeSprint.durationWeeks,
            startDate: activeSprint.startDate,
            goal: activeSprint.goal || "",
            deliverables: (activeSprint.deliverables || []).map(d => ({ id: d.id, text: d.text, done: d.done })),
            isActive: activeSprint.isActive,
          });
        } else {
          setSprint(null);
        }
      } catch (e) {
        console.error("Failed to load active sprint:", e);
        setSprint(null);
      } finally {
        setLoading(false);
      }
    }
    fetchActiveSprint();
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) return;
    async function fetchAllSprints() {
      try {
        const sprints = await sprintsApi.getByProject(activeProjectId);
        const formatted = await Promise.all(
          sprints.map(async (s) => {
            const deliverables = await sprintsApi.getDeliverables(s.id);
            return {
              id: s.id,
              name: s.name,
              style: s.style || "",
              durationDays: s.durationWeeks,
              startDate: s.startDate,
              goal: s.goal || "",
              deliverables: deliverables.map(d => ({ id: d.id, text: d.text, done: d.done })),
              isActive: s.isActive,
              completedAt: s.completedAt,
            };
          })
        );
        setAllSprints(formatted.filter(s => !s.isActive));
      } catch (e) {
        console.error("Failed to load sprint history:", e);
      }
    }
    fetchAllSprints();
  }, [activeProjectId]);

  const sprintTasks = tasks.filter(t => t.sprintId === sprint?.id);
  const completedTasks = sprintTasks.filter(t => t.column === "deployed").length;
  const totalTasks = sprintTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const completedDeliverables = sprint?.deliverables.filter(d => d.done).length ?? 0;
  const totalDeliverables = sprint?.deliverables.length ?? 0;

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center bg-slate-950">
          <div className="text-slate-400 text-sm animate-pulse">Loading sprint...</div>
        </div>
      </AppShell>
    );
  }

  if (!sprint) {
    return (
      <AppShell>
        <div className="flex h-full flex-col items-center justify-center bg-slate-950 p-6 text-center">
          <div className="size-16 rounded-2xl bg-fuchsia-500/10 ring-1 ring-fuchsia-500/30 flex items-center justify-center mb-6">
            <Target className="size-8 text-fuchsia-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">No Active Sprint</h2>
          <p className="text-slate-400 max-w-sm mt-2 text-sm leading-relaxed">
            {isStakeholder
              ? "No sprint is currently active for this project."
              : "No sprint is active. Create one to start tracking tasks and deliverables."}
          </p>
          {!isStakeholder && (
            <Link
              to="/sprint-config"
              className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-md bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-xs font-semibold text-white transition shadow-lg shadow-fuchsia-500/20"
            >
              New Sprint <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </AppShell>
    );
  }

  // Timeline calculations
  const start = new Date(sprint.startDate).getTime();
  const end = start + sprint.durationDays * 24 * 60 * 60 * 1000;
  const remainingMs = end - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const endDateStr = new Date(end).toLocaleDateString([], { month: "short", day: "numeric" });
  const startDateStr = new Date(start).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 tracking-tight">
                  {showHistory && selectedSprint ? selectedSprint.name : sprint.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30 uppercase tracking-wide">
                  {sprint.style || "Agile"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-slate-500 shrink-0" />
                  {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining` : "Sprint ended"}
                </span>
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-slate-500 shrink-0" />
                  {startDateStr} – {endDateStr}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => { setShowHistory(!showHistory); setSelectedSprint(null); }}
                className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-md text-xs font-medium border transition ${
                  showHistory
                    ? "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30"
                    : "bg-slate-800 text-slate-300 border-slate-800 hover:bg-slate-700"
                }`}
              >
                <History className="size-3.5" />
                {showHistory ? "Active Sprint" : "History"}
              </button>
              {!isStakeholder && (
                <Link
                  to="/sprint-config"
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-800 hover:border-slate-700 transition"
                >
                  <Settings className="size-3.5" /> Manage Sprint
                </Link>
              )}
              <Link
                to="/board"
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-xs font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition"
              >
                <KanbanSquare className="size-3.5" /> Go to Board <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* ── History View ── */}
          {showHistory ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
                <h3 className="text-sm font-semibold text-slate-100 mb-4">Completed Sprints</h3>
                {allSprints.length === 0 ? (
                  <p className="text-sm text-slate-500">No completed sprints yet.</p>
                ) : (
                  <div className="space-y-2">
                    {allSprints.map((s) => {
                      const sTasks = tasks.filter(t => t.sprintId === s.id);
                      const sCompleted = sTasks.filter(t => t.column === "deployed").length;
                      const sProgress = sTasks.length > 0 ? Math.round((sCompleted / sTasks.length) * 100) : 0;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSprint(selectedSprint?.id === s.id ? null : s)}
                          className={`p-4 rounded-lg border cursor-pointer transition ${
                            selectedSprint?.id === s.id
                              ? "bg-fuchsia-500/10 border-fuchsia-500/30"
                              : "bg-slate-950/40 border-slate-800/60 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-slate-200 truncate">{s.name}</h4>
                              {s.goal && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{s.goal}</p>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-xs">
                              <span className="text-slate-400">{sProgress}%</span>
                              {s.completedAt && (
                                <span className="text-[10px] text-slate-500">
                                  {new Date(s.completedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected sprint detail */}
              {selectedSprint && (
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-100">{selectedSprint.name}</h3>
                    <button onClick={() => setSelectedSprint(null)} className="text-xs text-slate-500 hover:text-slate-300 transition">Dismiss</button>
                  </div>

                  {selectedSprint.goal && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Goal</div>
                      <p className="text-sm text-slate-200">{selectedSprint.goal}</p>
                    </div>
                  )}

                  {selectedSprint.deliverables.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Deliverables</div>
                      <div className="space-y-1.5">
                        {selectedSprint.deliverables.map((d) => (
                          <div key={d.id} className="flex items-center gap-2 text-sm">
                            {d.done
                              ? <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                              : <Circle className="size-4 text-slate-600 shrink-0" />}
                            <span className={d.done ? "text-slate-400 line-through" : "text-slate-200"}>{d.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tasks.filter(t => t.sprintId === selectedSprint.id).length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Tasks</div>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                        {tasks.filter(t => t.sprintId === selectedSprint.id).map((t) => {
                          const colMeta = COLUMN_META[t.column];
                          return (
                            <div key={t.id} className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/40 text-xs">
                              <span className="text-slate-300 truncate font-medium max-w-[260px]">{t.title}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase flex items-center gap-1 ${colMeta.accent}`}>
                                <span className={`size-1 rounded-full ${colMeta.dot}`} />
                                {colMeta.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ── Stats Row ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Task Progress */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-col gap-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Tasks</div>
                  <div className="text-2xl font-bold text-slate-100 tabular-nums">{completedTasks}/{totalTasks}</div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500">{progressPercent}% complete</div>
                </div>

                {/* Deliverables */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-col gap-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Deliverables</div>
                  <div className="text-2xl font-bold text-slate-100 tabular-nums">{completedDeliverables}/{totalDeliverables}</div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                      style={{ width: totalDeliverables > 0 ? `${Math.round((completedDeliverables / totalDeliverables) * 100)}%` : "0%" }}
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    {totalDeliverables > 0 ? `${Math.round((completedDeliverables / totalDeliverables) * 100)}% done` : "No deliverables"}
                  </div>
                </div>

                {/* Days Remaining */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-col gap-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Time Left</div>
                  <div className="text-2xl font-bold text-slate-100 tabular-nums">{daysRemaining}d</div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round(((sprint.durationDays - daysRemaining) / sprint.durationDays) * 100))}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500">of {sprint.durationDays} day{sprint.durationDays !== 1 ? "s" : ""}</div>
                </div>

                {/* Past Sprints */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-col gap-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Past Sprints</div>
                  <div className="text-2xl font-bold text-slate-100 tabular-nums">{allSprints.length}</div>
                  <div className="text-xs text-slate-500">
                    {allSprints.length === 0 ? "First sprint" : `${allSprints.length} completed`}
                  </div>
                  {allSprints.length > 0 && (
                    <button
                      onClick={() => setShowHistory(true)}
                      className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 text-left transition"
                    >
                      View history →
                    </button>
                  )}
                </div>
              </div>

              {/* ── Sprint Goal ── */}
              {sprint.goal && (
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Sprint Goal</div>
                  <p className="text-sm text-slate-200 leading-relaxed">{sprint.goal}</p>
                </div>
              )}

              {/* ── Main Content: Deliverables + Tasks ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Deliverables Checklist */}
                {totalDeliverables > 0 && (
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
                    <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-fuchsia-400" /> Deliverables
                    </h3>
                    <div className="space-y-2">
                      {sprint.deliverables.map((d) => (
                        <div key={d.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-800/60 bg-slate-950/30 text-sm">
                          {d.done
                            ? <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                            : <Circle className="size-4 text-slate-600 shrink-0" />}
                          <span className={d.done ? "text-slate-400 line-through" : "text-slate-200"}>{d.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Board Tasks */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <KanbanSquare className="size-4 text-fuchsia-400" /> Board Tasks
                    </h3>
                    <Link
                      to="/board"
                      className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 inline-flex items-center gap-1 transition"
                    >
                      Open Board <ArrowUpRight className="size-3" />
                    </Link>
                  </div>
                  {sprintTasks.length === 0 ? (
                    <p className="text-xs text-slate-500">No tasks assigned to this sprint yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                      {sprintTasks.map((t) => {
                        const colMeta = COLUMN_META[t.column];
                        return (
                          <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/40 text-xs">
                            <span className="text-slate-300 truncate font-medium max-w-[240px]" title={t.title}>{t.title}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase flex items-center gap-1 shrink-0 ${colMeta.accent}`}>
                              <span className={`size-1 rounded-full ${colMeta.dot}`} />
                              {colMeta.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </>
          )}

        </div>
      </div>
    </AppShell>
  );
}
