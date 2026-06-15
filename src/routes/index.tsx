import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Hash, Bot, ChevronDown, ChevronRight, Pin, Search, Plus, Send,
  Folder, BarChart3, ExternalLink, Crown, CheckCircle2, Circle,
  Clock, Zap, Settings, Bell, Sparkles, MessageSquare, GitBranch,
  PanelRightClose, PanelRightOpen,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Queen PM — AI Project Manager" },
      { name: "description", content: "AI-native project management woven into your team chat." },
    ],
  }),
  component: QueenPM,
});

// ---------- Types ----------
type Priority = "low" | "medium" | "high" | "urgent";
type Status = "todo" | "in_progress" | "review" | "done";

interface User { id: string; name: string; handle: string; color: string; isAi?: boolean }
interface Message {
  id: string;
  authorId: string;
  channelId: string;
  text?: string;
  ts: string;
  pinned?: boolean;
  parentId?: string;
  taskCard?: Task;
}
interface Task {
  id: string;
  title: string;
  assigneeId: string;
  priority: Priority;
  status: Status;
  group: "sprint" | "epic" | "milestone";
  originMessageId: string | null;
  createdBy: "ui" | "ai";
}
interface Channel { id: string; name: string; aiActive?: boolean }

// ---------- Mock Data ----------
const USERS: User[] = [
  { id: "u1", name: "Mira Chen", handle: "@mira", color: "bg-rose-500" },
  { id: "u2", name: "Daniel Park", handle: "@dan", color: "bg-amber-500" },
  { id: "u3", name: "Sofia Reyes", handle: "@sofia", color: "bg-emerald-500" },
  { id: "u4", name: "Kai Tanaka", handle: "@kai", color: "bg-sky-500" },
  { id: "uq", name: "Queen PM", handle: "@queen", color: "bg-gradient-to-br from-fuchsia-500 to-violet-600", isAi: true },
  { id: "me", name: "You", handle: "@you", color: "bg-slate-500" },
];

const CHANNELS: Channel[] = [
  { id: "c1", name: "general" },
  { id: "c2", name: "eng-platform", aiActive: true },
  { id: "c3", name: "design-crit" },
  { id: "c4", name: "sprint-q3", aiActive: true },
  { id: "c5", name: "incidents", aiActive: true },
  { id: "c6", name: "watercooler" },
];

const INITIAL_TASKS: Task[] = [
  { id: "t1", title: "Fix race condition in checkout webhook", assigneeId: "u2", priority: "urgent", status: "in_progress", group: "sprint", originMessageId: "m3", createdBy: "ai" },
  { id: "t2", title: "Refactor auth middleware for edge runtime", assigneeId: "u4", priority: "high", status: "todo", group: "sprint", originMessageId: "m5", createdBy: "ai" },
  { id: "t3", title: "Design system: token migration to OKLCH", assigneeId: "u3", priority: "medium", status: "review", group: "epic", originMessageId: null, createdBy: "ui" },
  { id: "t4", title: "Q3 launch: payments overhaul", assigneeId: "u1", priority: "high", status: "in_progress", group: "milestone", originMessageId: null, createdBy: "ui" },
  { id: "t5", title: "Add Sentry breadcrumbs to ingest pipeline", assigneeId: "u2", priority: "low", status: "todo", group: "sprint", originMessageId: "m7", createdBy: "ai" },
  { id: "t6", title: "Onboarding revamp epic", assigneeId: "u3", priority: "medium", status: "todo", group: "epic", originMessageId: null, createdBy: "ui" },
];

