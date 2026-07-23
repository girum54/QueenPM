import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Zap, Calendar, Clock, Target, ArrowRight, KanbanSquare,
  AlertCircle, CheckCircle2, TrendingUp, ShieldCheck, Settings,
  Sparkles, Activity, ArrowUpRight, History
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore, COLUMN_META } from "@/lib/queen-store";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/sprint")({
  head: () => ({
    meta: [
      { title: "Active Sprint — Queen PM" },
      { name: "description", content: "Active sprint dashboard tracking target deliverables, velocity and health." },
    ],
  }),
  component: SprintPage,
});

import { useEffect } from "react";
import { sprintsApi } from "@/lib/api/queen.api";

interface Sprint {
  id: string;
  name: string;
  style: string;
  durationWeeks: number;
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
            durationWeeks: activeSprint.durationWeeks,
            startDate: activeSprint.startDate,
            goal: activeSprint.goal || "",
            deliverables: (activeSprint.deliverables || []).map(d => ({ id: d.id, text: d.text, done: d.done })),
            isActive: activeSprint.isActive
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
        const formattedSprints = await Promise.all(
          sprints.map(async (s) => {
            const deliverables = await sprintsApi.getDeliverables(s.id);
            return {
              id: s.id,
              name: s.name,
              style: s.style || "",
              durationWeeks: s.durationWeeks,
              startDate: s.startDate,
              goal: s.goal || "",
              deliverables: deliverables.map(d => ({ id: d.id, text: d.text, done: d.done })),
              isActive: s.isActive,
              completedAt: s.completedAt
            };
          })
        );
        setAllSprints(formattedSprints.filter(s => !s.isActive));
      } catch (e) {
        console.error("Failed to load sprint history:", e);
      }
    }
    fetchAllSprints();
  }, [activeProjectId]);

  // Filter tasks that are actively linked to this sprint
  const sprintTasks = tasks.filter(t => t.sprintId === sprint?.id);

  // Stats calculation
  const completedTasks = sprintTasks.filter(t => t.column === "deployed").length;
  const totalTasks = sprintTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Velocity trailing average mock
  const velocityValues = [32, 45, 38, 48, 52, 49];
  const maxVelocity = Math.max(...velocityValues);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center bg-slate-950">
          <div className="text-slate-400 text-sm animate-pulse">Analyzing active sprint metrics...</div>
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
              ? "There is no active sprint initialized for this project. Sprints can be started by project managers or developers."
              : "There is no active sprint initialized for this project. Start by configuring specifications and deliverables."}
          </p>
          {!isStakeholder && (
            <Link
              to="/sprint-config"
              className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-md bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-xs font-semibold text-white transition shadow-lg shadow-fuchsia-500/20"
            >
              Configure & Start Sprint <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </AppShell>
    );
  }

  // Calculate days remaining
  const start = new Date(sprint.startDate).getTime();
  const end = start + sprint.durationWeeks * 7 * 24 * 60 * 60 * 1000;
  const remainingMs = end - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const endDateStr = new Date(end).toLocaleDateString([], { month: "short", day: "numeric" });
  const startDateStr = new Date(start).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-6">
          
          {/* Header & Meta */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                <Activity className="size-3.5 text-fuchsia-400" /> Project Style Cycle
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">
                  {selectedSprint ? selectedSprint.name : sprint.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30">
                  {selectedSprint ? (selectedSprint.style || "Agile") : (sprint.style || "Agile")}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-fuchsia-400" />
                  <span className="text-slate-200 font-medium">Time Remaining:</span> {daysRemaining} days left (Ends {endDateStr})
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4 text-slate-500" />
                  <span>Timeline:</span> {startDateStr} – {endDateStr}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  setSelectedSprint(null);
                }}
                className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-md text-xs font-medium border transition ${
                  showHistory
                    ? "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30"
                    : "bg-slate-800 text-slate-300 border-slate-800 hover:bg-slate-700"
                }`}
              >
                <History className="size-3.5" /> {showHistory ? "View Active Sprint" : "Sprint History"}
              </button>
              {!isStakeholder && (
                <Link
                  to="/sprint-config"
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-800 hover:border-slate-700 transition"
                >
                  <Settings className="size-3.5" /> Configure Model
                </Link>
              )}
              <Link
                to="/board"
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-xs font-semibold text-white shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 transition"
              >
                <KanbanSquare className="size-3.5" /> Go to Sprint Board <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Sprint History View */}
          {showHistory ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-6">
                <h3 className="text-sm font-semibold text-slate-100 mb-4">Completed Sprints</h3>
                {allSprints.length === 0 ? (
                  <p className="text-sm text-slate-500">No completed sprints found.</p>
                ) : (
                  <div className="space-y-3">
                    {allSprints.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSprint(s)}
                        className={`p-4 rounded-lg border cursor-pointer transition ${
                          selectedSprint?.id === s.id
                            ? "bg-fuchsia-500/10 border-fuchsia-500/30"
                            : "bg-slate-950/40 border-slate-800/60 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-slate-200">{s.name}</h4>
                          {s.completedAt && (
                            <span className="text-[10px] text-slate-500">
                              Completed {new Date(s.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{s.goal || "No goal defined"}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                          <span>{s.durationWeeks} week{ s.durationWeeks !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>{s.deliverables.length} deliverables</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedSprint && (
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-100">Sprint Details: {selectedSprint.name}</h3>
                    <button
                      onClick={() => setSelectedSprint(null)}
                      className="text-xs text-slate-400 hover:text-slate-200 transition"
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Goal</label>
                      <p className="text-sm text-slate-200 mt-1">{selectedSprint.goal || "No goal defined"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Deliverables</label>
                      <div className="mt-2 space-y-2">
                        {selectedSprint.deliverables.map((d) => (
                          <div key={d.id} className="flex items-center gap-2 text-sm">
                            <div className={`size-4 rounded border ${d.done ? "bg-emerald-500/20 border-emerald-500/50" : "border-slate-700"}`}>
                              {d.done && <CheckCircle2 className="size-3 text-emerald-400" />}
                            </div>
                            <span className={d.done ? "text-slate-300 line-through" : "text-slate-200"}>{d.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Sprint Tasks</label>
                      <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {tasks.filter(t => t.sprintId === selectedSprint.id).length === 0 ? (
                          <p className="text-xs text-slate-500">No tasks in this sprint</p>
                        ) : (
                          tasks.filter(t => t.sprintId === selectedSprint.id).map((t) => {
                            const colMeta = COLUMN_META[t.column];
                            return (
                              <div key={t.id} className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/40 text-xs">
                                <span className="text-slate-300 truncate font-medium max-w-[250px]" title={t.title}>
                                  {t.title}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider flex items-center gap-1 ${colMeta.accent}`}>
                                  <span className={`size-1 rounded-full ${colMeta.dot}`} />
                                  {colMeta.label}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
          {/* Top Section: Board Integration & Deliverable Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Deliverable Widget */}
            <div className="lg:col-span-2 rounded-xl border-2 border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/5 via-slate-900/60 to-violet-500/5 p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center shadow-md">
                      <Target className="size-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">Target Deliverable</h3>
                      <p className="text-[10px] text-slate-500">Core commitment for this sprint cycle</p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30`}>
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    On Track to Ship
                  </span>
                </div>

                <p className="text-slate-200 text-sm leading-relaxed font-medium pl-1 bg-slate-950/20 p-3 rounded-lg border border-slate-800/40">
                  "{sprint.goal || "No goals defined."}"
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-fuchsia-400" />
                  Verified by Queen PM Autonomous Quality Assurance
                </span>
                <span className="font-mono text-[10px] bg-slate-800/40 px-2 py-0.5 rounded text-slate-400">
                  RE-Q3-04
                </span>
              </div>
            </div>

            {/* Linked Board Integration Panel */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <KanbanSquare className="size-4 text-fuchsia-400" /> Board Integration
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">Linked scope</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  This sprint tracks {totalTasks} tasks on the main Board. Changes to statuses sync in real-time.
                </p>

                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {sprintTasks.map((t) => {
                    const colMeta = COLUMN_META[t.column];
                    return (
                      <div key={t.id} className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/40 text-xs">
                        <span className="text-slate-300 truncate font-medium max-w-[170px]" title={t.title}>
                          {t.title}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider flex items-center gap-1 ${colMeta.accent}`}>
                          <span className={`size-1 rounded-full ${colMeta.dot}`} />
                          {colMeta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Link
                to="/board"
                className="mt-4 w-full h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center justify-center gap-1.5 transition border border-slate-800"
              >
                Go to Sprint Board <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Sprint Analytics Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Progress Percentage & Velocity */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="size-8 rounded-md bg-fuchsia-500/10 ring-1 ring-fuchsia-500/30 grid place-items-center">
                    <TrendingUp className="size-4 text-fuchsia-300" />
                  </div>
                  <span className="text-2xl font-bold text-slate-100 tabular-nums">{progressPercent}%</span>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Sprint Velocity / Progress</div>
                <p className="text-xs text-slate-400 mt-1">
                  {completedTasks} of {totalTasks} tasks deployed to production environment.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Start (June 7)</span>
                  <span>Target (June 21)</span>
                </div>
              </div>
            </div>

            {/* Historical Sprint Summary */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="size-8 rounded-md bg-amber-500/10 ring-1 ring-amber-500/30 grid place-items-center">
                    <History className="size-4 text-amber-300" />
                  </div>
                  <span className="text-2xl font-bold text-slate-100 tabular-nums">{allSprints.length}</span>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Completed Sprints</div>
                <p className="text-xs text-slate-400 mt-1">
                  {allSprints.length > 0 ? `${allSprints.length} sprint${allSprints.length !== 1 ? 's' : ''} completed in this project` : "No completed sprints yet"}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {allSprints.length > 0 && (
                  <div className="space-y-1.5">
                    {allSprints.slice(0, 3).map((s) => {
                      const sTasks = tasks.filter(t => t.sprintId === s.id);
                      const sCompleted = sTasks.filter(t => t.column === "deployed").length;
                      const sProgress = sTasks.length > 0 ? Math.round((sCompleted / sTasks.length) * 100) : 0;
                      return (
                        <div key={s.id} className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 truncate max-w-[100px]">{s.name}</span>
                          <span className="text-slate-300 font-medium">{sProgress}%</span>
                        </div>
                      );
                    })}
                    {allSprints.length > 3 && (
                      <div className="text-[10px] text-slate-500 text-center">
                        +{allSprints.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Task Burn-down / Completion Estimate */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="size-8 rounded-md bg-sky-500/10 ring-1 ring-sky-500/30 grid place-items-center">
                    <Clock className="size-4 text-sky-300" />
                  </div>
                  <span className="text-2xl font-bold text-slate-100 tabular-nums">2.4 days</span>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Burn-down Estimate</div>
                <p className="text-xs text-slate-400 mt-1">
                  Estimated time to complete remaining {totalTasks - completedTasks} scope items at current team pace.
                </p>
              </div>

              {/* Sparkline-like burn-down mock */}
              <div className="mt-4 flex items-end gap-1.5 h-12">
                {velocityValues.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex-1 rounded-sm bg-sky-500/30 transition-colors"
                    style={{ height: `${(v / maxVelocity) * 100}%` }}
                    title={`Day ${idx + 1}: ${v} remaining`}
                  />
                ))}
              </div>
            </div>

            {/* Deliverable Health Status */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="size-8 rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/30 grid place-items-center">
                    <CheckCircle2 className="size-4 text-emerald-300" />
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">Excellent (94%)</span>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Deliverable Health Status</div>
                <p className="text-xs text-slate-400 mt-1">
                  AI Risk assessment reports low likelihood of delays. Pipeline automation is at peak ratio.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Quality Gate approval:</span>
                  <span className="text-emerald-400 font-medium">Passed</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Blocking Incidents:</span>
                  <span className="text-slate-300 font-medium">0 active</span>
                </div>
              </div>
            </div>

          </div>

          {/* Under the hood QA and logs panel */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sparkles className="size-4 text-fuchsia-400" /> Queen PM Cycle Diagnostics
                </h3>
                <p className="text-xs text-slate-500">Predictive timeline simulations and continuous optimization insights</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                Live Analysis
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-2">
                <div className="text-xs font-semibold text-fuchsia-300 flex items-center gap-1.5">
                  <Zap className="size-3.5" /> Optimal Resource Allocation
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Queen PM advises shifting <span className="text-slate-200">Daniel Park</span> to "Fix race condition in checkout webhook" to maximize the completion probability of the Payments v2 deliverable.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-2">
                <div className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                  <AlertCircle className="size-3.5" /> Automated Branch Health
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No merge conflicts detected across 4 active pull requests tied to this sprint. Continuous deployment test suites passing.
                </p>
              </div>
            </div>
          </div>
          </>
          )}

        </div>
      </div>
    </AppShell>
  );
}
