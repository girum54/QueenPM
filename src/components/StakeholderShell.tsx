import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Crown, ChevronDown, Check, ExternalLink, PanelLeftClose,
  LogOut, Loader2, LayoutDashboard, Map, BarChart3, X
} from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { useStore } from "@/lib/queen-store";
import { useAuth } from "@/lib/auth-store";

const STAKEHOLDER_NAV: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}[] = [
    { to: "/stakeholder", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/stakeholder-roadmap", label: "Roadmap", icon: Map },
    { to: "/stakeholder-reports", label: "Team Performance", icon: BarChart3 },
  ];

export function StakeholderShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const {
    activeProjectId, setActiveProjectId,
    projectTabs, closeProjectTab,
    sidebarCollapsed, setSidebarCollapsed,
  } = useStore();

  const { user, loading, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsProjectDropdownOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const openProjectNewTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    window.open(`/?project=${id}`, "_blank");
  };

  const activeProject = projectTabs.find((p) => p.id === activeProjectId) ?? projectTabs[0];
  const collapsed = isMobile ? false : sidebarCollapsed;

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="size-6 text-fuchsia-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-950 text-slate-200 font-sans antialiased selection:bg-fuchsia-500/30">

      {/* ═══════════ STAKEHOLDER SIDEBAR ═══════════ */}
      <aside
        onClick={collapsed ? () => setSidebarCollapsed(false) : undefined}
        className={`relative shrink-0 h-full border-r border-slate-900 bg-slate-950 flex flex-col z-50 transition-all duration-200 ${collapsed ? "w-[64px] cursor-pointer hover:bg-slate-900/10" : "w-[220px]"
          }`}
      >
        {/* Brand + Collapse */}
        <div
          onClick={(e) => { if (!collapsed) { e.stopPropagation(); setSidebarCollapsed(true); } }}
          className={`flex items-center h-14 border-b border-slate-900 shrink-0 cursor-pointer hover:bg-slate-900/20 transition ${collapsed ? "justify-center px-0" : "px-3 gap-2"
            }`}
        >
          {!collapsed && (
            <>
              <div className="size-7 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center shadow-lg shadow-amber-500/20 shrink-0">
                <Crown className="size-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-slate-100 flex-1">Stakeholder</span>
              <button
                onClick={(e) => { e.stopPropagation(); setSidebarCollapsed(true); }}
                className="size-7 rounded-md grid place-items-center text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition shrink-0"
              >
                <PanelLeftClose className="size-3.5" />
              </button>
            </>
          )}
          {collapsed && (
            <div className="size-7 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center shadow-lg shadow-amber-500/20">
              <Crown className="size-3.5 text-white" />
            </div>
          )}
        </div>

        {/* Projects List */}
        {!collapsed && (
          <div className="px-2.5 pt-3 pb-2 flex flex-col min-h-0">
            <div className="px-2.5 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Projects</span>
              <span className="text-[9px] lowercase bg-slate-900 px-1.5 py-0.5 rounded text-slate-600 font-mono">click to open</span>
            </div>
            <div className="space-y-px max-h-48 overflow-y-auto px-1 pb-1">
              {projectTabs.map((p) => {
                return (
                  <div
                    key={p.id}
                    className="group/item flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer text-slate-405 hover:bg-slate-900 hover:text-slate-100 transition"
                    onClick={() => {
                      setActiveProjectId(p.id);
                      navigate({ to: "/" });
                    }}
                  >
                    <span className={`size-1.5 rounded-full bg-gradient-to-br ${p.color} shrink-0`} />
                    <span className="flex-1 truncate">{p.name}</span>
                    <ExternalLink className="size-3 text-slate-600 group-hover/item:text-amber-400 opacity-0 group-hover/item:opacity-100 transition shrink-0" />
                  </div>
                );
              })}
              {projectTabs.length === 0 && (
                <div className="text-[11px] text-slate-600 px-2 py-1 italic">No projects.</div>
              )}
            </div>
          </div>
        )}

        <div className={`h-px bg-slate-900 ${collapsed ? "mx-2" : "mx-2.5"} mb-1`} />

        {/* Stakeholder Nav */}
        <nav className={`flex-1 overflow-y-auto space-y-px ${collapsed ? "px-1.5 pt-1" : "px-2 pt-1"}`}>
          {STAKEHOLDER_NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                title={collapsed ? n.label : undefined}
                className={`relative flex items-center rounded-lg text-[12px] font-medium transition-all group ${collapsed ? "justify-center h-9 w-full" : "gap-2.5 px-2.5 h-9"
                  } ${active
                    ? "bg-slate-900 border border-slate-800/80 text-slate-100"
                    : "border border-transparent text-slate-500 hover:bg-slate-900/40 hover:text-slate-300"
                  }`}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-amber-500 shadow-sm shadow-amber-500/60" />
                )}
                <Icon className={`shrink-0 ${collapsed ? "size-[18px]" : "size-4"} ${active ? "text-amber-400" : "text-slate-500 group-hover:text-slate-400"}`} />
                {!collapsed && <span>{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Profile (bottom) */}
        <div className={`border-t border-slate-900 ${collapsed ? "p-1.5" : "p-2.5"} relative`}>
          {collapsed ? (
            <div
              title={user?.name ?? "You"}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="size-9 mx-auto rounded-lg grid place-items-center text-xs font-bold text-white ring-1 ring-slate-800 cursor-pointer hover:ring-amber-500/40 transition bg-slate-700"
            >
              <span className={`size-full rounded-lg grid place-items-center ${user?.color ?? "bg-gradient-to-br from-amber-600 to-orange-600"}`}>
                {user ? user.name[0].toUpperCase() : "?"}
              </span>
            </div>
          ) : (
            <div className="relative" ref={userMenuRef}>
              <div
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-900/60 cursor-pointer transition group"
              >
                <span className={`size-7 rounded-lg grid place-items-center text-xs font-bold text-white shrink-0 ${user?.color ?? "bg-gradient-to-br from-amber-600 to-orange-600"}`}>
                  {user ? user.name[0].toUpperCase() : "?"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-slate-200 truncate">{user?.name ?? "Stakeholder"}</div>
                  <div className="text-[10px] text-slate-500 truncate">{user?.email ?? ""}</div>
                </div>
                <ChevronDown className={`size-3 text-slate-600 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
              </div>

              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-slate-800 bg-slate-900 shadow-xl overflow-hidden z-50">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <LogOut className="size-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
