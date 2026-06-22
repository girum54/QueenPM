import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, KanbanSquare, MessageSquare, Crown, Search, Bell, Settings,
  X, Sparkles, FolderGit2, ChevronDown, Check, Hash, Bot,
  ExternalLink, PanelLeftClose, PanelLeftOpen, ListTodo, Menu, LogOut, Loader2, PieChart
} from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { useStore } from "@/lib/queen-store";
import { useAuth } from "@/lib/auth-store";

// ── Custom Sprint Icon ─────────────────────────────────────────
function SprintIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="15" cy="5" r="2" />
      <path d="m9 20 2-5-2-4 3-3 3 2.5 2-1.5" />
      <path d="m13 15 2 5" />
      <path d="M6 13h3" />
    </svg>
  );
}

// ── Nav definition (Channels handled separately as accordion) ──
const TOP_NAV: {
  to: "/" | "/stakeholder" | "/sprint" | "/board" | "/tasks";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  reqStakeholder?: boolean;
}[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true, reqStakeholder: false },
  { to: "/stakeholder", label: "Dashboard", icon: PieChart, reqStakeholder: true },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/sprint", label: "Sprint", icon: SprintIcon, reqStakeholder: false },
  { to: "/board", label: "Board", icon: KanbanSquare },
];

// ── AppShell ──────────────────────────────────────────────────
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const {
    activeProjectId, setActiveProjectId,
    projectTabs, addProjectTab, closeProjectTab,
    channels, activeChannelId, setActiveChannelId,
    sidebarCollapsed, setSidebarCollapsed,
  } = useStore();

  const { user, loading, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  // UI state
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isChannelsOpen, setIsChannelsOpen] = useState(pathname.startsWith("/channels"));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close project dropdown on outside click
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

  // Sync channels accordion with route
  useEffect(() => {
    if (pathname.startsWith("/channels")) setIsChannelsOpen(true);
  }, [pathname]);

  const activeProject = projectTabs.find((p) => p.id === activeProjectId) ?? projectTabs[0];

  // Handle project creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed || isAddingProject) return;
    setIsAddingProject(true);
    try {
      await addProjectTab(trimmed);
      setNewProjectName("");
      setIsModalOpen(false);
      if (openInNewTab) {
        window.open("/", "_blank");
      }
    } finally {
      setIsAddingProject(false);
    }
  };

  // Open a project in a new browser tab
  const openProjectNewTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Store the target project id in sessionStorage for the new tab to pick up
    window.open(`/?project=${id}`, "_blank");
  };

  // Channels sub-nav click
  const handleChannelClick = (channelId: string) => {
    setActiveChannelId(channelId);
    navigate({ to: "/channels" });
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="size-6 text-fuchsia-400 animate-spin" />
      </div>
    );
  }

  const collapsed = isMobile ? false : sidebarCollapsed;

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-950 text-slate-200 font-sans antialiased selection:bg-fuchsia-500/30">

      {/* ═══════════ LEFT SIDEBAR ═══════════ */}
      <aside
        onClick={collapsed ? () => setSidebarCollapsed(false) : undefined}
        className={`fixed inset-y-0 left-0 md:relative md:translate-x-0 shrink-0 h-full border-r border-slate-900 bg-slate-950 flex flex-col z-50 transition-all duration-200 transform ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          collapsed ? "md:w-[64px] cursor-pointer hover:bg-slate-900/10" : "md:w-[220px]"
        } w-[240px]`}
      >
        {/* ── Brand + Collapse Toggle ── */}
        <div
          onClick={(e) => {
            if (!collapsed) {
              e.stopPropagation();
              setSidebarCollapsed(true);
            }
          }}
          className={`flex items-center h-14 border-b border-slate-900 shrink-0 cursor-pointer hover:bg-slate-900/20 transition ${
            collapsed ? "justify-center px-0" : "px-3 gap-2"
          }`}
        >
          {!collapsed && (
            <>
              <div className="size-7 rounded-md bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center shadow-lg shadow-fuchsia-500/20 shrink-0">
                <Crown className="size-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-slate-100 flex-1">Queen PM</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSidebarCollapsed(true);
                }}
                title="Collapse sidebar"
                className="size-7 rounded-md grid place-items-center text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition shrink-0"
              >
                <PanelLeftClose className="size-3.5" />
              </button>
            </>
          )}
          {collapsed && (
            <div className="size-7 rounded-md bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center shadow-lg shadow-fuchsia-500/20">
              <Crown className="size-3.5 text-white" />
            </div>
          )}
        </div>

        {/* ── Project Switcher ── */}
        {!collapsed && (
          <div className="px-2.5 pt-3 pb-2" ref={dropdownRef}>
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[12px] font-medium transition ${
                isProjectDropdownOpen
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-slate-900/40 border-slate-800/60 text-slate-400 hover:bg-slate-900 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <span className={`size-1.5 rounded-full bg-gradient-to-br ${activeProject?.color ?? "from-fuchsia-500 to-violet-600"} shrink-0`} />
              <span className="flex-1 text-left truncate">{activeProject?.name ?? "Select project"}</span>
              <ChevronDown className={`size-3 text-slate-500 transition-transform shrink-0 ${isProjectDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isProjectDropdownOpen && (
              <div className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 shadow-xl z-50 overflow-hidden">
                <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Projects
                </div>
                <div className="space-y-px max-h-44 overflow-y-auto px-1 pb-1">
                  {projectTabs.map((p) => {
                    const isActive = p.id === activeProjectId;
                    return (
                      <div
                        key={p.id}
                        className={`group/item flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] cursor-pointer transition ${
                          isActive ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                        }`}
                        onClick={() => { setActiveProjectId(p.id); setIsProjectDropdownOpen(false); }}
                      >
                        <span className={`size-1.5 rounded-full bg-gradient-to-br ${p.color} shrink-0`} />
                        <span className="flex-1 truncate">{p.name}</span>
                        {isActive && <Check className="size-3 text-fuchsia-400 shrink-0" />}
                        {/* Open in new tab */}
                        <button
                          title="Open in new tab"
                          onClick={(e) => openProjectNewTab(e, p.id)}
                          className="size-4 rounded grid place-items-center text-slate-600 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 opacity-0 group-hover/item:opacity-100 transition shrink-0"
                        >
                          <ExternalLink className="size-2.5" />
                        </button>
                        {!isActive && projectTabs.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); closeProjectTab(p.id); }}
                            className="size-4 rounded grid place-items-center text-slate-600 hover:text-slate-300 hover:bg-slate-700 opacity-0 group-hover/item:opacity-100 transition shrink-0"
                          >
                            <X className="size-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-slate-800/60 p-1 flex items-center gap-1">
                  <button
                    onClick={() => { setIsProjectDropdownOpen(false); setIsModalOpen(true); }}
                    className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-fuchsia-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-200 transition"
                  >
                    <FolderGit2 className="size-3.5 shrink-0" />
                    <span>New Project…</span>
                  </button>
                  <button
                    title="Project settings"
                    onClick={() => { setIsProjectDropdownOpen(false); navigate({ to: "/projects" }); }}
                    className="size-8 shrink-0 rounded-md grid place-items-center text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
                  >
                    <Settings className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Divider ── */}
        <div className={`h-px bg-slate-900 ${collapsed ? "mx-2" : "mx-2.5"} mb-1`} />

        {/* ── Nav Items ── */}
        <nav className={`flex-1 overflow-y-auto space-y-px ${collapsed ? "px-1.5 pt-1" : "px-2 pt-1"}`}>
          {/* Top nav items */}
          {TOP_NAV.map((n) => {
            const isStakeholder = user?.email?.toLowerCase().includes("stakeholder") || user?.username?.toLowerCase().includes("stakeholder");
            if (n.reqStakeholder === true && !isStakeholder) return null;
            if (n.reqStakeholder === false && isStakeholder) return null;
            
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                title={collapsed ? n.label : undefined}
                className={`relative flex items-center rounded-lg text-[12px] font-medium transition-all group ${
                  collapsed ? "justify-center h-9 w-full" : "gap-2.5 px-2.5 h-9"
                } ${
                  active
                    ? "bg-slate-900 border border-slate-800/80 text-slate-100"
                    : "border border-transparent text-slate-500 hover:bg-slate-900/40 hover:text-slate-300"
                }`}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-fuchsia-500 shadow-sm shadow-fuchsia-500/60" />
                )}
                <Icon className={`shrink-0 ${collapsed ? "size-[18px]" : "size-4"} ${active ? "text-fuchsia-400" : "text-slate-500 group-hover:text-slate-400"}`} />
                {!collapsed && <span>{n.label}</span>}
              </Link>
            );
          })}

          {/* ── Channels accordion ── */}
          <div>
            <button
              title={collapsed ? "Channels" : undefined}
              onClick={() => {
                if (collapsed) {
                  setSidebarCollapsed(false);
                  setIsChannelsOpen(true);
                } else {
                  setIsChannelsOpen(!isChannelsOpen);
                }
              }}
              className={`relative w-full flex items-center rounded-lg text-[12px] font-medium transition-all group ${
                collapsed ? "justify-center h-9" : "gap-2.5 px-2.5 h-9"
              } ${
                pathname.startsWith("/channels")
                  ? "bg-slate-900 border border-slate-800/80 text-slate-100"
                  : "border border-transparent text-slate-500 hover:bg-slate-900/40 hover:text-slate-300"
              }`}
            >
              {pathname.startsWith("/channels") && !collapsed && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-fuchsia-500 shadow-sm shadow-fuchsia-500/60" />
              )}
              <MessageSquare className={`shrink-0 ${collapsed ? "size-[18px]" : "size-4"} ${pathname.startsWith("/channels") ? "text-fuchsia-400" : "text-slate-500 group-hover:text-slate-400"}`} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Channels</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({ to: "/channels-config" });
                      }}
                      title="Manage Channels"
                      className="size-5 rounded hover:bg-slate-800/60 text-slate-550 hover:text-slate-200 flex items-center justify-center transition"
                    >
                      <Settings className="size-3" />
                    </button>
                    <ChevronDown className={`size-3 text-slate-600 transition-transform ${isChannelsOpen ? "rotate-180" : ""}`} />
                  </div>
                </>
              )}
            </button>

            {/* Channel sub-list */}
            {isChannelsOpen && !collapsed && (
              <div className="mt-0.5 ml-3 pl-2.5 border-l border-slate-800/60 space-y-px pb-1">
                {channels.map((ch) => {
                  const isActive = ch.id === activeChannelId && pathname.startsWith("/channels");
                  return (
                    <button
                      key={ch.id}
                      onClick={() => handleChannelClick(ch.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] transition ${
                        isActive
                          ? "bg-slate-800/80 text-slate-100"
                          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
                      }`}
                    >
                      <Hash className="size-3 shrink-0 text-slate-600" />
                      <span className="flex-1 text-left truncate">{ch.name}</span>
                      {ch.aiActive && (
                        <Bot className="size-3 text-fuchsia-500/60 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* ── Profile (bottom) ── */}
        <div className={`border-t border-slate-900 ${collapsed ? "p-1.5" : "p-2.5"} relative`}>
          {collapsed ? (
            <div
              title={user?.name ?? "You"}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="size-9 mx-auto rounded-lg grid place-items-center text-xs font-bold text-white ring-1 ring-slate-800 cursor-pointer hover:ring-fuchsia-500/40 transition bg-slate-700"
              style={user?.color ? {} : {}}
            >
              <span className={`size-full rounded-lg grid place-items-center ${user?.color ?? "bg-gradient-to-br from-violet-600 to-fuchsia-600"}`}>
                {user ? user.name[0].toUpperCase() : "?"}
              </span>
            </div>
          ) : (
            <div className="relative" ref={userMenuRef}>
              <div
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-900/60 cursor-pointer transition group"
              >
                <div className={`size-7 rounded-lg grid place-items-center text-[11px] font-bold text-white shrink-0 ring-1 ring-slate-800 ${user?.color ?? "bg-gradient-to-br from-violet-600 to-fuchsia-600"}`}>
                  {user ? user.name[0].toUpperCase() : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-slate-200 truncate">{user?.name ?? "Guest"}</div>
                  <div className="text-[10px] text-slate-500 truncate">{user?.email ?? "Not signed in"}</div>
                </div>
                <Settings className="size-3.5 text-slate-600 group-hover:text-slate-400 transition shrink-0" />
              </div>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-slate-800 bg-slate-900 shadow-xl overflow-hidden z-50">
                  {user ? (
                    <>
                      <div className="px-3 py-2.5 border-b border-slate-800">
                        <div className="text-[12px] font-semibold text-slate-200 truncate">{user.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{user.username ?? user.email}</div>
                      </div>
                      <button
                        id="btn-sign-out"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <LogOut className="size-3.5" />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      className="flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-fuchsia-400 hover:bg-fuchsia-500/10 transition"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Sign in
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* ═══════════ RIGHT SIDE ═══════════ */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* ── Top Bar ── */}
        <header className="h-12 shrink-0 border-b border-slate-900 bg-slate-950 flex items-center px-4 gap-2 z-20">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden size-8 grid place-items-center text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition shrink-0"
          >
            <Menu className="size-4" />
          </button>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-900 text-[11px] text-slate-500 w-40 sm:w-64 hover:border-slate-800 transition cursor-text min-w-0">
            <Search className="size-3.5 text-slate-600 shrink-0" />
            <span className="truncate">Jump to…</span>
            <span className="hidden sm:inline ml-auto px-1.5 py-0.5 rounded bg-slate-950 text-[9px] font-mono text-slate-605">⌘K</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button className="size-8 grid place-items-center text-slate-500 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition">
              <Bell className="size-4" />
            </button>
            <button className="size-8 grid place-items-center text-slate-500 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition">
              <Settings className="size-4" />
            </button>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>
      </div>

      {/* ═══════════ NEW PROJECT MODAL ═══════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-fuchsia-400" />
                <h3 className="text-sm font-semibold text-slate-100">New Project</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="size-7 grid place-items-center rounded-md hover:bg-slate-800 text-slate-500">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Project Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  disabled={isAddingProject}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Project Zeta"
                  className="w-full h-9 rounded-md bg-slate-800/60 border border-slate-700 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500 transition disabled:opacity-50"
                />
              </div>

              {/* Open in new tab toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => setOpenInNewTab(!openInNewTab)}
                  className={`size-4 rounded border-2 grid place-items-center transition flex-shrink-0 ${
                    openInNewTab ? "border-fuchsia-400 bg-fuchsia-500" : "border-slate-600 group-hover:border-slate-500"
                  }`}
                >
                  {openInNewTab && <Check className="size-3 text-white" />}
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition flex items-center gap-1.5">
                  <ExternalLink className="size-3 text-slate-500" />
                  Open in new tab after creating
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="h-9 px-4 rounded-md text-xs font-medium text-slate-400 hover:bg-slate-800 transition">
                  Cancel
                </button>
                <button type="submit" disabled={isAddingProject}
                  className="h-9 px-4 rounded-md text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {isAddingProject ? <><Loader2 className="size-3.5 animate-spin" /> Creating...</> : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
