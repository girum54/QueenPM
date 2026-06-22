import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DollarSign, Activity, Calendar, Crown, CheckCircle2, ArrowUpRight, TrendingUp, Layers, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/executive")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard — Queen PM" },
      { name: "description", content: "Portfolio-level overview for Top-Level stakeholders." },
    ],
  }),
  component: ExecutiveDashboardPage,
});

function ExecutiveDashboardPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  // Mocked aggregated data across all projects
  const movingAvgVelocity = 45; // Across all teams
  const launchDate = "Oct 12, 2026";
  const okrsAchieved = [
    { title: "Increase Platform Reliability", progress: 85, color: "bg-emerald-500", text: "text-emerald-300", bgLight: "bg-emerald-500/10" },
    { title: "Launch Next-Gen Capabilities", progress: 40, color: "bg-fuchsia-500", text: "text-fuchsia-300", bgLight: "bg-fuchsia-500/10" },
    { title: "Expand Market Reach", progress: 60, color: "bg-sky-500", text: "text-sky-300", bgLight: "bg-sky-500/10" },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-200 font-sans selection:bg-fuchsia-500/30">
      {/* Top Navbar specifically for this standalone page */}
      <header className="h-14 border-b border-slate-900/80 bg-slate-950 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center shadow-lg shadow-fuchsia-500/20">
            <Crown className="size-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-100">Queen PM Enterprise</span>
        </div>
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
        >
          <LogOut className="size-3.5" />
          Sign Out
        </button>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="inline-flex items-center gap-1.5">
                <Crown className="size-3.5 text-amber-400" /> Executive Portfolio
              </span>
              <span className="text-slate-700">/</span>
              <span className="text-amber-400 font-medium tracking-wide">GLOBAL OVERVIEW</span>
            </div>
            <h1 className="text-4xl font-semibold text-slate-50 tracking-tight">
              Global Operations
            </h1>
            <p className="text-base text-slate-400 mt-2 max-w-2xl">
              High-level strategic overview of all organizational projects and value creation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30 text-sm font-medium shadow-inner shadow-emerald-500/10">
              <TrendingUp className="size-4" /> ROI Positive
            </span>
          </div>
        </div>

        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Top KPI Cards (As per MD) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* 1. See if projects are okay */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-xl shadow-black/20">
              <div className="size-10 rounded-xl grid place-items-center ring-1 mb-5 bg-emerald-500/10 ring-emerald-500/30">
                <CheckCircle2 className="size-5 text-emerald-300" />
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Portfolio Health</div>
              <div className="text-3xl font-semibold text-slate-50 mt-2 tabular-nums">12 <span className="text-lg text-slate-500">/ 12</span></div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <ArrowUpRight className="size-3.5 text-emerald-400" /> All projects are okay
              </div>
            </div>

            {/* 2. Watch how fast people work */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-xl shadow-black/20">
              <div className="size-10 rounded-xl grid place-items-center ring-1 mb-5 bg-fuchsia-500/10 ring-fuchsia-500/30">
                <Activity className="size-5 text-fuchsia-300" />
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Global Velocity</div>
              <div className="text-3xl font-semibold text-slate-50 mt-2 tabular-nums">{movingAvgVelocity} pts</div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-fuchsia-400" /> +15% across all teams
              </div>
            </div>

            {/* 3. Check final project launch dates */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-xl shadow-black/20">
              <div className="size-10 rounded-xl grid place-items-center ring-1 mb-5 bg-sky-500/10 ring-sky-500/30">
                <Calendar className="size-5 text-sky-300" />
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Next Major Launch</div>
              <div className="text-3xl font-semibold text-slate-50 mt-2 tabular-nums">{launchDate}</div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <ArrowUpRight className="size-3.5 text-emerald-400" /> Core Platform Update
              </div>
            </div>

            {/* 4. See overall business value created */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-xl shadow-black/20">
              <div className="size-10 rounded-xl grid place-items-center ring-1 mb-5 bg-amber-500/10 ring-amber-500/30">
                <DollarSign className="size-5 text-amber-300" />
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Value Created (YTD)</div>
              <div className="text-3xl font-semibold text-slate-50 mt-2 tabular-nums">$2.4M</div>
              <div className="text-xs text-slate-500 mt-2">Est. ARR impact</div>
            </div>
          </div>

          {/* Overall Business Value Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-xl shadow-black/20">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2.5 mb-6">
                <Layers className="size-5 text-amber-400" /> Strategic OKRs Across Portfolio
              </h3>
              <div className="space-y-5">
                {okrsAchieved.map((okr, i) => (
                  <div key={i} className="p-5 rounded-xl bg-slate-950/40 border border-slate-800/60 shadow-inner">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-sm font-medium text-slate-200">{okr.title}</h4>
                      <span className={`px-2.5 py-1 rounded ${okr.bgLight} ${okr.text} text-[11px] font-bold tracking-wide uppercase`}>
                        {okr.progress}% Achieved
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800/80 overflow-hidden shadow-inner">
                      <div className={`h-full ${okr.color} transition-all duration-1000 ease-out`} style={{ width: `${okr.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aggregated Project Statuses */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-xl shadow-black/20">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2.5 mb-6">
                <Activity className="size-5 text-emerald-400" /> Active Project Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:bg-slate-900/60 transition-colors cursor-default">
                  <span className="text-sm text-slate-300 font-medium">Queen PM Core</span>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded shadow-inner">On Track</span>
                </div>
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:bg-slate-900/60 transition-colors cursor-default">
                  <span className="text-sm text-slate-300 font-medium">Mobile App V2</span>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded shadow-inner">On Track</span>
                </div>
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:bg-slate-900/60 transition-colors cursor-default">
                  <span className="text-sm text-slate-300 font-medium">Data Analytics API</span>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded shadow-inner">At Risk</span>
                </div>
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:bg-slate-900/60 transition-colors cursor-default">
                  <span className="text-sm text-slate-300 font-medium">Legacy Migration</span>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded shadow-inner">On Track</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
