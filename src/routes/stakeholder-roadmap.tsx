import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Map, CheckCircle2, AlertTriangle, AlertCircle, ExternalLink } from "lucide-react";
import { StakeholderShell } from "@/components/StakeholderShell";
import { projectsApi, sprintsApi, type ApiProject, type ApiSprint } from "@/lib/api/queen.api";
import { useStore } from "@/lib/queen-store";

export const Route = createFileRoute("/stakeholder-roadmap")({
  head: () => ({
    meta: [{ title: "Strategic Roadmap — Queen PM Stakeholder" }],
  }),
  component: RoadmapPage,
});

const THEME_COLORS = [
  { bg: "bg-fuchsia-500", border: "border-fuchsia-500/40", text: "text-fuchsia-400" },
  { bg: "bg-emerald-500", border: "border-emerald-500/40", text: "text-emerald-400" },
  { bg: "bg-sky-500", border: "border-sky-500/40", text: "text-sky-400" },
  { bg: "bg-amber-500", border: "border-amber-500/40", text: "text-amber-400" },
  { bg: "bg-rose-500", border: "border-rose-500/40", text: "text-rose-400" },
];

function RoadmapPage() {
  const { setActiveProjectId } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const handleProjectClick = (id: string) => {
    setActiveProjectId(id);
    navigate({ to: "/" });
  };
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [sprintsMap, setSprintsMap] = useState<Record<string, ApiSprint[]>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const projs = await projectsApi.getAll();
      setProjects(projs);
      const smap: Record<string, ApiSprint[]> = {};
      for (const p of projs) smap[p.id] = await sprintsApi.getByProject(p.id);
      setSprintsMap(smap);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  if (loading) {
    return (
      <StakeholderShell>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <img src="/logo.png" alt="Queen PM Logo" className="size-16 object-contain animate-pulse" />
          <Loader2 className="size-6 text-amber-400 animate-spin" />
        </div>
      </StakeholderShell>
    );
  }

  return (
    <StakeholderShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-8 space-y-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <Map className="size-3.5 text-amber-400" />
              <span className="text-amber-400 font-medium tracking-wide">STRATEGIC ROADMAP</span>
            </div>
            <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">All Sprints & Deliverables</h1>
            <p className="text-sm text-slate-400 mt-1">Full sprint timeline across all projects with real deliverable progress.</p>
          </div>

          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {projects.map((project, pidx) => {
              const sprints = sprintsMap[project.id] || [];
              const theme = THEME_COLORS[pidx % THEME_COLORS.length];
              return (
                <div key={project.id} className={`rounded-2xl border bg-slate-900/40 p-6 ${theme.border}`}>
                  <div
                    onClick={() => handleProjectClick(project.id)}
                    className="flex items-center gap-3 mb-5 cursor-pointer group/header w-fit"
                  >
                    <div className={`size-2.5 rounded-full ${theme.bg}`} />
                    <h2 className={`text-base font-bold ${theme.text} group-hover/header:underline flex items-center gap-1.5`}>
                      {project.name}
                      <ExternalLink className="size-3 text-slate-500 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                    </h2>
                    <span className="text-xs text-slate-500">{sprints.length} sprint{sprints.length !== 1 ? "s" : ""}</span>
                  </div>

                  {sprints.length === 0 && (
                    <div className="text-sm text-slate-500 py-4 text-center">No sprints found.</div>
                  )}

                  <div className="space-y-4">
                    {sprints.map((sprint) => {
                      const deliverables = sprint.deliverables || [];
                      const sprintTasks = sprint.tasks || [];
                      let progress = 0;
                      let doneCount = 0;
                      let totalCount = 0;
                      let isTaskBased = false;

                      if (sprintTasks.length > 0) {
                        doneCount = sprintTasks.filter(t => t.column === "deployed").length;
                        totalCount = sprintTasks.length;
                        progress = Math.round((doneCount / totalCount) * 100);
                        isTaskBased = true;
                      } else {
                        doneCount = deliverables.filter(d => d.done).length;
                        totalCount = deliverables.length;
                        progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                      }
                      const startDate = new Date(sprint.startDate);
                      const endDate = new Date(startDate.getTime() + sprint.durationWeeks * 24 * 60 * 60 * 1000);
                      const now = new Date();
                      const timeProgress = endDate > startDate ? Math.max(0, Math.min(100, ((now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100)) : 0;
                      let healthStatus = "On Track";
                      const isOverdue = now > endDate;
                      if (sprint.completedAt) healthStatus = "Completed";
                      else if (isOverdue && progress < 100) healthStatus = "Delayed";
                      else if (timeProgress > progress + 10) healthStatus = "At Risk";

                      return (
                        <div key={sprint.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-200">{sprint.name}</h3>
                                {sprint.isActive && (
                                  <span className="text-[10px] font-bold uppercase text-fuchsia-400 bg-fuchsia-500/10 px-1.5 py-0.5 rounded">Active</span>
                                )}
                              </div>
                              {sprint.goal && <p className="text-xs text-slate-500 mt-0.5">{sprint.goal}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                                healthStatus === "On Track" ? "text-emerald-400 bg-emerald-500/10" :
                                healthStatus === "Completed" ? "text-slate-400 bg-slate-800/50" :
                                healthStatus === "At Risk" ? "text-amber-400 bg-amber-500/10" :
                                "text-rose-400 bg-rose-500/10"
                              }`}>
                                {healthStatus === "On Track" && <CheckCircle2 className="size-3" />}
                                {healthStatus === "Delayed" && <AlertCircle className="size-3" />}
                                {healthStatus === "At Risk" && <AlertTriangle className="size-3" />}
                                {healthStatus}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">
                                {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                              <div className={`h-full ${theme.bg} transition-all duration-700`} style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-400 tabular-nums">{doneCount}/{totalCount} {isTaskBased ? "tasks" : "deliverables"} done</span>
                          </div>

                          {deliverables.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {deliverables.map((d) => (
                                <div key={d.id} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${d.done ? "text-slate-500 bg-slate-900/30" : "text-slate-300 bg-slate-800/20"}`}>
                                  <div className={`size-3.5 rounded grid place-items-center shrink-0 border ${d.done ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "border-slate-700"}`}>
                                    {d.done && <CheckCircle2 className="size-2.5" />}
                                  </div>
                                  <span className={d.done ? "line-through" : ""}>{d.text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {deliverables.length === 0 && (
                            <div className="text-xs text-slate-600 italic">No deliverables defined.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </StakeholderShell>
  );
}
