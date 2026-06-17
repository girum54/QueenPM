import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Hash, Bot, ChevronDown, Pin, Search, Plus, Send, Crown, Sparkles, Zap, MessageSquare, Bell,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useStore, PRIORITY_STYLES, userById, CREATED_BY_META, type Priority,
} from "@/lib/queen-store";

export const Route = createFileRoute("/channels")({
  head: () => ({
    meta: [
      { title: "Channels — Queen PM" },
      { name: "description", content: "Conversational task surface with AI-monitored channels." },
    ],
  }),
  component: ChannelsPage,
});

function ChannelsPage() {
  const {
    channels, users, messages, tasks, activeChannelId, setActiveChannelId,
    addMessage, addTask, consumeJump,
    activeProjectId, setActiveProjectId, projectTabs
  } = useStore();

  const activeProject = useMemo(() => {
    return projectTabs.find((p) => p.id === activeProjectId) || projectTabs[0];
  }, [projectTabs, activeProjectId]);

  const [input, setInput] = useState("");
  const [showAuto, setShowAuto] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  // Handle cross-page jump
  useEffect(() => {
    const req = consumeJump();
    if (!req) return;
    if (req.channelId !== activeChannelId) setActiveChannelId(req.channelId);
    const tryScroll = (attempt: number) => {
      const el = document.getElementById(`msg-${req.messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setFlashId(req.messageId);
        setTimeout(() => setFlashId(null), 2000);
      } else if (attempt < 10) {
        setTimeout(() => tryScroll(attempt + 1), 60);
      }
    };
    setTimeout(() => tryScroll(0), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const channelMessages = useMemo(
    () => messages.filter((m) => m.channelId === activeChannelId),
    [messages, activeChannelId]
  );

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.pinned),
    [messages]
  );

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [activeChannelId]);

  const handleInputChange = (v: string) => {
    setInput(v);
    const trim = v.trim();
    setShowAuto(trim.startsWith("/") || trim.toLowerCase().startsWith("@queen"));
  };

  const spawnTask = (title: string, byAi: boolean, assigneeHandle?: string) => {
    const assignee = users.find((u) => u.handle === assigneeHandle) ?? null;
    const priorities: Priority[] = ["low", "medium", "high", "urgent"];
    const priority = priorities[Math.floor(Math.random() * 4)];
    const newMsgId = `m${Date.now()}`;
    const cardMsgId = `m${Date.now() + 1}`;
    const taskId = `t${Date.now()}`;
    addTask({
      id: taskId,
      title,
      assigneeId: assignee?.id ?? null,
      priority,
      column: "new",
      createdBy: byAi ? "ai" : "slash",
      originMessageId: newMsgId,
      originChannelId: activeChannelId,
      createdAt: Date.now(),
    });
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    addMessage({
      id: newMsgId, authorId: "me", channelId: activeChannelId, ts,
      text: byAi ? `@queen ${title}` : `/todo ${title}${assigneeHandle ? ` ${assigneeHandle}` : ""}`,
    });
    addMessage({ id: cardMsgId, authorId: "uq", channelId: activeChannelId, ts, taskRef: taskId });
    setTimeout(() => {
      streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
    }, 60);
  };

  const handleSend = () => {
    const v = input.trim();
    if (!v) return;
    if (v.toLowerCase().startsWith("/todo")) {
      const rest = v.slice(5).trim();
      const mention = rest.match(/@\w+/)?.[0];
      const title = rest.replace(/@\w+/, "").trim() || "Untitled task";
      spawnTask(title, false, mention);
    } else if (v.toLowerCase().startsWith("@queen")) {
      spawnTask(v.slice(6).trim() || "Investigate and scope", true);
    } else {
      addMessage({
        id: `m${Date.now()}`, authorId: "me", channelId: activeChannelId,
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: v,
      });
      setTimeout(() => {
        streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
      }, 60);
    }
    setInput("");
    setShowAuto(false);
  };

  const jumpToPinned = (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    if (msg.channelId !== activeChannelId) setActiveChannelId(msg.channelId);
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setFlashId(msgId);
        setTimeout(() => setFlashId(null), 2000);
      }
    }, 100);
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <AppShell>
      <div className="h-full grid grid-cols-[260px_1fr]">
        {/* LEFT: Channels-specific panel */}
        <aside className="border-r border-slate-800/80 bg-slate-900/40 flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-800/80 relative">
            <button
              onClick={() => setWorkspaceOpen((o) => !o)}
              className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-800/60 transition"
            >
              <div className="size-8 rounded-md bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center shadow-lg shadow-fuchsia-500/20">
                <Crown className="size-4 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-slate-100 leading-tight">{activeProject?.name}</div>
                <div className="text-[11px] text-slate-500 leading-tight">12 members · Pro</div>
              </div>
              <ChevronDown className={`size-4 text-slate-500 transition ${workspaceOpen ? "rotate-180" : ""}`} />
            </button>
            {workspaceOpen && (
              <div className="absolute left-3 right-3 top-full mt-1 z-30 rounded-lg border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
                {projectTabs.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProjectId(p.id);
                      setWorkspaceOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-800/60 flex items-center gap-2"
                  >
                    <div className={`size-5 rounded bg-gradient-to-br ${p.color}`} />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-800/50 border border-slate-800 text-xs text-slate-500">
              <Search className="size-3.5" />
              <span>Search messages…</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 min-h-0">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Channels</span>
              <Plus className="size-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
            </div>
            {channels.map((ch) => {
              const active = ch.id === activeChannelId;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition group ${
                    active ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
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
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
                <Pin className="size-3" /> Pinned Threads
              </span>
            </div>
            {pinnedMessages.map((m) => {
              const ch = channels.find((c) => c.id === m.channelId);
              return (
                <button
                  key={m.id}
                  onClick={() => jumpToPinned(m.id)}
                  className="w-full text-left px-2 py-1.5 rounded-md text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5">
                    <Hash className="size-2.5" /> {ch?.name}
                  </div>
                  <div className="truncate">{m.text}</div>
                </button>
              );
            })}

            <div className="flex items-center justify-between px-2 py-1.5 mt-4">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Direct Messages</span>
            </div>
            {users.filter((u) => u.id !== "me").slice(0, 4).map((u) => (
              <button key={u.id} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-200">
                <div className={`size-5 rounded-full ${u.color} grid place-items-center text-[10px] font-bold text-white`}>
                  {u.isAi ? <Crown className="size-3" /> : u.name[0]}
                </div>
                <span className="truncate">{u.name}</span>
                {u.isAi && <Sparkles className="size-3 text-fuchsia-400 ml-auto" />}
              </button>
            ))}
          </div>
        </aside>

        {/* CENTER: Chat */}
        <section className="flex flex-col min-w-0 bg-slate-950 min-h-0">
          <header className="h-12 border-b border-slate-800/80 px-5 flex items-center gap-3 shrink-0">
            {activeChannel?.aiActive ? (
              <Bot className="size-5 text-fuchsia-400" />
            ) : (
              <Hash className="size-5 text-slate-500" />
            )}
            <h1 className="text-base font-semibold text-slate-100">{activeChannel?.name}</h1>
            {activeChannel?.aiActive && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 text-[10px] font-semibold text-emerald-300 tracking-wide">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                QUEEN PM ACTIVE
              </span>
            )}
            <div className="ml-auto flex items-center gap-3 text-slate-500">
              <Pin className="size-4 hover:text-slate-300 cursor-pointer" />
              <Bell className="size-4 hover:text-slate-300 cursor-pointer" />
              <div className="flex -space-x-1.5">
                {users.slice(0, 4).map((u) => (
                  <div key={u.id} className={`size-6 rounded-full ${u.color} grid place-items-center text-[10px] font-bold text-white ring-2 ring-slate-950`}>
                    {u.isAi ? <Crown className="size-3" /> : u.name[0]}
                  </div>
                ))}
              </div>
            </div>
          </header>

          <div ref={streamRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-1 min-h-0">
            {channelMessages.map((m, idx) => {
              const author = userById(m.authorId, users)!;
              const prev = channelMessages[idx - 1];
              const grouped = prev && prev.authorId === m.authorId && !m.taskRef && !prev.taskRef;
              const flashing = flashId === m.id;
              const task = m.taskRef ? tasks.find((t) => t.id === m.taskRef) : null;
              return (
                <div
                  key={m.id}
                  id={`msg-${m.id}`}
                  className={`group relative rounded-lg px-3 py-1.5 transition-all duration-300 ${
                    m.parentId ? "ml-8 border-l-2 border-slate-800 pl-4" : ""
                  } ${flashing
                    ? "bg-fuchsia-500/10 ring-1 ring-fuchsia-500/50 shadow-lg shadow-fuchsia-500/20"
                    : "hover:bg-slate-900/40"}`}
                >
                  {m.pinned && (
                    <div className="absolute -top-1 left-3 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 ring-1 ring-amber-500/30 text-[9px] font-semibold text-amber-300">
                      <Pin className="size-2.5" /> PINNED
                    </div>
                  )}
                  {!grouped && (
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={`size-7 rounded-md ${author.color} grid place-items-center text-[11px] font-bold text-white`}>
                        {author.isAi ? <Crown className="size-3.5" /> : author.name[0]}
                      </div>
                      <span className="text-sm font-semibold text-slate-100">{author.name}</span>
                      {author.isAi && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-300 font-semibold tracking-wide">
                          AI
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">{m.ts}</span>
                    </div>
                  )}
                  {task ? (
                    <div className={`${grouped ? "ml-9" : "ml-9"} mt-1 rounded-lg border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/5 to-violet-500/5 p-3 max-w-md`}>
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-fuchsia-300 uppercase tracking-wider mb-1.5">
                        <Sparkles className="size-3" /> Queen PM created a task
                      </div>
                      <div className="text-sm font-medium text-slate-100">{task.title}</div>
                      <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${PRIORITY_STYLES[task.priority]}`}>
                          {task.priority}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${CREATED_BY_META[task.createdBy].className}`}>
                          {CREATED_BY_META[task.createdBy].label}
                        </span>
                        <span className="ml-auto text-[10px] text-slate-400">
                          {task.assigneeId
                            ? `→ ${userById(task.assigneeId, users)?.handle}`
                            : "→ unassigned"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className={`${grouped ? "ml-9" : "ml-9"} text-sm text-slate-300 leading-relaxed`}>
                      {m.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Composer */}
          <div className="p-4 border-t border-slate-800/80 shrink-0 relative">
            {showAuto && (
              <div className="absolute bottom-full left-4 right-4 mb-2 rounded-lg border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-800">
                  Quick actions
                </div>
                {[
                  { cmd: "/todo [Task] @user", desc: "Bypass AI — create instantly", icon: <Zap className="size-4 text-violet-400" /> },
                  { cmd: "@Queen PM [natural language]", desc: "Let Queen PM scope and spawn the task", icon: <Crown className="size-4 text-fuchsia-400" /> },
                ].map((o) => (
                  <div key={o.cmd} className="px-3 py-2.5 hover:bg-slate-800/60 cursor-pointer flex items-center gap-3">
                    {o.icon}
                    <div>
                      <div className="text-sm font-mono text-slate-200">{o.cmd}</div>
                      <div className="text-[11px] text-slate-500">{o.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl border border-slate-800 bg-slate-900/60 focus-within:border-slate-700 px-3 py-2 transition">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Message #${activeChannel?.name}  ·  try /todo or @queen`}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-200 placeholder:text-slate-500 max-h-40 py-1"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="size-8 grid place-items-center rounded-md bg-fuchsia-500 hover:bg-fuchsia-400 disabled:bg-slate-800 disabled:text-slate-600 text-white transition"
              >
                <Send className="size-3.5" />
              </button>
            </div>
            <div className="mt-1.5 text-[10px] text-slate-600 flex items-center gap-3 px-1">
              <span><MessageSquare className="size-3 inline mr-1" /> Enter to send</span>
              <span>Shift+Enter for newline</span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
