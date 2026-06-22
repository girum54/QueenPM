import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  DollarSign, Target, Calendar, Crown,
  Briefcase, Activity, CheckCircle2, AlertTriangle, ArrowUpRight
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/queen-store";
import { dashboardApi, type DashboardStats } from "@/lib/api/queen.api";

export const Route = createFileRoute("/stakeholder")({
  head: () => ({
    meta: [
      { title: "Stakeholder View — Queen PM" },
      { name: "description", content: "Executive overview of project health, budget, and OKRs." },
    ],
  }),
  component: StakeholderDashboardPage,
});

function StakeholderDashboardPage() {
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

  const completionRate = metrics.total > 0 
    ? Math.round((metrics.byCol.deployed / metrics.total) * 100) 
    : 0;

  // Mocked stakeholder metrics
  const budgetSpent = 142500;
  const budgetTotal = 200000;
  const budgetPct = (budgetSpent / budgetTotal) * 100;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto font-sans">
        <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="size-3.5 text-slate-400" /> Executive Overview
                </span>
                <span className="text-slate-700">/</span>
                <span className="text-fuchsia-400 font-medium">{activeProject?.name}</span>
              </div>
              <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">
                Project Health & ROI
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                High-level stakeholder metrics, budget utilization, and strategic alignment.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30 text-sm font-medium">
                <CheckCircle2 className="size-4" /> On Track
              </span>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="size-8 rounded-md grid place-items-center ring-1 mb-4 bg-emerald-500/10 ring-emerald-500/30">
                <DollarSign className="size-4 text-emerald-300" />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Budget Utilization</div>
              <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">
                ${(budgetSpent / 1000).toFixed(1)}k <span className="text-sm text-slate-500">/ ${(budgetTotal / 1000).toFixed(0)}k</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className={`h-full ${budgetPct > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="size-8 rounded-md grid place-items-center ring-1 mb-4 bg-fuchsia-500/10 ring-fuchsia-500/30">
                <Target className="size-4 text-fuchsia-300" />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Milestone Completion</div>
              <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">{completionRate}%</div>
              <div className="text-[11px] text-slate-500 mt-1">Based on tracked scope</div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="size-8 rounded-md grid place-items-center ring-1 mb-4 bg-sky-500/10 ring-sky-500/30">
                <Calendar className="size-4 text-sky-300" />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Time to Market</div>
              <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">Q3 '26</div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <ArrowUpRight className="size-3 text-emerald-400" /> 2 weeks ahead of schedule
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="size-8 rounded-md grid place-items-center ring-1 mb-4 bg-amber-500/10 ring-amber-500/30">
                <AlertTriangle className="size-4 text-amber-300" />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Risk Level</div>
              <div className="text-2xl font-semibold text-slate-50 mt-1 tabular-nums">Low</div>
              <div className="text-[11px] text-slate-500 mt-1">Automated mitigation active</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Strategic Alignment / OKRs */}
            <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-4">
                <Crown className="size-4 text-fuchsia-400" /> Strategic OKRs
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-slate-200">1. Increase Platform Reliability to 99.99%</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Core infrastructure stabilization and automated failovers.</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">85% Achieved</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[85%]" />
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-slate-200">2. Launch Next-Gen Payment Gateway</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Integrate multiple providers to reduce transaction fees by 15%.</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-fuchsia-500/10 text-fuchsia-300 text-[10px] font-bold">40% Achieved</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-fuchsia-500 w-[40%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Resource Allocation */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-4">
                <Activity className="size-4 text-fuchsia-400" /> Resource Allocation
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300">Engineering</span>
                    <span className="text-slate-500">65%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-sky-500 w-[65%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300">Design & UX</span>
                    <span className="text-slate-500">20%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-fuchsia-500 w-[20%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300">QA & Ops</span>
                    <span className="text-slate-500">15%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[15%]" />
                  </div>
                </div>
                <div className="pt-4 mt-2 border-t border-slate-800/60">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    AI automation is currently covering an estimated <span className="text-fuchsia-400 font-semibold">{metrics.autoRatio}%</span> of the project management overhead, saving approximately 18 hours/week in manual reporting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
