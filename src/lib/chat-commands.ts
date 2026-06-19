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
] as const;
