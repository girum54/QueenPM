import { Priority, ColumnId, CreatedBy, User, Channel, Task, Message, ProjectTab } from "../queen-store";

const RAW_API_URL = typeof window !== "undefined"
  ? (import.meta.env.VITE_API_URL || "http://localhost:3001")
  : (process.env.VITE_API_URL || "http://localhost:3001");
const API_BASE_URL = RAW_API_URL.endsWith("/api") ? RAW_API_URL : `${RAW_API_URL.replace(/\/$/, "")}/api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Guard for server-side SSR execution to avoid fetching localhost during SSR compile, or safely fall back
  if (typeof window === "undefined") {
    return [] as unknown as T;
  }

  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`API Request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface ApiProject {
  id: string;
  name: string;
  color: string;
  ownerId: string | null;
  createdAt: string;
  members?: ApiUser[];
}

export const projectsApi = {
  getAll: () => request<ApiProject[]>("/projects"),
  getOne: (id: string) => request<ApiProject>(`/projects/${id}`),
  create: (data: { name: string; color: string; ownerId?: string }) =>
    request<ApiProject>("/projects", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateProjectDto>) =>
    request<ApiProject>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<{ deleted: string }>(`/projects/${id}`, { method: "DELETE" }),
  getMembers: (projectId: string) => request<ApiUser[]>(`/projects/${projectId}/members`),
  addMember: (projectId: string, userId: string) =>
    request<any>(`/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ userId }) }),
  removeMember: (projectId: string, userId: string) =>
    request<any>(`/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
};

type CreateProjectDto = Omit<ApiProject, "id" | "createdAt">;

// ─── Channels ────────────────────────────────────────────────────────────────

export interface ApiChannel {
  id: string;
  name: string;
  projectId: string;
  aiActive: boolean;
  createdAt: string;
}

export const channelsApi = {
  getByProject: (projectId: string) => request<ApiChannel[]>(`/channels?projectId=${projectId}`),
  getOne: (id: string) => request<ApiChannel>(`/channels/${id}`),
  create: (data: { name: string; projectId: string; aiActive?: boolean }) =>
    request<ApiChannel>("/channels", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<ApiChannel, "id" | "createdAt">>) =>
    request<ApiChannel>(`/channels/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<{ deleted: string }>(`/channels/${id}`, { method: "DELETE" }),
  getMembers: (channelId: string) => request<ApiUser[]>(`/channels/${channelId}/members`),
  addMember: (channelId: string, userId: string) =>
    request<any>(`/channels/${channelId}/members`, { method: "POST", body: JSON.stringify({ userId }) }),
  removeMember: (channelId: string, userId: string) =>
    request<any>(`/channels/${channelId}/members/${userId}`, { method: "DELETE" }),
};

// ─── Sprints ─────────────────────────────────────────────────────────────────

export interface ApiSprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  style: string | null;
  durationWeeks: number;  // DB column — value is now days, not weeks
  startDate: string;
  isActive: boolean;
  completedAt: string | null;
  createdAt: string;
  deliverables?: ApiSprintDeliverable[];
  board?: ApiBoard;
  tasks?: Task[];
}

export interface ApiSprintDeliverable {
  id: string;
  sprintId: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export const sprintsApi = {
  getByProject: (projectId: string) => request<ApiSprint[]>(`/sprints?projectId=${projectId}`),
  getActive: (projectId: string) => request<ApiSprint>(`/sprints/active?projectId=${projectId}`),
  getOne: (id: string) => request<ApiSprint>(`/sprints/${id}`),
  create: (data: {
    projectId: string;
    name: string;
    goal?: string;
    style?: string;
    durationWeeks: number;  // value is in days — field name kept for backend compat
    startDate: string;
  }) => request<ApiSprint>("/sprints", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<ApiSprint, "id" | "projectId" | "createdAt">>) =>
    request<ApiSprint>(`/sprints/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  activate: (id: string) => request<ApiSprint>(`/sprints/${id}/activate`, { method: "POST" }),
  complete: (id: string) => request<ApiSprint>(`/sprints/${id}/complete`, { method: "POST" }),
  delete: (id: string) => request<{ deleted: string }>(`/sprints/${id}`, { method: "DELETE" }),

  // Deliverables
  getDeliverables: (sprintId: string) => request<ApiSprintDeliverable[]>(`/sprints/${sprintId}/deliverables`),
  addDeliverable: (sprintId: string, text: string) =>
    request<ApiSprintDeliverable>(`/sprints/${sprintId}/deliverables`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  replaceDeliverables: (sprintId: string, texts: string[]) =>
    request<ApiSprintDeliverable[]>(`/sprints/${sprintId}/deliverables/replace`, {
      method: "POST",
      body: JSON.stringify({ texts }),
    }),
  updateDeliverable: (sprintId: string, deliverableId: string, data: { text?: string; done?: boolean }) =>
    request<ApiSprintDeliverable>(`/sprints/${sprintId}/deliverables/${deliverableId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteDeliverable: (sprintId: string, deliverableId: string) =>
    request<{ deleted: string }>(`/sprints/${sprintId}/deliverables/${deliverableId}`, { method: "DELETE" }),
};

// ─── Boards ──────────────────────────────────────────────────────────────────

export interface ApiBoard {
  id: string;
  sprintId: string;
  projectId: string;
  name: string;
  createdAt: string;
  sprint?: ApiSprint;
}

export const boardsApi = {
  getByProject: (projectId: string) => request<ApiBoard[]>(`/boards?projectId=${projectId}`),
  getBySprint: (sprintId: string) => request<ApiBoard>(`/boards/by-sprint/${sprintId}`),
  getOne: (id: string) => request<ApiBoard>(`/boards/${id}`),
  getTasks: (id: string) => request<Task[]>(`/boards/${id}/tasks`),
  create: (data: { sprintId: string; projectId: string; name?: string }) =>
    request<ApiBoard>("/boards", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, name: string) =>
    request<ApiBoard>(`/boards/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  delete: (id: string) => request<{ deleted: string }>(`/boards/${id}`, { method: "DELETE" }),
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasksApi = {
  getAll: (projectId?: string, sprintId?: string) => {
    const params = new URLSearchParams();
    if (projectId) params.append("projectId", projectId);
    if (sprintId) params.append("sprintId", sprintId);
    return request<Task[]>(`/tasks?${params.toString()}`);
  },
  getOne: (id: string) => request<Task>(`/tasks/${id}`),
  create: (data: Omit<Task, "id" | "createdAt">) =>
    request<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Task, "id" | "createdAt">>) =>
    request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<{ deleted: string }>(`/tasks/${id}`, { method: "DELETE" }),
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const messagesApi = {
  getByChannel: (channelId: string) => request<Message[]>(`/messages?channelId=${channelId}`),
  getOne: (id: string) => request<Message>(`/messages/${id}`),
  create: (data: Omit<Message, "id" | "ts">) =>
    request<Message>("/messages", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Message, "id" | "ts" | "authorId" | "channelId">>) =>
    request<Message>(`/messages/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<{ deleted: string }>(`/messages/${id}`, { method: "DELETE" }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total: number;
  byCol: { new: number; active: number; staging: number; deployed: number };
  avgCompletionDays: number;
  aiCount: number;
  slashCount: number;
  uiCount: number;
  autoRatio: number;
  velocity: number[];
  movingAvg: number;
  perUser: {
    userId: string;
    name: string;
    color: string;
    isAi: boolean;
    total: number;
    done: number;
    avgDays: number | null;
  }[];
  recentTasks: {
    id: string;
    title: string;
    column: string;
    priority: string;
    assigneeId: string | null;
    assigneeName: string | null;
    assigneeColor: string | null;
    createdBy: string;
    createdAt: string;
  }[];
}

export const dashboardApi = {
  getStats: (projectId?: string, sprintId?: string) => {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (sprintId) params.set("sprintId", sprintId);
    const qs = params.toString();
    return request<DashboardStats>(`/dashboard/stats${qs ? `?${qs}` : ""}`);
  },
};

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  username: string | null;
  color: string | null;
  isAi: boolean | null;
  role?: string;
}

export const usersApi = {
  getAll: () => request<ApiUser[]>("/users"),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export interface ApiNotification {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: "task_assigned" | "task_moved" | "mentioned" | "sprint_started" | "sprint_completed" | "task_added";
  title: string;
  body: string | null;
  projectId: string | null;
  taskId: string | null;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  getAll: () => request<ApiNotification[]>("/notifications"),
  markRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request<any>("/notifications/read-all", { method: "PATCH" }),
  delete: (id: string) => request<{ deleted: string }>(`/notifications/${id}`, { method: "DELETE" }),
};

// ─── Music Playlist ───────────────────────────────────────────────────────────

export interface ApiPlaylistTrack {
  id: string;
  channelId: string;
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  addedBy: string;
  position: number;
  createdAt: string;
}

export const playlistApi = {
  getByChannel: (channelId: string) =>
    request<ApiPlaylistTrack[]>(`/music/playlist?channelId=${channelId}`),
  addTrack: (data: {
    channelId: string;
    videoId: string;
    title: string;
    author: string;
    thumbnail: string;
    addedBy: string;
  }) => request<ApiPlaylistTrack>("/music/playlist", { method: "POST", body: JSON.stringify(data) }),
  removeTrack: (id: string) =>
    request<{ deleted: string }>(`/music/playlist/${id}`, { method: "DELETE" }),
};

// ─── Calls ────────────────────────────────────────────────────────────────────

export interface ApiCall {
  id: string;
  projectId: string;
  roomName: string;
  createdBy: string;
  startedAt: string;
  endedAt: string | null;
  callType: "open" | "invite_only";
  status: "active" | "ended";
  participants?: {
    userId: string;
    joinedAt: string;
  }[];
}

export interface ApiActiveCall {
  id: string;
  roomName: string;
  projectId: string;
  callType: "open" | "invite_only";
  startedAt: string;
  participants: {
    userId: string;
    joinedAt: string;
  }[];
}

export interface CallJoinResponse {
  token: string;
  url: string;
  call: ApiCall;
}

export const callsApi = {
  getActive: () => request<ApiActiveCall[]>("/calls/active"),
  getForProject: (projectId: string) => request<ApiCall | null>(`/calls/project/${projectId}`),
  create: (data: { projectId: string; callType?: "open" | "invite_only" }) =>
    request<ApiCall>("/calls/create", { method: "POST", body: JSON.stringify(data) }),
  join: (callId: string) => request<CallJoinResponse>(`/calls/${callId}/join`, { method: "POST" }),
  leave: (callId: string) => request<{ success: boolean }>(`/calls/${callId}/leave`, { method: "POST" }),
  end: (callId: string) => request<{ success: boolean }>(`/calls/${callId}`, { method: "DELETE" }),
  invite: (callId: string, recipientId: string) =>
    request<{ sent: boolean }>(`/calls/${callId}/invite`, {
      method: "POST",
      body: JSON.stringify({ recipientId }),
    }),
  getParticipants: (callId: string) =>
    request<{ userId: string; joinedAt: string }[]>(`/calls/${callId}/participants`),
};