const INITIAL_MESSAGES: Message[] = [
  { id: "m1", authorId: "u1", channelId: "c2", ts: "9:02", text: "morning team — pushing the new ingest worker to staging in ~30", pinned: true },
  { id: "m2", authorId: "u4", channelId: "c2", ts: "9:14", text: "nice. fyi the checkout webhook is flaky again, saw two 500s overnight" },
  { id: "m3", authorId: "u2", channelId: "c2", ts: "9:16", text: "yeah it's the same race we hit last month. I can repro locally" },
  { id: "m4", authorId: "uq", channelId: "c2", ts: "9:16", taskCard: INITIAL_TASKS[0] },
  { id: "m5", authorId: "u1", channelId: "c2", ts: "9:21", text: "@queen we should also get the auth middleware ported to edge before Q3 launch, can you track that" },
  { id: "m6", authorId: "uq", channelId: "c2", ts: "9:21", taskCard: INITIAL_TASKS[1] },
  { id: "m7", authorId: "u4", channelId: "c2", ts: "9:33", text: "small thing — we should add sentry breadcrumbs to the ingest pipeline so we can actually debug these", parentId: "m1" },
  { id: "m8", authorId: "uq", channelId: "c2", ts: "9:33", taskCard: INITIAL_TASKS[4] },
  { id: "m9", authorId: "u3", channelId: "c2", ts: "10:02", text: "design crit at 2, will share the token migration prototype" },
  { id: "m10", authorId: "u2", channelId: "c2", ts: "10:18", text: "repro confirmed. patch incoming, will tag the PR to the task", parentId: "m3" },
];

// ---------- Helpers ----------
const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-slate-700/60 text-slate-300 ring-1 ring-slate-600/50",
  medium: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
  high: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  urgent: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40",
};

const STATUS_LABEL: Record<Status, string> = {
  todo: "Todo", in_progress: "In Progress", review: "In Review", done: "Done",
};

const STATUS_ICON: Record<Status, React.ReactNode> = {
  todo: <Circle className="size-3" />,
  in_progress: <Clock className="size-3 text-sky-400" />,
  review: <Zap className="size-3 text-amber-400" />,
  done: <CheckCircle2 className="size-3 text-emerald-400" />,
};

function userById(id: string) {
  return USERS.find(u => u.id === id)!;
}

