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
  role?: "member" | "manager" | "admin" | "department_head";
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
  sprintId?: string | null;
  createdAt: number;
  completedAt?: number | null;
  deadline?: string | null;
  estimateDays?: number | null;
  projectId?: string | null;
  parentId?: string | null;
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
  { id: "t1", title: "Fix race condition in checkout webhook", description: "Reproduced under concurrent load — needs idempotency key.", assigneeId: "u2", priority: "urgent", column: "active", createdBy: "ai", originMessageId: "m3", originChannelId: "c2", createdAt: now - 4 * DAY, projectId: "p-x" },
  { id: "t1_sub1", title: "Verify webhook signature validation", assigneeId: "u2", priority: "high", column: "deployed", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 3.5 * DAY, projectId: "p-x", parentId: "t1" },
  { id: "t1_sub2", title: "Add unit tests for deduplication cache", assigneeId: "me", priority: "medium", column: "active", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 3 * DAY, projectId: "p-x", parentId: "t1" },
  { id: "t2", title: "Refactor auth middleware for edge runtime", assigneeId: "u4", priority: "high", column: "new", createdBy: "ai", originMessageId: "m5", originChannelId: "c2", createdAt: now - 3 * DAY, projectId: "p-x" },
  { id: "t3", title: "Design system: token migration to OKLCH", assigneeId: "u3", priority: "medium", column: "staging", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 6 * DAY, projectId: "p-x" },
  { id: "t4", title: "Q3 launch: payments overhaul", assigneeId: "u1", priority: "high", column: "active", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 9 * DAY, projectId: "p-x" },
  { id: "t5", title: "Add Sentry breadcrumbs to ingest pipeline", assigneeId: null, priority: "low", column: "new", createdBy: "slash", originMessageId: "m7", originChannelId: "c2", createdAt: now - 1 * DAY, projectId: "p-x" },
  { id: "t6", title: "Onboarding revamp epic", assigneeId: "u3", priority: "medium", column: "new", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 2 * DAY, projectId: "p-x" },
  { id: "t7", title: "Ship rate limiter to prod", assigneeId: "u2", priority: "high", column: "deployed", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 14 * DAY, completedAt: now - 2 * DAY, projectId: "p-x" },
  { id: "t8", title: "Audit log retention policy", assigneeId: "u4", priority: "medium", column: "deployed", createdBy: "ai", originMessageId: null, originChannelId: null, createdAt: now - 11 * DAY, completedAt: now - 4 * DAY, projectId: "p-x" },
  { id: "t9", title: "Postgres pooler upgrade", assigneeId: "u2", priority: "high", column: "staging", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 5 * DAY, projectId: "p-x" },
  { id: "t10", title: "Triage AI-flagged 500s on /v2/orders", assigneeId: null, priority: "urgent", column: "new", createdBy: "ai", originMessageId: "m2", originChannelId: "c2", createdAt: now - 6 * 3600000, projectId: "p-x" },
  { id: "t11", title: "Migrate billing webhook to v2", assigneeId: "u1", priority: "high", column: "deployed", createdBy: "ai", originMessageId: null, originChannelId: null, createdAt: now - 18 * DAY, completedAt: now - 7 * DAY, projectId: "p-x" },
  { id: "t12", title: "Customer SSO: Okta integration", assigneeId: "u4", priority: "high", column: "active", createdBy: "ui", originMessageId: null, originChannelId: null, createdAt: now - 8 * DAY, projectId: "p-x" },
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
  ownerId?: string | null;
}

const DEFAULT_PROJECT_TABS: ProjectTab[] = [
  { id: "p-x", name: "Project X", color: "from-fuchsia-500 to-violet-600" },
  { id: "p-alpha", name: "Project Alpha", color: "from-slate-600 to-slate-700" },
  { id: "p-delta", name: "Project Delta", color: "from-slate-600 to-slate-700" },
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
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  addTask: (t: Omit<Task, "id"> & { id?: string }) => Promise<Task | null>;
  addMessage: (m: Omit<Message, "id" | "ts"> & { id?: string; ts?: string }) => Promise<Message | null>;
  jumpRequest: JumpRequest | null;
  requestJump: (messageId: string, channelId: string) => void;
  consumeJump: () => JumpRequest | null;
  // Dynamic Channels management
  addChannel: (name: string, aiActive?: boolean) => Promise<void>;
  updateChannel: (id: string, patch: Partial<Channel>) => Promise<void>;
  deleteChannel: (id: string) => Promise<void>;
  // Tabs & sidebar
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  projectTabs: ProjectTab[];
  addProjectTab: (name: string, color?: string) => Promise<void>;
  closeProjectTab: (id: string) => Promise<void>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  activeSprintId: string | null;
  setActiveSprintId: (id: string | null) => void;
  // Call state
  activeCall: ApiCall | null;
  setActiveCall: (call: ApiCall | null) => void;
  // Side panels
  playlistPanelOpen: boolean;
  setPlaylistPanelOpen: (open: boolean) => void;
  queendjPanelOpen: boolean;
  setQueendjPanelOpen: (open: boolean) => void;
}

