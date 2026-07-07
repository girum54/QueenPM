import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Calendar, Crown, CheckCircle2, TrendingUp, Clock, AlertTriangle, AlertCircle, Briefcase, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import { useStore } from "@/lib/queen-store";
import { StakeholderShell } from "@/components/StakeholderShell";
import { dashboardApi, projectsApi, sprintsApi, type ApiProject, type ApiSprint } from "@/lib/api/queen.api";

export const Route = createFileRoute("/stakeholder")({
  head: () => ({
    meta: [
      { title: "Stakeholder Dashboard — Queen PM" },
      { name: "description", content: "Portfolio-level overview for Top-Level stakeholders." },
    ],
  }),
  component: StakeholderDashboardPage,
});

const THEME_COLORS = [
  { bg: "bg-fuchsia-500", text: "text-fuchsia-400", light: "bg-fuchsia-500/10" },
  { bg: "bg-emerald-500", text: "text-emerald-400", light: "bg-emerald-500/10" },
  { bg: "bg-sky-500", text: "text-sky-400", light: "bg-sky-500/10" },
  { bg: "bg-amber-500", text: "text-amber-400", light: "bg-amber-500/10" },
  { bg: "bg-rose-500", text: "text-rose-400", light: "bg-rose-500/10" },
  { bg: "bg-indigo-500", text: "text-indigo-400", light: "bg-indigo-500/10" },
];

