import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Activity, TrendingUp, Bot, Users, ArrowRight, Sparkles, Crown,
  KanbanSquare, MessageSquare, Timer, CheckCircle2, History, Circle, Settings,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore, COLUMN_META, type ColumnId } from "@/lib/queen-store";
import { useAuth } from "@/lib/auth-store";
import { dashboardApi, sprintsApi, type DashboardStats } from "@/lib/api/queen.api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Queen PM" },
      { name: "description", content: "Stakeholder command center: velocity, AI automation ratio, sprint health." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { activeProjectId, activeSprintId, projectTabs, tasks } = useStore();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSprints, setAllSprints] = useState<any[]>([]);
  const [activeSprint, setActiveSprint] = useState<any | null>(null);

  const activeProject = projectTabs.find((p) => p.id === activeProjectId) || projectTabs[0];

  useEffect(() => {
    if (!activeProjectId) return;
    setLoading(true);
    dashboardApi
      .getStats(activeProjectId, activeSprintId ?? undefined)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeProjectId, activeSprintId]);

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
        const active = formattedSprints.find(s => s.isActive) ?? null;
        setActiveSprint(active);
        setAllSprints(formattedSprints.filter(s => !s.isActive));
      } catch (e) {
        console.error("Failed to load sprint history:", e);
      }
    }
    fetchAllSprints();
  }, [activeProjectId]);

  // Fallback empty metrics while loading
  const metrics: DashboardStats = stats ?? {
    total: 0,
    byCol: { new: 0, active: 0, staging: 0, deployed: 0 },
    avgCompletionDays: 0,
    aiCount: 0, slashCount: 0, uiCount: 0,
    autoRatio: 0,
    velocity: [0, 0, 0, 0, 0, 0, 0, 0],
    movingAvg: 0,
    perUser: [],
    recentTasks: [],
  };

  const gateways = [
    { name: "Aurora Labs", desc: "12 members · Pro", grad: "from-fuchsia-500 to-violet-600" },
    { name: "Side Project", desc: "3 members · Free", grad: "from-sky-500 to-cyan-600" },
    { name: "Personal", desc: "Solo", grad: "from-emerald-500 to-teal-600" },
  ];

  return (
    <AppShell>
      <div className="h-full overflow-y-auto font-sans">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-6">
          {/* Hero */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  📁 Project: <span className="text-slate-300 font-semibold">{activeProject?.name}</span>
                </span>
                <span className="text-slate-700">/</span>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="size-3.5 text-fuchsia-400" /> Command center
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 tracking-tight">
                Hello {user?.name ?? "there"}.
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {metrics.byCol.active} tasks active · {metrics.byCol.staging} in staging · {metrics.byCol.deployed} deployed this cycle
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Link
                to="/board"
                className="inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-medium text-slate-100 transition shrink-0 flex-1 sm:flex-none"
              >
                <KanbanSquare className="size-4" /> Open Board
              </Link>
              <Link
                to="/channels"
                className="inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-md bg-fuchsia-500/15 ring-1 ring-fuchsia-500/30 hover:bg-fuchsia-500/25 text-xs sm:text-sm font-medium text-fuchsia-200 transition shrink-0 flex-1 sm:flex-none"
              >
                <MessageSquare className="size-4" /> Jump to Channels
              </Link>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <VelocityCard velocity={metrics.velocity} movingAvg={metrics.movingAvg} />
            <KpiCard
              icon={<Timer className="size-4 text-sky-300" />}
              label="Avg Completion"
              value={`${metrics.avgCompletionDays.toFixed(1)}d`}
              hint="Across deployed tasks"
              accent="bg-sky-500/10 ring-sky-500/30"
            />
            <AutomationDonut ai={metrics.aiCount} slash={metrics.slashCount} ui={metrics.uiCount} ratio={metrics.autoRatio} />
            <CompletedSprintsCard sprints={allSprints} activeSprint={activeSprint} tasks={tasks} />
          </div>

          {/* Active Sprint Panel */}
          {activeSprint ? (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-100">{activeSprint.name}</h3>
                    {activeSprint.style && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30 uppercase tracking-wide">
                        {activeSprint.style}
                      </span>
                    )}
                  </div>
                  {activeSprint.goal && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{activeSprint.goal}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/sprint"
                    className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-200 transition"
                  >
                    View sprint <ArrowRight className="size-3" />
                  </Link>
                  <Link
                    to="/sprint-config"
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-300 transition"
                  >
                    <Settings className="size-3" /> Manage
                  </Link>
                </div>
              </div>

              {activeSprint.deliverables.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {activeSprint.deliverables.map((d: any) => (
                    <div
                      key={d.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs transition ${
                        d.done
                          ? "bg-slate-950/60 border-slate-800/40 text-slate-500"
                          : "bg-slate-950/20 border-slate-800/80 text-slate-200"
                      }`}
                    >
                      {d.done
                        ? <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                        : <Circle className="size-3.5 text-slate-600 shrink-0" />}
                      <span className={`truncate ${d.done ? "line-through" : ""}`}>{d.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No deliverables for this sprint.</p>
              )}

              {/* Progress bar */}
              {activeSprint.deliverables.length > 0 && (() => {
                const done = activeSprint.deliverables.filter((d: any) => d.done).length;
                const total = activeSprint.deliverables.length;
                const pct = Math.round((done / total) * 100);
                return (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{done}/{total} deliverables complete</span>
                      <span className="font-semibold text-fuchsia-400">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800/60 bg-slate-900/20 p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-400">No active sprint</p>
                <p className="text-xs text-slate-600 mt-0.5">Start a sprint to track deliverables and progress here.</p>
              </div>
              <Link
                to="/sprint-config"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-fuchsia-500/10 ring-1 ring-fuchsia-500/30 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-500/20 transition shrink-0"
              >
                New Sprint <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}

          {/* Sprint health + Efficiency */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Activity className="size-4 text-fuchsia-400" /> Active Sprint Health
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Pipeline distribution across {metrics.total} tracked tasks</p>
                </div>
                <Link to="/board" className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1">
                  View board <ArrowRight className="size-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {(["new", "active", "staging", "deployed"] as ColumnId[]).map((col) => {
                  const count = metrics.byCol[col];
                  const pct = metrics.total === 0 ? 0 : (count / metrics.total) * 100;
                  const meta = COLUMN_META[col];
                  return (
                    <div key={col}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-2 text-slate-300">
                          <span className={`size-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        <span className="text-slate-500 tabular-nums">
                          {count} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                        <div
                          className={`h-full ${meta.dot} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-4">
                <Users className="size-4 text-fuchsia-400" /> Efficiency Matrix
              </h3>
              <div className="space-y-2.5">
                {metrics.perUser.map((r) => (
                  <div key={r.userId} className="flex items-center gap-2.5">
                    <div className={`size-7 rounded-md ${r.color} grid place-items-center text-[11px] font-bold text-white shrink-0`}>
                      {r.isAi ? <Crown className="size-3.5" /> : r.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-200 truncate">{r.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {r.done}/{r.total} done · {r.avgDays ? `${r.avgDays.toFixed(1)}d avg` : "—"}
                      </div>
                    </div>
                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500"
                        style={{ width: `${r.total === 0 ? 0 : (r.done / r.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({
  icon, label, value, hint, accent,
}: { icon: React.ReactNode; label: string; value: string; hint: string; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className={`size-8 rounded-md grid place-items-center ring-1 mb-4 ${accent}`}>{icon}</div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{hint}</div>
    </div>
  );
}

function VelocityCard({ velocity, movingAvg }: { velocity: number[]; movingAvg: number }) {
  const max = Math.max(...velocity, 1);
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="size-8 rounded-md grid place-items-center ring-1 mb-4 bg-fuchsia-500/10 ring-fuchsia-500/30">
        <TrendingUp className="size-4 text-fuchsia-300" />
      </div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Completion pace</div>
      <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">{movingAvg.toFixed(1)}</div>
      <div className="text-[11px] text-slate-500 mt-1">Completed tasks / week</div>
      <div className="mt-3 flex items-end gap-1 h-10">
        {velocity.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-fuchsia-500/40 to-fuchsia-400"
            style={{ height: `${(v / max) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function AutomationDonut({ ai, slash, ui, ratio }: { ai: number; slash: number; ui: number; ratio: number }) {
  const total = ai + slash + ui || 1;
  const aiPct = (ai / total) * 100;
  const slashPct = (slash / total) * 100;
  // donut via conic-gradient
  const grad = `conic-gradient(
    #d946ef 0% ${aiPct}%,
    #8b5cf6 ${aiPct}% ${aiPct + slashPct}%,
    #334155 ${aiPct + slashPct}% 100%
  )`;
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="size-8 rounded-md grid place-items-center ring-1 mb-4 bg-fuchsia-500/10 ring-fuchsia-500/30">
        <Bot className="size-4 text-fuchsia-300" />
      </div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">AI Automation Ratio</div>
      <div className="flex items-center gap-4 mt-2">
        <div className="relative size-16 rounded-full" style={{ background: grad }}>
          <div className="absolute inset-1.5 rounded-full bg-slate-900 grid place-items-center">
            <span className="text-sm font-semibold text-slate-100 tabular-nums">{ratio}%</span>
          </div>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="size-2 rounded-sm bg-fuchsia-500" /> AI · {ai}
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="size-2 rounded-sm bg-violet-500" /> Slash · {slash}
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="size-2 rounded-sm bg-slate-600" /> Manual · {ui}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletedSprintsCard({ sprints, activeSprint, tasks }: { sprints: any[]; activeSprint: any | null; tasks: any[] }) {
  const totalSprints = sprints.length + (activeSprint ? 1 : 0);
  const activeCount = activeSprint ? 1 : 0;
  const completedCount = sprints.length;
  
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="size-8 rounded-md grid place-items-center ring-1 mb-4 bg-amber-500/10 ring-amber-500/30">
        <History className="size-4 text-amber-300" />
      </div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Sprints</div>
      <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">{totalSprints}</div>
      <div className="text-[11px] text-slate-500 mt-1">
        {activeCount} active, {completedCount} completed
      </div>
      
      {/* Current sprint compact display */}
      {activeSprint && (() => {
        const sprintTasks = tasks.filter(t => t.sprintId === activeSprint.id);
        const completed = sprintTasks.filter(t => t.column === "deployed").length;
        const total = sprintTasks.length;
        if (total === 0) return null;
        return (
          <div className="mt-3 pt-3 border-t border-slate-800/50">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-fuchsia-300 font-medium truncate max-w-[100px]">{activeSprint.name}</span>
              <span className="text-slate-400">{completed}/{total} tasks</span>
            </div>
          </div>
        );
      })()}
      
      {/* Completed sprints list */}
      <div className="mt-3 space-y-1.5">
        {sprints.length > 0 && (
          <div className="space-y-1">
            {sprints.slice(0, 2).map((s) => {
              const sTasks = tasks.filter(t => t.sprintId === s.id);
              const sCompleted = sTasks.filter(t => t.column === "deployed").length;
              const sProgress = sTasks.length > 0 ? Math.round((sCompleted / sTasks.length) * 100) : 0;
              return (
                <div key={s.id} className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 truncate max-w-[80px]">{s.name}</span>
                  <span className="text-slate-300 font-medium">{sProgress}%</span>
                </div>
              );
            })}
            {sprints.length > 2 && (
              <div className="text-[10px] text-slate-500 text-center">
                +{sprints.length - 2} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
