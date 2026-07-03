import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Activity, TrendingUp, Bot, Users, ArrowRight, Sparkles, Crown,
  KanbanSquare, MessageSquare, Gauge, Timer, CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore, COLUMN_META, type ColumnId } from "@/lib/queen-store";
import { dashboardApi, type DashboardStats } from "@/lib/api/queen.api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Queen PM" },
      { name: "description", content: "Executive command center: velocity, AI automation ratio, sprint health." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { activeProjectId, projectTabs } = useStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const activeProject = projectTabs.find((p) => p.id === activeProjectId) || projectTabs[0];

  useEffect(() => {
    if (!activeProjectId) return;
    setLoading(true);
    dashboardApi
      .getStats(activeProjectId)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
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
        <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-6">
          {/* Hero */}
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  📁 Project: <span className="text-slate-300 font-semibold">{activeProject?.name}</span>
                </span>
                <span className="text-slate-700">/</span>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="size-3.5 text-fuchsia-400" /> Command center
                </span>
              </div>
              <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">
                Welcome to QueenPM. Your dashboard is ready.
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {metrics.byCol.active} tasks active · {metrics.byCol.staging} in staging · {metrics.byCol.deployed} deployed this cycle
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/board"
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-100 transition"
              >
                <KanbanSquare className="size-4" /> Open Board
              </Link>
              <Link
                to="/channels"
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-fuchsia-500/15 ring-1 ring-fuchsia-500/30 hover:bg-fuchsia-500/25 text-sm font-medium text-fuchsia-200 transition"
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
            <KpiCard
              icon={<CheckCircle2 className="size-4 text-emerald-300" />}
              label="Throughput"
              value={`${metrics.byCol.deployed}`}
              hint="Deployed all-time"
              accent="bg-emerald-500/10 ring-emerald-500/30"
            />
          </div>

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
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Velocity</div>
      <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">{movingAvg.toFixed(1)}</div>
      <div className="text-[11px] text-slate-500 mt-1">Moving avg / week</div>
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