function StakeholderDashboardPage() {
  const { setActiveProjectId } = useStore();
  const navigate = useNavigate();
  const handleProjectClick = (id: string) => {
    setActiveProjectId(id);
    navigate({ to: "/" });
  };
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [sprintsMap, setSprintsMap] = useState<Record<string, ApiSprint[]>>({});
  const [globalVelocity, setGlobalVelocity] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const projs = await projectsApi.getAll();
        setProjects(projs);
        const smap: Record<string, ApiSprint[]> = {};
        for (const p of projs) smap[p.id] = await sprintsApi.getByProject(p.id);
        setSprintsMap(smap);
        const stats = await dashboardApi.getStats();
        setGlobalVelocity(stats.movingAvg || 0);
      } catch (err) {
        console.error("Failed to load stakeholder data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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

  const roadmapItems: any[] = [];
  const projectHealthList: any[] = [];
  let onTrackCount = 0;

  projects.forEach((p, index) => {
    const projectSprints = sprintsMap[p.id] || [];
    const activeSprint = projectSprints.find(s => s.isActive) || projectSprints[0];
    const theme = THEME_COLORS[index % THEME_COLORS.length];
    let healthStatus = "On Track";
    let progress = 0;
    let deadline = "TBD";
    let isAtRisk = false;

    if (activeSprint) {
      const sprintTasks = activeSprint.tasks || [];
      if (sprintTasks.length > 0) {
        const completed = sprintTasks.filter(t => t.column === "deployed").length;
        progress = Math.round((completed / sprintTasks.length) * 100);
      } else {
        const deliverables = activeSprint.deliverables || [];
        const done = deliverables.filter(d => d.done).length;
        progress = deliverables.length > 0 ? Math.round((done / deliverables.length) * 100) : 0;
      }
      const startDate = new Date(activeSprint.startDate);
      const endDate = new Date(startDate.getTime() + activeSprint.durationWeeks * 7 * 24 * 60 * 60 * 1000);
      deadline = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const now = new Date();
      const timeProgress = Math.max(0, Math.min(100, ((now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100));
      const isOverdue = now > endDate;
      if (isOverdue && progress < 100) { healthStatus = "Delayed"; isAtRisk = true; }
      else if (timeProgress > progress + 10) { healthStatus = "At Risk"; isAtRisk = true; }
      roadmapItems.push({ id: p.id, sector: p.name, feature: activeSprint.name, status: healthStatus, progress, deadline, theme });
    }
    if (healthStatus === "On Track") onTrackCount++;
    projectHealthList.push({ id: p.id, name: p.name, status: healthStatus });
  });

  const allOkay = projects.length > 0 && onTrackCount === projects.length;
  let totalDeliverables = 0, completedDeliverables = 0;
  Object.values(sprintsMap).flat().forEach(s => {
    const sprintTasks = s.tasks || [];
    if (sprintTasks.length > 0) {
      sprintTasks.forEach(t => {
        totalDeliverables++;
        if (t.column === "deployed") completedDeliverables++;
      });
    } else {
      (s.deliverables || []).forEach(d => {
        totalDeliverables++;
        if (d.done) completedDeliverables++;
      });
    }
  });
  const milestoneCompletionRate = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;

  return (
    <StakeholderShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1300px] mx-auto px-8 py-8 space-y-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <Crown className="size-3.5 text-amber-400" />
              <span className="text-amber-400 font-medium tracking-wide">PORTFOLIO OVERVIEW</span>
            </div>
            <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">Organizational Pulse</h1>
            <p className="text-sm text-slate-400 mt-1">Real-time health check from live sprint deliverables.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-5">
                  <Activity className="size-4 text-emerald-400" /> Macro Project Health
                </h3>
                <div className="flex items-center gap-3 mb-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800/40">
                  <div className={`size-10 rounded-full grid place-items-center ${allOkay ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {allOkay ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-100">{onTrackCount} <span className="text-sm font-normal text-slate-500">/ {projects.length} On Track</span></div>
                    <div className="text-xs text-slate-400">{allOkay ? "All projects healthy" : "Some need attention"}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {projectHealthList.map((ph, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleProjectClick(ph.id)}
                      className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:bg-slate-900/60 hover:border-slate-700 transition-all cursor-pointer group/item"
                    >
                      <span className="text-sm text-slate-300 font-medium group-hover/item:text-slate-100 flex items-center gap-1.5 transition-colors">
                        {ph.name}
                        <ExternalLink className="size-3 text-slate-650 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                      </span>
                      <span className={`flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded ${
                        ph.status === "On Track" ? "text-emerald-400 bg-emerald-500/10" :
                        ph.status === "At Risk" ? "text-amber-400 bg-amber-500/10" :
                        "text-rose-400 bg-rose-500/10"
                      }`}>
                        {ph.status === "On Track" && <CheckCircle2 className="size-3" />}
                        {ph.status === "At Risk" && <AlertTriangle className="size-3" />}
                        {ph.status === "Delayed" && <AlertCircle className="size-3" />}
                        {ph.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-5">
                  <TrendingUp className="size-4 text-fuchsia-400" /> Completion pace & efficiency
                </h3>
                <div className="mb-5">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Weekly throughput</span>
                    <span className="text-2xl font-bold text-slate-50">{globalVelocity.toFixed(1)}<span className="text-sm font-normal text-slate-500"> tasks/wk</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                    <div className="h-full bg-fuchsia-500 transition-all" style={{ width: `${Math.min(100, (globalVelocity / 100) * 100)}%` }} />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800/60 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300">Milestone Completion</span>
                      <span className="text-emerald-400 font-bold">{milestoneCompletionRate}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${milestoneCompletionRate}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Total Deliverables</span>
                    <span className="font-bold text-slate-300">{totalDeliverables}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Completed</span>
                    <span className="font-bold text-emerald-400">{completedDeliverables}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 self-start">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-6">
                <Briefcase className="size-4 text-sky-400" /> Active Sprints (Live Roadmap)
              </h3>
              <div className="space-y-4">
                {roadmapItems.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleProjectClick(item.id)}
                    className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-slate-600 hover:bg-slate-900/40 transition-all cursor-pointer group/item"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${item.theme.text} flex items-center gap-1.5`}>
                          {item.sector}
                          <ExternalLink className="size-3 text-slate-650 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                        </span>
                        <h4 className="text-sm font-semibold text-slate-200 mt-0.5">{item.feature}</h4>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500">Deadline</div>
                        <div className="text-xs font-mono text-slate-300">{item.deadline}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                        <div className={`h-full ${item.theme.bg} transition-all duration-1000`} style={{ width: `${item.progress}%` }} />
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.status === "On Track" ? "text-emerald-400 bg-emerald-500/10" :
                        item.status === "At Risk" ? "text-amber-400 bg-amber-500/10" :
                        "text-rose-400 bg-rose-500/10"
                      }`}>{item.status}</span>
                    </div>
                  </div>
                ))}
                {roadmapItems.length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-8">No active sprints found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StakeholderShell>
  );
}