const StoreCtx = createContext<StoreShape | null>(null);

import { projectsApi, channelsApi, tasksApi, messagesApi, sprintsApi, usersApi, callsApi, type ApiActiveCall, type ApiCall } from "./api/queen.api";
import { useEffect } from "react";
import { useAuth } from "./auth-store";



export function QueenStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeChannelId, setActiveChannelId] = useState("");
  const [projectTabs, setProjectTabs] = useState<ProjectTab[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [jumpRequest, setJumpRequest] = useState<JumpRequest | null>(null);
  const [activeCall, setActiveCall] = useState<ApiCall | null>(null);
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState<boolean>(false);
  const [queendjPanelOpen, setQueendjPanelOpen] = useState<boolean>(false);
  const consumed = useRef(false);

  // Poll active call for current project every 5 seconds
  useEffect(() => {
    if (!activeProjectId) return;
    
    let active = true;
    async function loadActiveCall() {
      try {
        const callData = await callsApi.getForProject(activeProjectId);
        if (active) {
          // Only set active call if user is a participant
          if (callData && callData.participants?.some((p: any) => p.userId === user?.id)) {
            setActiveCall(callData);
          } else {
            setActiveCall(null);
          }
        }
      } catch (e) {
        // Silently catch in-flight errors to prevent noise
      }
    }
    loadActiveCall();
    const interval = setInterval(loadActiveCall, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeProjectId, user?.id]);

  // Real-time board sync via SSE broadcast events
  useEffect(() => {
    const handleTaskSync = (e: Event) => {
      const { action, task, taskId } = (e as CustomEvent<{
        action: 'create' | 'update' | 'delete';
        task?: Record<string, any>;
        taskId?: string;
      }>).detail;

      const mapTask = (t: Record<string, any>): Task => ({
        id: t.id,
        title: t.title,
        description: t.description ?? undefined,
        assigneeId: t.assigneeId,
        priority: t.priority as Priority,
        column: t.column as ColumnId,
        createdBy: t.createdBy as CreatedBy,
        originMessageId: t.originMessageId,
        originChannelId: t.originChannelId,
        sprintId: t.sprintId,
        createdAt: t.createdAt ? Date.parse(t.createdAt) : Date.now(),
        completedAt: t.completedAt ? Date.parse(t.completedAt) : null,
        deadline: t.deadline,
        estimateDays: t.estimateDays,
        projectId: t.projectId,
        parentId: t.parentId,
      });

      if (action === 'create' && task) {
        setTasks((prev) =>
          prev.some((t) => t.id === task.id) ? prev : [mapTask(task), ...prev]
        );
      } else if (action === 'update' && task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? mapTask(task) : t))
        );
      } else if (action === 'delete' && taskId) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    };

    window.addEventListener('queen:task-sync', handleTaskSync);
    return () => window.removeEventListener('queen:task-sync', handleTaskSync);
  }, []);

  // Fetch users on mount
  useEffect(() => {
    async function loadUsers() {
      try {
        const dbUsers = await usersApi.getAll();
        const mappedUsers = dbUsers.map((u) => ({
          id: u.id,
          name: u.name,
          handle: u.username || `@${u.name.toLowerCase().replace(/\s+/g, '')}`,
          color: u.color || 'bg-slate-500',
          isAi: u.isAi ?? false,
          role: (u.role as "member" | "manager" | "admin" | "department_head") ?? "member",
        }));
        setUsers(mappedUsers);
      } catch (e) {
        console.error("Failed to load users:", e);
      }
    }
    loadUsers();
  }, []);

  // Initialize collapsed state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      setSidebarCollapsed(saved === "true");
    } catch (e) { }
  }, []);

  // Listen for active project change requests from notifications/external components
  useEffect(() => {
    const handleSetProject = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string }>).detail;
      if (detail && detail.projectId) {
        handleSetActiveProjectId(detail.projectId);
      }
    };
    window.addEventListener("queen:set-active-project", handleSetProject);
    return () => window.removeEventListener("queen:set-active-project", handleSetProject);
  }, []);

  // 1. Fetch Projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const dbProjects = await projectsApi.getAll();
        const mappedProjects = dbProjects.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          ownerId: p.ownerId,
        }));
        setProjectTabs(mappedProjects);

        const savedProjId = localStorage.getItem("active_project_id");
        if (savedProjId && mappedProjects.some((p) => p.id === savedProjId)) {
          setActiveProjectId(savedProjId);
        } else {
          const first = mappedProjects[0]?.id || "";
          setActiveProjectId(first);
          if (first) localStorage.setItem("active_project_id", first);
        }
      } catch (e) {
        console.error("Failed to load projects:", e);
      }
    }
    loadProjects();
  }, []);

  // 2. Fetch Channels & Tasks when activeProjectId changes
  useEffect(() => {
    if (!activeProjectId) return;

    async function loadChannelsAndTasks() {
      try {
        const dbChannels = await channelsApi.getByProject(activeProjectId);
        const mappedChannels = dbChannels.map((c) => ({
          id: c.id,
          name: c.name,
          aiActive: c.aiActive,
        }));
        setChannels(mappedChannels);

        const savedChanId = localStorage.getItem(`active_channel_id_${activeProjectId}`);
        if (savedChanId && mappedChannels.some((c) => c.id === savedChanId)) {
          setActiveChannelId(savedChanId);
        } else {
          const preferred = mappedChannels.find((c) => c.name === "eng-platform") || mappedChannels[0];
          const first = preferred?.id || "";
          setActiveChannelId(first);
          if (first) localStorage.setItem(`active_channel_id_${activeProjectId}`, first);
        }

        // Fetch active sprint
        try {
          const activeSprint = await sprintsApi.getActive(activeProjectId);
          setActiveSprintId(activeSprint.id);
        } catch (e) {
          console.warn("No active sprint found for project:", e);
          setActiveSprintId(null);
        }

        const dbTasks = await tasksApi.getAll(activeProjectId);
        const mappedTasks = dbTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description ?? undefined,
          assigneeId: t.assigneeId,
          priority: t.priority as Priority,
          column: t.column as ColumnId,
          createdBy: t.createdBy as CreatedBy,
          originMessageId: t.originMessageId,
          originChannelId: t.originChannelId,
          sprintId: t.sprintId,
          createdAt: t.createdAt ? Date.parse(t.createdAt) : Date.now(),
          completedAt: t.completedAt ? Date.parse(t.completedAt) : null,
          deadline: t.deadline,
          estimateDays: t.estimateDays,
          projectId: t.projectId,
          parentId: t.parentId,
        }));
        setTasks(mappedTasks);
      } catch (e) {
        console.error("Failed to load channels/tasks:", e);
      }
    }
    loadChannelsAndTasks();
  }, [activeProjectId]);

  // 3. Fetch Messages when activeChannelId changes
  useEffect(() => {
    if (!activeChannelId) return;

    async function loadMessages() {
      try {
        const dbMessages = await messagesApi.getByChannel(activeChannelId);
        const mappedMessages = dbMessages.map((m: any) => ({
          id: m.id,
          authorId: m.authorId,
          channelId: m.channelId,
          text: m.text ?? undefined,
          ts: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "12:00",
          pinned: m.pinned,
          parentId: m.parentId ?? undefined,
          taskRef: m.taskRef ?? undefined,
        }));
        setMessages(mappedMessages);
      } catch (e) {
        console.error("Failed to load messages:", e);
      }
    }
    loadMessages();
  }, [activeChannelId]);

  const handleSetActiveProjectId = (id: string) => {
    setActiveProjectId(id);
    localStorage.setItem("active_project_id", id);
  };

  const handleSetActiveChannelId = (id: string) => {
    setActiveChannelId(id);
    if (activeProjectId) {
      localStorage.setItem(`active_channel_id_${activeProjectId}`, id);
    }
  };

  const handleSetSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem("sidebar_collapsed", String(collapsed));
  };

  const addProjectTab = async (name: string, color?: string) => {
    const colors = [
      "from-fuchsia-500 to-violet-600",
      "from-sky-500 to-cyan-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-pink-600",
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    try {
      const created = await projectsApi.create({
        name,
        color: color || randomColor,
      });
      const newTab: ProjectTab = {
        id: created.id,
        name: created.name,
        color: created.color,
        ownerId: created.ownerId,
      };
      setProjectTabs((prev) => [...prev, newTab]);
      handleSetActiveProjectId(created.id);
    } catch (e) {
      console.error("Failed to create project:", e);
    }
  };

  const closeProjectTab = async (id: string) => {
    if (projectTabs.length <= 1) return;
    try {
      await projectsApi.delete(id);
      const nextTabs = projectTabs.filter((p) => p.id !== id);
      setProjectTabs(nextTabs);
      if (activeProjectId === id) {
        const remainingIndex = projectTabs.findIndex((p) => p.id === id);
        const nextActive = nextTabs[Math.max(0, remainingIndex - 1)].id;
        handleSetActiveProjectId(nextActive);
      }
    } catch (e) {
      console.error("Failed to delete project:", e);
    }
  };

  const addChannel = async (name: string, aiActive = false) => {
    if (!activeProjectId) return;
    try {
      const created = await channelsApi.create({
        name: name.toLowerCase().replace(/\s+/g, "-"),
        projectId: activeProjectId,
        aiActive,
      });
      const newChan: Channel = {
        id: created.id,
        name: created.name,
        aiActive: created.aiActive,
      };
      setChannels((prev) => [...prev, newChan]);
      handleSetActiveChannelId(created.id);
    } catch (e) {
      console.error("Failed to create channel:", e);
    }
  };

  const updateChannel = async (id: string, patch: Partial<Channel>) => {
    try {
      const updated = await channelsApi.update(id, patch);
      setChannels((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: updated.name, aiActive: updated.aiActive } : c))
      );
    } catch (e) {
      console.error("Failed to update channel:", e);
    }
  };

  const deleteChannel = async (id: string) => {
    if (channels.length <= 1) return;
    try {
      await channelsApi.delete(id);
      const next = channels.filter((c) => c.id !== id);
      setChannels(next);
      if (activeChannelId === id) {
        handleSetActiveChannelId(next[0].id);
      }
    } catch (e) {
      console.error("Failed to delete channel:", e);
    }
  };

  const value = useMemo<StoreShape>(
    () => ({
      tasks,
      messages,
      channels,
      users,
      activeChannelId,
      setActiveChannelId: handleSetActiveChannelId,
      updateTask: async (id, patch) => {
        try {
          const updated = await tasksApi.update(id, patch as any) as any;
          setTasks((ts) =>
            ts.map((t) => {
              if (t.id !== id) return t;
              const completedAt =
                patch.column === "deployed"
                  ? Date.now()
                  : updated.completedAt
                    ? Date.parse(updated.completedAt)
                    : t.completedAt ?? null;
              return { ...t, ...patch, completedAt };
            })
          );
        } catch (e) {
          console.error("Failed to update task:", e);
        }
      },
      addTask: async (t) => {
        try {
          const created = await tasksApi.create({
            title: t.title,
            description: t.description,
            assigneeId: t.assigneeId,
            priority: t.priority,
            column: t.column,
            createdBy: t.createdBy,
            originMessageId: t.originMessageId,
            originChannelId: t.originChannelId,
            projectId: (t.projectId ?? activeProjectId) || null,
            sprintId: t.sprintId ?? activeSprintId ?? null,
            parentId: t.parentId,
            deadline: t.deadline || undefined,
            estimateDays: t.estimateDays || undefined,
          } as any) as any;
          const mapped: Task = {
            id: created.id,
            title: created.title,
            description: created.description ?? undefined,
            assigneeId: created.assigneeId,
            priority: created.priority as Priority,
            column: created.column as ColumnId,
            createdBy: created.createdBy as CreatedBy,
            originMessageId: created.originMessageId,
            originChannelId: created.originChannelId,
            sprintId: created.sprintId,
            createdAt: created.createdAt ? Date.parse(created.createdAt) : Date.now(),
            completedAt: created.completedAt ? Date.parse(created.completedAt) : null,
            deadline: created.deadline,
            estimateDays: created.estimateDays,
            projectId: created.projectId,
            parentId: created.parentId,
          };
          setTasks((ts) => [mapped, ...ts]);
          return mapped;
        } catch (e) {
          console.error("Failed to add task:", e);
          return null;
        }
      },
      addMessage: async (m) => {
        try {
          const created = await messagesApi.create({
            authorId: m.authorId,
            channelId: m.channelId,
            text: m.text,
            pinned: m.pinned,
            parentId: m.parentId,
            taskRef: m.taskRef,
          }) as any;
          const mapped: Message = {
            id: created.id,
            authorId: created.authorId,
            channelId: created.channelId,
            text: created.text ?? undefined,
            ts: created.createdAt ? new Date(created.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "12:00",
            pinned: created.pinned,
            parentId: created.parentId ?? undefined,
            taskRef: created.taskRef ?? undefined,
          };
          setMessages((ms) => [...ms, mapped]);
          return mapped;
        } catch (e) {
          console.error("Failed to add message:", e);
          return null;
        }
      },
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
      activeSprintId,
      setActiveSprintId,
      activeCall,
      setActiveCall,
      playlistPanelOpen,
      setPlaylistPanelOpen,
      queendjPanelOpen,
      setQueendjPanelOpen,
    }),
    [tasks, messages, channels, users, activeChannelId, jumpRequest, activeProjectId, projectTabs, sidebarCollapsed, activeSprintId, activeCall, playlistPanelOpen, queendjPanelOpen]
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
