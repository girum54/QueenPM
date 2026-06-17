import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type Priority = "low" | "medium" | "high" | "urgent";
export type ColumnId = "new" | "active" | "staging" | "deployed";
export type CreatedBy = "ui" | "ai" | "slash";

export interface User {
  id: string;
  name: string;
  handle: string;
  color: string;
  isAi?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  aiActive?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId: string | null;
  priority: Priority;
  column: ColumnId;
  createdBy: CreatedBy;
  originMessageId: string | null;
  originChannelId: string | null;
  createdAt: number;
  completedAt?: number | null;
  deadline?: string | null;
  estimateDays?: number | null;
}

export interface Message {
  id: string;
  authorId: string;
  channelId: string;
  text?: string;
  ts: string;
  pinned?: boolean;
  parentId?: string;
  taskRef?: string; // task id
}

export const USERS: User[] = [
  { id: "u1", name: "Mira Chen", handle: "@mira", color: "bg-rose-500" },
  { id: "u2", name: "Daniel Park", handle: "@dan", color: "bg-amber-500" },
  { id: "u3", name: "Sofia Reyes", handle: "@sofia", color: "bg-emerald-500" },
  { id: "u4", name: "Kai Tanaka", handle: "@kai", color: "bg-sky-500" },
  { id: "uq", name: "Queen PM", handle: "@queen", color: "bg-gradient-to-br from-fuchsia-500 to-violet-600", isAi: true },
  { id: "me", name: "You", handle: "@you", color: "bg-slate-500" },
];

export const CHANNELS: Channel[] = [
  { id: "c1", name: "general" },
  { id: "c2", name: "eng-platform", aiActive: true },
  { id: "c3", name: "design-crit" },
  { id: "c4", name: "sprint-q3", aiActive: true },
  { id: "c5", name: "incidents", aiActive: true },
  { id: "c6", name: "watercooler" },
];

const now = Date.now();
const DAY = 86400000;

const INITIAL_TASKS: Task[] = [
  { id: "t1", title: "Fix race condition in checkout webhook", description: "Reproduced under concurrent load — needs idempotency key.", assigneeId: "u2", priority: "urgent", column: "active", createdBy: "ai", originMessageId: "m3", originChannelId: "c2", createdAt: now - 4 * DAY },
  { id: "t2", title: "Refactor auth middleware for edge runtime", assigneeId: "u4", priority: "high", column: "new", createdBy: "ai", originMessageId: "m5", originChannelId: "c2", createdAt: now - 3 * DAY },
  { id: "t3", title: "Design system: token migration to OKLCH", assigneeId: "u3", priority: "medium", column: "staging", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 6 * DAY },
  { id: "t4", title: "Q3 launch: payments overhaul", assigneeId: "u1", priority: "high", column: "active", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 9 * DAY },
  { id: "t5", title: "Add Sentry breadcrumbs to ingest pipeline", assigneeId: null, priority: "low", column: "new", createdBy: "slash", originMessageId: "m7", originChannelId: "c2", createdAt: now - 1 * DAY },
  { id: "t6", title: "Onboarding revamp epic", assigneeId: "u3", priority: "medium", column: "new", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 2 * DAY },
  { id: "t7", title: "Ship rate limiter to prod", assigneeId: "u2", priority: "high", column: "deployed", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 14 * DAY, completedAt: now - 2 * DAY },
  { id: "t8", title: "Audit log retention policy", assigneeId: "u4", priority: "medium", column: "deployed", createdBy: "ai", originMessageId: null, originChannelId: null, createdAt: now - 11 * DAY, completedAt: now - 4 * DAY },
  { id: "t9", title: "Postgres pooler upgrade", assigneeId: "u2", priority: "high", column: "staging", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 5 * DAY },
  { id: "t10", title: "Triage AI-flagged 500s on /v2/orders", assigneeId: null, priority: "urgent", column: "new", createdBy: "ai", originMessageId: "m2", originChannelId: "c2", createdAt: now - 6 * 3600000 },
  { id: "t11", title: "Migrate billing webhook to v2", assigneeId: "u1", priority: "high", column: "deployed", createdBy: "ai", originMessageId: null, originChannelId: null, createdAt: now - 18 * DAY, completedAt: now - 7 * DAY },
  { id: "t12", title: "Customer SSO: Okta integration", assigneeId: "u4", priority: "high", column: "active", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 8 * DAY },
];

