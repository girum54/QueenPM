import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, BarChart3, TrendingUp, Users, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { StakeholderShell } from "@/components/StakeholderShell";
import { dashboardApi, projectsApi, type ApiProject, type DashboardStats } from "@/lib/api/queen.api";
import { useStore } from "@/lib/queen-store";

export const Route = createFileRoute("/stakeholder-reports")({
  head: () => ({
    meta: [{ title: "Team Performance — Queen PM Stakeholder" }],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { setActiveProjectId } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const handleProjectClick = (id: string) => {
    setActiveProjectId(id);
    navigate({ to: "/" });
  };
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, DashboardStats>>({});
  const [globalStats, setGlobalStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const projs = await projectsApi.getAll();
      setProjects(projs);
      const smap: Record<string, DashboardStats> = {};
      for (const p of projs) {
        try { smap[p.id] = await dashboardApi.getStats(p.id); } catch { }
      }
      setStatsMap(smap);
      try { setGlobalStats(await dashboardApi.getStats()); } catch { }
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  if (loading) {
    return (
      <StakeholderShell>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="size-8 text-amber-400 animate-spin" />
        </div>
      </StakeholderShell>
    );
  }

  const totalTasks = projects.reduce((s, p) => s + (statsMap[p.id]?.total || 0), 0);
  const totalDeployed = projects.reduce((s, p) => s + (statsMap[p.id]?.byCol?.deployed || 0), 0);
  const totalActive = projects.reduce((s, p) => s + (statsMap[p.id]?.byCol?.active || 0), 0);
  const overallCompletion = totalTasks > 0 ? Math.round((totalDeployed / totalTasks) * 100) : 0;
  const BAR_COLORS = ["bg-fuchsia-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-indigo-500"];

  return (
    <StakeholderShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-8 space-y-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <BarChart3 className="size-3.5 text-amber-400" />
              <span className="text-amber-400 font-medium tracking-wide">REPORTS & COMPLETION PACE</span>
            </div>
            <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">Team Performance</h1>
            <p className="text-sm text-slate-400 mt-1">Cross-project completion rates and weekly throughput from live data.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="size-8 rounded-lg grid place-items-center mb-3 bg-fuchsia-500/10 ring-1 ring-fuchsia-500/30">
                <BarChart3 className="size-4 text-fuchsia-300" />
              </div>
              <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Total Tasks</div>
              <div className="text-2xl font-bold text-slate-50 mt-1">{totalTasks}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Across all projects</div>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="size-8 rounded-lg grid place-items-center mb-3 bg-emerald-500/10 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="size-4 text-emerald-300" />
              </div>
              <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Shipped</div>
              <div className="text-2xl font-bold text-slate-50 mt-1">{totalDeployed}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{overallCompletion}% completion rate</div>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="size-8 rounded-lg grid place-items-center mb-3 bg-sky-500/10 ring-1 ring-sky-500/30">
                <Clock className="size-4 text-sky-300" />
              </div>
              <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">In Progress</div>
              <div className="text-2xl font-bold text-slate-50 mt-1">{totalActive}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Active tasks right now</div>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="size-8 rounded-lg grid place-items-center mb-3 bg-amber-500/10 ring-1 ring-amber-500/30">
                <TrendingUp className="size-4 text-amber-300" />
              </div>
              <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Average completion pace</div>
              <div className="text-2xl font-bold text-slate-50 mt-1">{(globalStats?.movingAvg ?? 0).toFixed(1)}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Completed tasks / week</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-5">
                <BarChart3 className="size-4 text-fuchsia-400" /> Task Breakdown by Project
              </h3>
              <div className="space-y-4">
                {projects.map((p, idx) => {
                  const stats = statsMap[p.id];
                  const total = stats?.total || 0;
                  const deployed = stats?.byCol?.deployed || 0;
                  const pct = total > 0 ? Math.round((deployed / total) * 100) : 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleProjectClick(p.id)}
                      className="cursor-pointer group/item"
                    >
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-300 font-medium group-hover/item:text-fuchsia-400 group-hover/item:underline flex items-center gap-1.5 transition-colors">
                          {p.name}
                          <ExternalLink className="size-3 text-slate-650 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                        </span>
                        <span className="text-slate-400">{deployed}/{total} shipped ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                        <div className={`h-full ${BAR_COLORS[idx % BAR_COLORS.length]} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-5">
                <TrendingUp className="size-4 text-sky-400" /> Weekly throughput by project
              </h3>
              <div className="space-y-4">
                {projects.map((p, idx) => {
                  const velocity = statsMap[p.id]?.movingAvg || 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleProjectClick(p.id)}
                      className="cursor-pointer group/item"
                    >
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-300 font-medium group-hover/item:text-sky-400 group-hover/item:underline flex items-center gap-1.5 transition-colors">
                          {p.name}
                          <ExternalLink className="size-3 text-slate-650 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                        </span>
                        <span className="text-slate-400">{velocity.toFixed(1)} tasks/wk</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                        <div className={`h-full ${BAR_COLORS[idx % BAR_COLORS.length]} transition-all duration-700`} style={{ width: `${Math.min(100, (velocity / 100) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {globalStats && globalStats.perUser.length > 0 && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-5">
                <Users className="size-4 text-emerald-400" /> Team Member Performance
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800/60">
                    <tr>
                      <th className="pb-3 font-semibold">Member</th>
                      <th className="pb-3 font-semibold text-center">Assigned</th>
                      <th className="pb-3 font-semibold text-center">Completed</th>
                      <th className="pb-3 font-semibold text-right">Avg. days to ship</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {globalStats.perUser.map((u) => (
                      <tr key={u.userId} className="hover:bg-slate-900/20 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`size-7 rounded-lg grid place-items-center text-xs font-bold text-white shrink-0 ${u.color || "bg-gradient-to-br from-fuchsia-500 to-violet-600"}`}>
                              {u.name[0]?.toUpperCase() ?? "?"}
                            </span>
                            <div>
                              <div className="text-slate-200 font-medium text-xs">{u.name}</div>
                              {u.isAi && <div className="text-[10px] text-fuchsia-400">AI Agent</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center text-slate-300 font-semibold">{u.total}</td>
                        <td className="py-3 text-center">
                          <span className="text-emerald-400 font-semibold">{u.done}</span>
                          <span className="text-slate-600 text-xs"> / {u.total}</span>
                        </td>
                        <td className="py-3 text-right text-slate-400 text-xs">
                          {u.avgDays != null ? `${u.avgDays.toFixed(1)}d` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </StakeholderShell>
  );
}
