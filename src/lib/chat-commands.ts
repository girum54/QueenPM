import type { CreatedBy, Priority } from "./queen-store";

export interface ParsedCreateTask {
  title: string;
  assigneeHandle?: string;
  priority?: Priority;
  createdBy: CreatedBy;
}

const CREATE_PREFIXES = ["/createtask", "/todo", "/task"] as const;

export function isCreateTaskCommand(input: string): boolean {
  const lower = input.trim().toLowerCase();
  return CREATE_PREFIXES.some((p) => lower.startsWith(p));
}

export function isQueenCommand(input: string): boolean {
  return input.trim().toLowerCase().startsWith("@queen");
}

export function isGeminiCommand(input: string): boolean {
  return input.trim().toLowerCase().startsWith("@gemini");
}

export type ParsedQueenDjCommand =
  | { type: "play"; query: string }
  | { type: "play_playlist"; playlistName?: string }
  | { type: "skip" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "clear" }
  | { type: "add_playlist"; url: string }
  | { type: "remove_playlist"; videoId: string }
  | { type: "show_playlist" };

export function isQueenDjCommand(input: string): boolean {
  const trimmed = input.trim().toLowerCase();
  return trimmed.startsWith("!play") ||
         trimmed === "!skip" ||
         trimmed === "!pause" ||
         trimmed === "!resume" ||
         trimmed === "!clear" ||
         trimmed.startsWith("!add") ||
         trimmed.startsWith("!remove") ||
         trimmed === "!playlist";
}

export function parseQueenDjCommand(input: string): ParsedQueenDjCommand | null {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "!skip") return { type: "skip" };
  if (lower === "!pause") return { type: "pause" };
  if (lower === "!resume") return { type: "resume" };
  if (lower === "!clear") return { type: "clear" };
  if (lower === "!playlist") return { type: "show_playlist" };

  // Handle !add <url>
  if (lower.startsWith("!add")) {
    const url = trimmed.slice(4).trim();
    if (url) return { type: "add_playlist", url };
    return null;
  }

  // Handle !remove <video_id>
  if (lower.startsWith("!remove")) {
    const videoId = trimmed.slice(7).trim();
    if (videoId) return { type: "remove_playlist", videoId };
    return null;
  }

  if (!lower.startsWith("!play")) return null;
  const rest = trimmed.slice(5).trim();
  if (!rest) {
    return { type: "play", query: "" };
  }

  if (lower.startsWith("playlist")) {
    const playlistName = rest.slice("playlist".length).trim();
    return { type: "play_playlist", playlistName: playlistName || undefined };
  }

  return { type: "play", query: rest };
}

export function parseCreateTaskCommand(input: string): ParsedCreateTask | null {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  let rest = "";
  if (lower.startsWith("/createtask")) rest = trimmed.slice("/createtask".length).trim();
  else if (lower.startsWith("/todo")) rest = trimmed.slice(5).trim();
  else if (lower.startsWith("/task")) rest = trimmed.slice(5).trim();
  else return null;

  const priorityMatch = rest.match(/\bp:(urgent|high|medium|low)\b/i);
  const priority = priorityMatch
    ? (priorityMatch[1].toLowerCase() as Priority)
    : undefined;
  if (priorityMatch) rest = rest.replace(priorityMatch[0], "").trim();

  const mentionMatch = rest.match(/(@[\w-]+)/);
  const assigneeHandle = mentionMatch?.[1];
  if (mentionMatch) rest = rest.replace(mentionMatch[0], "").trim();

  const title = rest.replace(/\s+/g, " ").trim() || "Untitled task";
  return { title, assigneeHandle, priority, createdBy: "slash" };
}

export function parseQueenCommand(input: string): ParsedCreateTask | null {
  const trimmed = input.trim();
  if (!trimmed.toLowerCase().startsWith("@queen")) return null;
  const title = trimmed.slice(trimmed.indexOf(" ") + 1).trim() || "Investigate and scope";
  return { title, createdBy: "ai" };
}

/** Derive a task title from free-form chat text */
export function titleFromMessage(text: string, maxLen = 120): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen - 1) + "…";
}

export const CHAT_QUICK_ACTIONS = [
  {
    cmd: "/createtask",
    example: "/createtask Fix webhook race @dan p:high",
    desc: "Create a task and open the assign modal",
    icon: "zap" as const,
  },
  {
    cmd: "/todo",
    example: "/todo Ship rate limiter @samrawit",
    desc: "Shortcut alias for /createtask",
    icon: "zap" as const,
  },
  {
    cmd: "@queen",
    example: "@queen scope the auth middleware migration",
    desc: "Queen PM will handle this later — creates a tracked task for now",
    icon: "crown" as const,
  },
  {
    cmd: "@gemini",
    example: "@gemini create a task to fix the auth bug",
    desc: "Use Gemini AI to handle tasks, edit, or answer questions",
    icon: "sparkles" as const,
  },
  {
    cmd: "!play",
    example: "!play lofi beats",
    desc: "QueenDJ plays a track from YouTube or your playlist",
    icon: "music" as const,
  },
  {
    cmd: "!play playlist",
    example: "!play playlist",
    desc: "QueenDJ plays your channel's playlist",
    icon: "list-music" as const,
  },
  {
    cmd: "!add",
    example: "!add https://youtube.com/watch?v=xyz",
    desc: "Add a track to your channel's playlist",
    icon: "plus" as const,
  },
  {
    cmd: "!playlist",
    example: "!playlist",
    desc: "Show your channel's playlist",
    icon: "list-music" as const,
  },
] as const;
