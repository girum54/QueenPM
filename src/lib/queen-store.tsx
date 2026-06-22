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



export interface ProjectTab {
  id: string;
  name: string;
  color: string;
  ownerId?: string | null;
}



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
}

const StoreCtx = createContext<StoreShape | null>(null);

import { projectsApi, channelsApi, tasksApi, messagesApi, sprintsApi, usersApi } from "./api/queen.api";
import { useEffect } from "react";



export function QueenStoreProvider({ children }: { children: ReactNode }) {
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
  const consumed = useRef(false);

  // Fetch users on mount
  useEffect(() => {
    async function loadUsers() {
      try {
        const dbUsers = await usersApi.getAll();
        const slateColors = ['bg-slate-500', 'bg-slate-600', 'bg-slate-700', 'bg-slate-800', 'bg-slate-900'];
        const mappedUsers = dbUsers.map((u, i) => ({
          id: u.id,
          name: u.name,
          handle: u.username || `@${u.name.toLowerCase().replace(/\s+/g, '')}`,
          color: u.isAi ? 'bg-fuchsia-600' : slateColors[i % slateColors.length],
          isAi: u.isAi ?? false,
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
      "from-slate-600 to-slate-700",
      "from-slate-700 to-slate-800",
      "from-slate-800 to-slate-900",
      "from-fuchsia-900 to-slate-900",
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
    }),
    [tasks, messages, channels, users, activeChannelId, jumpRequest, activeProjectId, projectTabs, sidebarCollapsed, activeSprintId]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}

export const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-slate-900 text-slate-500 ring-1 ring-slate-800",
  medium: "bg-slate-800 text-slate-300 ring-1 ring-slate-700",
  high: "bg-slate-700 text-slate-100 ring-1 ring-slate-600",
  urgent: "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30",
};

export const COLUMN_META: Record<ColumnId, { label: string; accent: string; dot: string }> = {
  new: { label: "New", accent: "text-slate-500", dot: "bg-slate-600" },
  active: { label: "Active", accent: "text-slate-200", dot: "bg-slate-300" },
  staging: { label: "Staging", accent: "text-slate-400", dot: "bg-slate-500" },
  deployed: { label: "Deployed", accent: "text-slate-600", dot: "bg-slate-800" },
};

export const CREATED_BY_META: Record<CreatedBy, { label: string; className: string }> = {
  ui: { label: "Manual UI", className: "bg-slate-700/60 text-slate-300 ring-1 ring-slate-600/50" },
  slash: { label: "Slash Command", className: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30" },
  ai: { label: "AI Autonomous", className: "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30" },
};

export function userById(id: string | null | undefined, list: User[]): User | undefined {
  if (!id) return undefined;
  return list.find((u) => u.id === id);
}