const INITIAL_MESSAGES: Message[] = [
  { id: "m1", authorId: "u1", channelId: "c2", ts: "9:02", text: "morning team — pushing the new ingest worker to staging in ~30", pinned: true },
  { id: "m2", authorId: "u4", channelId: "c2", ts: "9:14", text: "nice. fyi the checkout webhook is flaky again, saw two 500s overnight" },
  { id: "m3", authorId: "u2", channelId: "c2", ts: "9:16", text: "yeah it's the same race we hit last month. I can repro locally" },
  { id: "m4", authorId: "uq", channelId: "c2", ts: "9:16", taskRef: "t1" },
  { id: "m5", authorId: "u1", channelId: "c2", ts: "9:21", text: "@queen we should also get the auth middleware ported to edge before Q3 launch, can you track that" },
  { id: "m6", authorId: "uq", channelId: "c2", ts: "9:21", taskRef: "t2" },
  { id: "m7", authorId: "u4", channelId: "c2", ts: "9:33", text: "small thing — we should add sentry breadcrumbs to the ingest pipeline so we can actually debug these", parentId: "m1" },
  { id: "m8", authorId: "uq", channelId: "c2", ts: "9:33", taskRef: "t5" },
  { id: "m9", authorId: "u3", channelId: "c2", ts: "10:02", text: "design crit at 2, will share the token migration prototype" },
  { id: "m10", authorId: "u2", channelId: "c2", ts: "10:18", text: "repro confirmed. patch incoming, will tag the PR to the task", parentId: "m3" },
  { id: "m11", authorId: "u1", channelId: "c4", ts: "8:45", text: "sprint kickoff in 15 — agenda in the pinned doc", pinned: true },
  { id: "m12", authorId: "u3", channelId: "c1", ts: "11:00", text: "lunch order goes in at 12:30 sharp" },
];

export interface ProjectTab {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_PROJECT_TABS: ProjectTab[] = [
  { id: "p-x", name: "Project X", color: "from-fuchsia-500 to-violet-600" },
  { id: "p-alpha", name: "Project Alpha", color: "from-sky-500 to-cyan-600" },
  { id: "p-delta", name: "Project Delta", color: "from-emerald-500 to-teal-600" },
];

interface JumpRequest {
  messageId: string;
  channelId: string;
  ts: number;
}

interface StoreShape {
  tasks: Task[];
  messages: Message[];
  channels: Channel[];
  users: User[];
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  addTask: (t: Task) => void;
  addMessage: (m: Message) => void;
  jumpRequest: JumpRequest | null;
  requestJump: (messageId: string, channelId: string) => void;
  consumeJump: () => JumpRequest | null;
  // Dynamic Channels management
  addChannel: (name: string, aiActive?: boolean) => void;
  updateChannel: (id: string, patch: Partial<Channel>) => void;
  deleteChannel: (id: string) => void;
  // Tabs & sidebar
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  projectTabs: ProjectTab[];
  addProjectTab: (name: string, color?: string) => void;
  closeProjectTab: (id: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const StoreCtx = createContext<StoreShape | null>(null);

export function QueenStoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [channels, setChannels] = useState<Channel[]>(() => {
    try {
      const saved = localStorage.getItem("channels");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return CHANNELS;
  });
  const [activeChannelId, setActiveChannelId] = useState("c2");
  const [jumpRequest, setJumpRequest] = useState<JumpRequest | null>(null);
  const consumed = useRef(false);

  const [projectTabs, setProjectTabs] = useState<ProjectTab[]>(() => {
    try {
      const saved = localStorage.getItem("project_tabs");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_PROJECT_TABS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("active_project_id");
      if (saved && projectTabs.some((p) => p.id === saved)) return saved;
    } catch (e) {}
    return "p-x";
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      return saved === "true";
    } catch (e) {}
    return false;
  });

  const handleSetActiveProjectId = (id: string) => {
    setActiveProjectId(id);
    localStorage.setItem("active_project_id", id);
  };

  const handleSetSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem("sidebar_collapsed", String(collapsed));
  };

