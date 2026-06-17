import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, KanbanSquare, MessageSquare, Crown, Search, Bell, Settings } from "lucide-react";
import type { ReactNode } from "react";

const NAV: { to: "/" | "/board" | "/channels"; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/board", label: "Board", icon: KanbanSquare },
  { to: "/channels", label: "Channels", icon: MessageSquare },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-200 font-sans antialiased selection:bg-fuchsia-500/30">
      <header className="h-12 shrink-0 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur flex items-center px-3 gap-2">
        <div className="flex items-center gap-2 pr-3 mr-2 border-r border-slate-800/80">
          <div className="size-7 rounded-md bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center shadow-lg shadow-fuchsia-500/20">
            <Crown className="size-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-100">Queen PM</span>
        </div>
        <nav className="flex items-center gap-0.5">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition ${
                  active
                    ? "bg-slate-800 text-slate-100"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <Icon className="size-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800/50 border border-slate-800 text-[11px] text-slate-500 w-56">
            <Search className="size-3.5" />
            <span>Jump to…</span>
            <span className="ml-auto px-1.5 py-0.5 rounded bg-slate-900/60 text-[10px] font-mono">⌘K</span>
          </div>
          <button className="size-8 grid place-items-center text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 rounded-md">
            <Bell className="size-4" />
          </button>
          <button className="size-8 grid place-items-center text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 rounded-md">
            <Settings className="size-4" />
          </button>
          <div className="size-7 rounded-md bg-slate-700 grid place-items-center text-[11px] font-bold ml-1">Y</div>
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