// ---------- Component ----------
function QueenPM() {
  const [activeChannel, setActiveChannel] = useState("c2");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [input, setInput] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [rightTab, setRightTab] = useState<"tasks" | "analytics">("tasks");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    sprint: true, epic: true, milestone: false,
  });
  const [flashId, setFlashId] = useState<string | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const streamRef = useRef<HTMLDivElement>(null);

  const channelMessages = useMemo(
    () => messages.filter(m => m.channelId === activeChannel),
    [messages, activeChannel]
  );

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [activeChannel]);

  const handleInputChange = (v: string) => {
    setInput(v);
    const trigger = v.trim();
    setShowAutocomplete(trigger.startsWith("/") || trigger.toLowerCase().startsWith("@queen"));
  };

  const spawnTask = (title: string, byAi: boolean, assigneeHandle?: string) => {
    const assignee = USERS.find(u => u.handle === assigneeHandle) ?? USERS[Math.floor(Math.random() * 4)];
    const priorities: Priority[] = ["low", "medium", "high", "urgent"];
    const priority = priorities[Math.floor(Math.random() * 4)];
    const newMsgId = `m${Date.now()}`;
    const taskCardMsgId = `m${Date.now() + 1}`;
    const newTask: Task = {
      id: `t${Date.now()}`,
      title,
      assigneeId: assignee.id,
      priority,
      status: "todo",
      group: "sprint",
      originMessageId: newMsgId,
      createdBy: byAi ? "ai" : "ui",
    };
    const userMsg: Message = {
      id: newMsgId, authorId: "me", channelId: activeChannel,
      ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: byAi ? `@queen ${title}` : `/todo ${title}${assigneeHandle ? ` ${assigneeHandle}` : ""}`,
    };
    const cardMsg: Message = {
      id: taskCardMsgId, authorId: "uq", channelId: activeChannel,
      ts: userMsg.ts, taskCard: newTask,
    };
    setMessages(m => [...m, userMsg, cardMsg]);
    setTasks(t => [newTask, ...t]);
    setTimeout(() => {
      streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const handleSend = () => {
    const v = input.trim();
    if (!v) return;
    if (v.toLowerCase().startsWith("/todo")) {
      const rest = v.slice(5).trim();
      const mentionMatch = rest.match(/@\w+/);
      const handle = mentionMatch?.[0];
      const title = rest.replace(/@\w+/, "").trim() || "Untitled task";
      spawnTask(title, false, handle);
    } else if (v.toLowerCase().startsWith("@queen")) {
      const title = v.slice(6).trim() || "Investigate and scope";
      spawnTask(title, true);
    } else {
      const newMsg: Message = {
        id: `m${Date.now()}`, authorId: "me", channelId: activeChannel,
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: v,
      };
      setMessages(m => [...m, newMsg]);
      setTimeout(() => {
        streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    }
    setInput("");
    setShowAutocomplete(false);
  };

  const jumpToOrigin = (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (msg && msg.channelId !== activeChannel) setActiveChannel(msg.channelId);
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setFlashId(msgId);
        setTimeout(() => setFlashId(null), 2000);
      }
    }, 80);
  };

  const autocompleteOptions = [
    { cmd: "/todo [Task Title] @username", desc: "Bypass AI — create a task instantly", icon: <Zap className="size-4 text-amber-400" /> },
    { cmd: "@Queen PM [Natural language requirement]", desc: "Let Queen PM scope and spawn the task", icon: <Crown className="size-4 text-fuchsia-400" /> },
  ];

  return (
    <div className={`h-screen w-screen overflow-hidden grid bg-slate-950 text-slate-200 font-sans antialiased selection:bg-fuchsia-500/30 transition-[grid-template-columns] duration-300 ease-in-out ${rightPanelOpen ? "grid-cols-[280px_1fr_400px]" : "grid-cols-[280px_1fr_0px]"}`}>
      {/* ============ LEFT: NAVIGATION RAIL ============ */}
      <aside className="border-r border-slate-800/80 bg-slate-900/40 flex flex-col">
        {/* Workspace selector */}
        <div className="p-3 border-b border-slate-800/80 relative">
          <button
            onClick={() => setWorkspaceOpen(o => !o)}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-800/60 transition group"
          >
            <div className="size-8 rounded-md bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center shadow-lg shadow-fuchsia-500/20">
              <Crown className="size-4 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-slate-100 leading-tight">Team X</div>
              <div className="text-[11px] text-slate-500 leading-tight">12 members · Pro</div>
            </div>
            <ChevronDown className={`size-4 text-slate-500 transition ${workspaceOpen ? "rotate-180" : ""}`} />
          </button>
          {workspaceOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 z-30 rounded-lg border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
              {["Queen PM ", "Side Project", "Personal"].map((w, i) => (
                <button key={w} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-800/60 flex items-center gap-2">
                  <div className={`size-5 rounded ${i === 0 ? "bg-gradient-to-br from-fuchsia-500 to-violet-600" : "bg-slate-700"}`} />
                  {w}
                </button>
              ))}
              <div className="border-t border-slate-800">
                <button className="w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800/60 flex items-center gap-2">
                  <Plus className="size-3.5" /> New workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-800/50 border border-slate-800 text-xs text-slate-500">
            <Search className="size-3.5" />
            <span>Jump to…</span>
            <span className="ml-auto px-1.5 py-0.5 rounded bg-slate-900/60 text-[10px] font-mono">⌘K</span>
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Channels</span>
            <Plus className="size-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          {CHANNELS.map(ch => {
            const active = ch.id === activeChannel;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition group ${active ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
              >
                {ch.aiActive ? (
                  <Bot className={`size-4 shrink-0 ${active ? "text-fuchsia-400" : "text-slate-500 group-hover:text-fuchsia-400"}`} />
                ) : (
                  <Hash className="size-4 shrink-0 text-slate-500" />
                )}
                <span className="flex-1 text-left truncate">{ch.name}</span>
                {ch.aiActive && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-semibold text-emerald-300 tracking-wide">AI</span>
                  </span>
                )}
              </button>
            );
          })}

          <div className="flex items-center justify-between px-2 py-1.5 mt-4">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Direct Messages</span>
          </div>
          {USERS.filter(u => u.id !== "me").slice(0, 4).map(u => (
            <button key={u.id} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-200">
              <div className={`size-5 rounded-full ${u.color} grid place-items-center text-[10px] font-bold text-white`}>
                {u.isAi ? <Crown className="size-3" /> : u.name[0]}
              </div>
              <span className="truncate">{u.name}</span>
              {u.isAi && <Sparkles className="size-3 text-fuchsia-400 ml-auto" />}
            </button>
          ))}
        </div>

        {/* User footer */}
        <div className="border-t border-slate-800/80 p-3 flex items-center gap-2">
          <div className="size-8 rounded-md bg-slate-700 grid place-items-center text-xs font-bold">Y</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">You</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Online
            </div>
          </div>
          <Settings className="size-4 text-slate-500 hover:text-slate-300 cursor-pointer" />
        </div>
      </aside>

      {/* ============ CENTER: CHAT CANVAS ============ */}
      <section className="flex flex-col min-w-0 bg-slate-950">
        {/* Header */}
        <header className="h-14 border-b border-slate-800/80 px-5 flex items-center gap-3 shrink-0">
          {CHANNELS.find(c => c.id === activeChannel)?.aiActive ? (
            <Bot className="size-5 text-fuchsia-400" />
          ) : (
            <Hash className="size-5 text-slate-500" />
          )}
          <h1 className="text-base font-semibold text-slate-100">
            {CHANNELS.find(c => c.id === activeChannel)?.name}
          </h1>
          {CHANNELS.find(c => c.id === activeChannel)?.aiActive && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 text-[10px] font-semibold text-emerald-300 tracking-wide">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              QUEEN PM ACTIVE
            </span>
          )}
          <div className="ml-auto flex items-center gap-3 text-slate-500">
            <Pin className="size-4 hover:text-slate-300 cursor-pointer" />
            <Bell className="size-4 hover:text-slate-300 cursor-pointer" />
            <div className="flex -space-x-1.5">
              {USERS.slice(0, 4).map(u => (
                <div key={u.id} className={`size-6 rounded-full ${u.color} grid place-items-center text-[10px] font-bold text-white ring-2 ring-slate-950`}>
                  {u.isAi ? <Crown className="size-3" /> : u.name[0]}
                </div>
              ))}
            </div>
            <button
              onClick={() => setRightPanelOpen(o => !o)}
              className="p-1.5 rounded-md hover:bg-slate-800 hover:text-slate-300 transition"
              title={rightPanelOpen ? "Collapse side panel" : "Expand side panel"}
            >
              {rightPanelOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div ref={streamRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          {channelMessages.map((m, idx) => {
            const author = userById(m.authorId);
            const prev = channelMessages[idx - 1];
            const grouped = prev && prev.authorId === m.authorId && !m.taskCard && !prev.taskCard;
            const flashing = flashId === m.id;
            return (
              <div
                key={m.id}
                id={`msg-${m.id}`}
                className={`group relative rounded-lg px-3 py-1.5 transition-all duration-300 ${m.parentId ? "ml-8 border-l-2 border-slate-800 pl-4" : ""
                  } ${flashing
                    ? "bg-fuchsia-500/10 ring-1 ring-fuchsia-500/50 shadow-lg shadow-fuchsia-500/20"
                    : "hover:bg-slate-900/40"}`}
              >
                {m.pinned && (
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 mb-1">
                    <Pin className="size-3" /> PINNED
                  </div>
                )}
                {m.parentId && !grouped && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                    <GitBranch className="size-3" /> replying in thread
                  </div>
                )}
                {!grouped && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <div className={`size-7 rounded-md ${author.color} grid place-items-center text-xs font-bold text-white shrink-0 -ml-10 mt-0.5 absolute`}>
                      {author.isAi ? <Crown className="size-3.5" /> : author.name[0]}
                    </div>
                    <span className={`text-sm font-semibold ${author.isAi ? "text-fuchsia-300" : "text-slate-100"}`}>
                      {author.name}
                    </span>
                    {author.isAi && (
                      <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/15 ring-1 ring-fuchsia-500/30 text-[9px] font-bold text-fuchsia-300 tracking-wider">
                        AI
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500">{m.ts}</span>
                  </div>
                )}
                {m.text && (
                  <div className="text-sm text-slate-300 leading-relaxed">
                    {m.text.split(/(@\w+)/g).map((part, i) =>
                      part.startsWith("@") ? (
                        <span key={i} className="text-fuchsia-300 bg-fuchsia-500/10 rounded px-1 py-0.5 font-medium">{part}</span>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </div>
                )}
                {m.taskCard && <TaskCard task={m.taskCard} />}
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div className="px-5 pb-5 pt-2 shrink-0 relative">
          {showAutocomplete && (
            <div className="absolute bottom-full left-5 right-5 mb-2 rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-800">
                Commands
              </div>
              {autocompleteOptions.map(opt => (
                <button
                  key={opt.cmd}
                  onClick={() => {
                    setInput(opt.cmd.startsWith("/") ? "/todo Polish onboarding flow @sofia" : "@queen Investigate elevated 500s on /api/checkout this morning");
                    setShowAutocomplete(false);
                  }}
                  className="w-full px-3 py-2.5 flex items-start gap-3 hover:bg-slate-800/60 text-left transition"
                >
                  <div className="mt-0.5">{opt.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-slate-200">{opt.cmd}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 focus-within:border-fuchsia-500/40 focus-within:bg-slate-900 transition">
            <input
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Message #${CHANNELS.find(c => c.id === activeChannel)?.name}  ·  type / or @queen`}
              className="w-full bg-transparent px-4 py-3 text-sm placeholder:text-slate-600 focus:outline-none"
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800/60">
              <div className="flex items-center gap-1 text-slate-500">
                <button className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-300"><Plus className="size-4" /></button>
                <button className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-300"><Sparkles className="size-4" /></button>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold transition shadow-lg shadow-fuchsia-500/20"
              >
                <Send className="size-3.5" /> Send
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ RIGHT: EXECUTION FLANK ============ */}
      <aside className={`border-l border-slate-800/80 bg-slate-900/40 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${rightPanelOpen ? "min-w-0 opacity-100" : "w-0 min-w-0 opacity-0 pointer-events-none"}`}>
        {/* Tabs */}
        <div className="h-14 border-b border-slate-800/80 px-4 flex items-center gap-1 shrink-0">
          {([
            { id: "tasks", label: "Task Folders", icon: Folder },
            { id: "analytics", label: "Velocity", icon: BarChart3 },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setRightTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${rightTab === t.id
                ? "bg-slate-800 text-slate-100"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
                }`}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
          <div className="ml-auto text-[11px] text-slate-500">{tasks.length} items</div>
        </div>

        {rightTab === "tasks" ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(["sprint", "epic", "milestone"] as const).map(group => {
              const items = tasks.filter(t => t.group === group);
              const open = openGroups[group];
              const labels = { sprint: "Sprint Backlog", epic: "Epics", milestone: "Milestones" };
              return (
                <div key={group} className="rounded-lg border border-slate-800/80 bg-slate-900/40 overflow-hidden">
                  <button
                    onClick={() => setOpenGroups(g => ({ ...g, [group]: !g[group] }))}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-800/40 transition"
                  >
                    {open ? <ChevronDown className="size-3.5 text-slate-500" /> : <ChevronRight className="size-3.5 text-slate-500" />}
                    <Folder className="size-3.5 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-200">{labels[group]}</span>
                    <span className="ml-auto text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">{items.length}</span>
                  </button>
                  {open && (
                    <div className="px-2 pb-2 space-y-1">
                      {items.map(t => {
                        const assignee = userById(t.assigneeId);
                        return (
                          <div key={t.id} className="group rounded-md p-2.5 bg-slate-950/50 hover:bg-slate-950 border border-transparent hover:border-slate-800 transition">
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5">{STATUS_ICON[t.status]}</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-slate-200 leading-snug">{t.title}</div>
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${PRIORITY_STYLES[t.priority]}`}>
                                    {t.priority}
                                  </span>
                                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/60 text-[10px] text-slate-400`}>
                                    <div className={`size-3 rounded-full ${assignee.color} grid place-items-center text-[8px] font-bold text-white`}>
                                      {assignee.isAi ? "Q" : assignee.name[0]}
                                    </div>
                                    {assignee.handle}
                                  </div>
                                  {t.createdBy === "ai" && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-fuchsia-500/10 ring-1 ring-fuchsia-500/20 text-[9px] font-semibold text-fuchsia-300">
                                      <Crown className="size-2.5" /> AI
                                    </span>
                                  )}
                                  {t.originMessageId && (
                                    <button
                                      onClick={() => jumpToOrigin(t.originMessageId!)}
                                      className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-fuchsia-500/20 hover:text-fuchsia-300 text-[10px] text-slate-400 transition"
                                    >
                                      <ExternalLink className="size-2.5" />
                                      Origin
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {items.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-slate-600">No items in this folder</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <AnalyticsView tasks={tasks} />
        )}
      </aside>
    </div>
  );
}

// ---------- Inline Task Card (rendered in chat) ----------
function TaskCard({ task }: { task: Task }) {
  const assignee = userById(task.assigneeId);
  return (
    <div className="mt-2 rounded-xl border border-fuchsia-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-fuchsia-950/30 overflow-hidden shadow-lg shadow-fuchsia-500/5">
      <div className="px-4 py-2 border-b border-fuchsia-500/10 bg-fuchsia-500/5 flex items-center gap-2">
        <Crown className="size-3.5 text-fuchsia-400" />
        <span className="text-[10px] font-bold tracking-widest text-fuchsia-300 uppercase">
          {task.createdBy === "ai" ? "AI Spawned Task" : "Task Created"}
        </span>
        <span className="ml-auto text-[10px] text-slate-500 font-mono">{task.id.toUpperCase()}</span>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="size-4 text-slate-500 mt-1" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-slate-100 leading-snug">{task.title}</div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/60 ring-1 ring-slate-700/50">
                <div className={`size-4 rounded-full ${assignee.color} grid place-items-center text-[9px] font-bold text-white`}>
                  {assignee.name[0]}
                </div>
                <span className="text-xs text-slate-300 font-medium">{assignee.handle}</span>
              </div>
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${PRIORITY_STYLES[task.priority]}`}>
                {task.priority}
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/60 ring-1 ring-slate-700/50 text-xs text-slate-300">
                {STATUS_ICON[task.status]} {STATUS_LABEL[task.status]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/60">
          <button className="flex-1 px-3 py-1.5 rounded-md bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs font-semibold transition shadow shadow-fuchsia-500/20">
            Accept & Assign
          </button>
          <button className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition">
            Edit
          </button>
          <button className="px-3 py-1.5 rounded-md text-slate-500 hover:text-slate-300 text-xs">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Analytics ----------
function AnalyticsView({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter(t => t.status === "done").length;
  const inProg = tasks.filter(t => t.status === "in_progress").length;
  const completion = Math.round((done / Math.max(tasks.length, 1)) * 100);

  const metrics = [
    { label: "Average Completion Time", value: "2.4d", trend: "-12%", positive: true },
    { label: "Moving Average Velocity", value: "34 pts", trend: "+8%", positive: true },
    { label: "AI Task Acceptance Rate", value: "87%", trend: "+3%", positive: true },
    { label: "Blocked Tasks", value: "2", trend: "+1", positive: false },
  ];

  const bars = [
    { label: "Sprint Progress", value: completion, color: "from-fuchsia-500 to-violet-500" },
    { label: "In-Progress Load", value: 62, color: "from-sky-500 to-cyan-500" },
    { label: "Review Queue", value: 28, color: "from-amber-500 to-orange-500" },
    { label: "Backlog Health", value: 74, color: "from-emerald-500 to-teal-500" },
  ];

  const sparkline = [12, 18, 14, 22, 19, 28, 24, 34, 30, 38, 32, 41];
  const max = Math.max(...sparkline);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <div>
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-3">This Sprint</div>
        <div className="grid grid-cols-2 gap-2">
          {metrics.map(m => (
            <div key={m.label} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="text-[10px] text-slate-500 leading-tight">{m.label}</div>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <div className="text-xl font-bold text-slate-100">{m.value}</div>
                <div className={`text-[10px] font-semibold ${m.positive ? "text-emerald-400" : "text-rose-400"}`}>
                  {m.trend}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-3">Throughput (12 weeks)</div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-end gap-1 h-24">
            {sparkline.map((v, i) => (
              <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-fuchsia-500/70 to-violet-500/70 hover:from-fuchsia-400 hover:to-violet-400 transition" style={{ height: `${(v / max) * 100}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-slate-600 mt-2 font-mono">
            <span>W1</span><span>W6</span><span>W12</span>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-3">Pipeline Health</div>
        <div className="space-y-3">
          {bars.map(b => (
            <div key={b.label}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300">{b.label}</span>
                <span className="text-slate-500 font-mono">{b.value}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${b.color} rounded-full transition-all duration-500`} style={{ width: `${b.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-950/30 to-slate-900 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="size-4 text-fuchsia-400" />
          <span className="text-xs font-semibold text-fuchsia-300">Queen PM Insight</span>
        </div>
        <p className="text-[12px] text-slate-300 leading-relaxed">
          Velocity is trending up 8% but {inProg} tasks have been in-progress &gt;3d. Consider rebalancing toward @dan.
        </p>
      </div>
    </div>
  );
}