  const addProjectTab = (name: string, color?: string) => {
    const id = `p-${Date.now()}`;
    const colors = [
      "from-fuchsia-500 to-violet-600",
      "from-sky-500 to-cyan-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-pink-600",
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newTab = { id, name, color: color || randomColor };
    const nextTabs = [...projectTabs, newTab];
    setProjectTabs(nextTabs);
    localStorage.setItem("project_tabs", JSON.stringify(nextTabs));
    handleSetActiveProjectId(id);
  };

  const closeProjectTab = (id: string) => {
    if (projectTabs.length <= 1) return;
    const nextTabs = projectTabs.filter((p) => p.id !== id);
    setProjectTabs(nextTabs);
    localStorage.setItem("project_tabs", JSON.stringify(nextTabs));
    if (activeProjectId === id) {
      const remainingIndex = projectTabs.findIndex((p) => p.id === id);
      const nextActive = nextTabs[Math.max(0, remainingIndex - 1)].id;
      handleSetActiveProjectId(nextActive);
    }
  };

  const addChannel = (name: string, aiActive = false) => {
    const newChan = {
      id: `c_${Date.now()}`,
      name: name.toLowerCase().replace(/\s+/g, "-"),
      aiActive,
    };
    const next = [...channels, newChan];
    setChannels(next);
    localStorage.setItem("channels", JSON.stringify(next));
    setActiveChannelId(newChan.id);
  };

  const updateChannel = (id: string, patch: Partial<Channel>) => {
    const next = channels.map((c) => (c.id === id ? { ...c, ...patch } : c));
    setChannels(next);
    localStorage.setItem("channels", JSON.stringify(next));
  };

  const deleteChannel = (id: string) => {
    if (channels.length <= 1) return;
    const next = channels.filter((c) => c.id !== id);
    setChannels(next);
    localStorage.setItem("channels", JSON.stringify(next));
    if (activeChannelId === id) {
      setActiveChannelId(next[0].id);
    }
  };

  const value = useMemo<StoreShape>(
    () => ({
      tasks,
      messages,
      channels,
      users: USERS,
      activeChannelId,
      setActiveChannelId,
      updateTask: (id, patch) =>
        setTasks((ts) =>
          ts.map((t) => {
            if (t.id !== id) return t;
            const next = { ...t, ...patch };
            if (patch.column === "deployed" && !t.completedAt) next.completedAt = Date.now();
            return next;
          })
        ),
      addTask: (t) => setTasks((ts) => [t, ...ts]),
      addMessage: (m) => setMessages((ms) => [...ms, m]),
      jumpRequest,
      requestJump: (messageId, channelId) => {
        consumed.current = false;
        setJumpRequest({ messageId, channelId, ts: Date.now() });
      },
      consumeJump: () => {
        if (consumed.current) return null;
        consumed.current = true;
        return jumpRequest;
      },
      addChannel,
      updateChannel,
      deleteChannel,
      activeProjectId,
      setActiveProjectId: handleSetActiveProjectId,
      projectTabs,
      addProjectTab,
      closeProjectTab,
      sidebarCollapsed,
      setSidebarCollapsed: handleSetSidebarCollapsed,
    }),
    [tasks, messages, channels, activeChannelId, jumpRequest, activeProjectId, projectTabs, sidebarCollapsed]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}

export const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-slate-700/60 text-slate-300 ring-1 ring-slate-600/50",
  medium: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
  high: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  urgent: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40",
};

export const COLUMN_META: Record<ColumnId, { label: string; accent: string; dot: string }> = {
  new: { label: "New", accent: "text-slate-300", dot: "bg-slate-400" },
  active: { label: "Active", accent: "text-sky-300", dot: "bg-sky-400" },
  staging: { label: "Staging", accent: "text-amber-300", dot: "bg-amber-400" },
  deployed: { label: "Deployed", accent: "text-emerald-300", dot: "bg-emerald-400" },
};

export const CREATED_BY_META: Record<CreatedBy, { label: string; className: string }> = {
  ui: { label: "Manual UI", className: "bg-slate-700/60 text-slate-300 ring-1 ring-slate-600/50" },
  slash: { label: "Slash Command", className: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30" },
  ai: { label: "AI Autonomous", className: "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30" },
};

export function userById(id: string | null | undefined, list: User[] = USERS): User | undefined {
  if (!id) return undefined;
  return list.find((u) => u.id === id);
}
