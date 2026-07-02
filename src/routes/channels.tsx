import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Hash, Bot, ChevronDown, Pin, Search, Send, Crown, Sparkles, Zap, MessageSquare, Bell, X, Info, Users, ListTodo,
  Video, Music
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AcceptAssignModal } from "@/components/AcceptAssignModal";
import {
  useStore, PRIORITY_STYLES, userById, CREATED_BY_META, type Priority, type Task, type CreatedBy,
} from "@/lib/queen-store";
import { useAuth } from "@/lib/auth-store";
import { channelsApi } from "@/lib/api/queen.api";
import {
  CHAT_QUICK_ACTIONS, parseCreateTaskCommand, parseQueenCommand,
  titleFromMessage,
} from "@/lib/chat-commands";
import { canAssignToUser, isProjectManager } from "@/lib/project-permissions";
import { VoiceView } from "@/components/VoiceView";
import { MusicView } from "@/components/MusicView";

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
  const { user: currentUser } = useAuth();
  const {
    channels, users, messages, tasks, activeChannelId, setActiveChannelId,
    addMessage, addTask, updateTask, consumeJump,
    activeProjectId, projectTabs, activeSprintId, isInCall,
  } = useStore();

  const activeProject = useMemo(() => {
    return projectTabs.find((p) => p.id === activeProjectId) || projectTabs[0];
  }, [projectTabs, activeProjectId]);

  const isPM = isProjectManager(activeProject, currentUser?.id);

  const quickActions = useMemo(() => {
    return CHAT_QUICK_ACTIONS.map((o) => {
      if (o.cmd === "/createtask" && !isPM) {
        return {
          ...o,
          example: "/createtask Fix webhook race p:high",
          desc: "Create a task — assign yourself in the modal",
        };
      }
      if (o.cmd === "/todo" && !isPM) {
        return {
          ...o,
          example: "/todo Ship rate limiter",
          desc: "Shortcut alias for /createtask",
        };
      }
      return o;
    });
  }, [isPM]);

  const [input, setInput] = useState("");
  const [showAuto, setShowAuto] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [channelMembers, setChannelMembers] = useState<typeof users>([]);
  const [manageMembersOpen, setManageMembersOpen] = useState(false);
  const [assignModalTask, setAssignModalTask] = useState<Task | null>(null);
  const [assignModalSubtitle, setAssignModalSubtitle] = useState<string | undefined>();
  const [spawningTask, setSpawningTask] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"chat" | "voice" | "music">("chat");

  // Sync mode state with search parameters on activeChannelId change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const qMode = searchParams.get("mode");

      // If in a call, prioritize voice mode
      if (isInCall) {
        setMode("voice");
      } else if (qMode === "voice" || qMode === "music") {
        setMode(qMode as "voice" | "music");
      } else {
        setMode("chat");
      }
    }
  }, [activeChannelId, isInCall]);

  const handleModeChange = (newMode: "chat" | "voice" | "music") => {
    setMode(newMode);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (newMode === "chat") {
        url.searchParams.delete("mode");
      } else {
        url.searchParams.set("mode", newMode);
      }
      window.history.pushState({}, "", url.pathname + url.search);
    }
  };

  // Fetch channel members when active channel changes
  useEffect(() => {
    if (!activeChannelId) return;
    async function loadMembers() {
      try {
        const dbMembers = await channelsApi.getMembers(activeChannelId);
        const mapped = dbMembers.map((u) => ({
          id: u.id,
          name: u.name,
          handle: u.username || `@${u.name.toLowerCase().replace(/\s+/g, '')}`,
          color: u.color || 'bg-slate-500',
          isAi: u.isAi ?? false,
        }));
        setChannelMembers(mapped);
      } catch (e) {
        console.error("Failed to load channel members:", e);
      }
    }
    loadMembers();
  }, [activeChannelId]);

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
    setShowAuto(
      trim.startsWith("/") ||
      trim.toLowerCase().startsWith("@queen") ||
      trim.toLowerCase().startsWith("@")
    );
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
    }, 60);
  };

  async function createTaskFromChat(opts: {
    title: string;
    createdBy: CreatedBy;
    assigneeHandle?: string;
    priority?: Priority;
    originMessageId?: string | null;
    sourceText?: string;
    openAssignModal?: boolean;
    modalSubtitle?: string;
  }) {
    if (!activeChannelId || !currentUser?.id) return null;
    setSpawningTask(true);
    try {
      const assignee = opts.assigneeHandle
        ? users.find((u) => u.handle.toLowerCase() === opts.assigneeHandle!.toLowerCase())
        : null;

      let assigneeId: string | null = assignee?.id ?? null;
      if (
        assigneeId &&
        !canAssignToUser(activeProject, currentUser?.id, assigneeId)
      ) {
        assigneeId = null;
      }

      let originMsgId = opts.originMessageId ?? null;
      if (opts.sourceText) {
        const sourceMsg = await addMessage({
          authorId: currentUser.id,
          channelId: activeChannelId,
          text: opts.sourceText,
        });
        originMsgId = sourceMsg?.id ?? originMsgId;
      }

      const task = await addTask({
        title: opts.title,
        assigneeId,
        priority: opts.priority ?? "medium",
        column: "new",
        createdBy: opts.createdBy,
        originMessageId: originMsgId,
        originChannelId: activeChannelId,
        sprintId: activeSprintId,
        projectId: activeProjectId,
        createdAt: Date.now(),
      });

      if (!task) return null;

      const queenUser = users.find((u) => u.isAi);
      await addMessage({
        authorId: queenUser?.id ?? currentUser.id,
        channelId: activeChannelId,
        taskRef: task.id,
      });

      scrollToBottom();

      if (opts.openAssignModal !== false) {
        setAssignModalSubtitle(opts.modalSubtitle);
        setAssignModalTask(task);
      }

      return task;
    } finally {
      setSpawningTask(false);
    }
  }

  async function convertMessageToTask(messageId: string, text: string) {
    await createTaskFromChat({
      title: titleFromMessage(text),
      createdBy: "slash",
      originMessageId: messageId,
      openAssignModal: true,
      modalSubtitle: "Created from chat message",
    });
  }

  const handleSend = async () => {
    const v = input.trim();
    if (!v || spawningTask) return;

    const createCmd = parseCreateTaskCommand(v);
    const queenCmd = parseQueenCommand(v);

    if (createCmd) {
      await createTaskFromChat({
        title: createCmd.title,
        createdBy: createCmd.createdBy,
        assigneeHandle: createCmd.assigneeHandle,
        priority: createCmd.priority,
        sourceText: v,
        modalSubtitle: "Created via slash command",
      });
    } else if (queenCmd) {
      await createTaskFromChat({
        title: queenCmd.title,
        createdBy: "ai",
        sourceText: v,
        modalSubtitle: "Queued for Queen PM — assign an owner for now",
      });
    } else {
      await addMessage({
        authorId: currentUser?.id || "me",
        channelId: activeChannelId,
        text: v,
      });
      scrollToBottom();
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
      <div className="h-full flex overflow-hidden">
        {/* CENTER: Chat container */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-950 min-h-0">
          <header className="h-12 border-b border-slate-900 px-5 flex items-center gap-3 shrink-0">
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

            {/* Segmented Mode Controls */}
            <div className="flex items-center bg-slate-900/60 rounded-lg p-0.5 border border-slate-800/80 ml-4 shrink-0">
              <button
                onClick={() => handleModeChange("chat")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${mode === "chat"
                    ? "bg-slate-850 text-slate-100 shadow-sm border border-slate-700/30"
                    : "text-slate-450 hover:text-slate-200"
                  }`}
              >
                <MessageSquare className="size-3.5" />
                <span>Chat</span>
              </button>
              <button
                onClick={() => handleModeChange("voice")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${mode === "voice"
                    ? "bg-slate-850 text-fuchsia-300 shadow-sm border border-fuchsia-500/20"
                    : "text-slate-450 hover:text-slate-200"
                  }`}
              >
                <Video className="size-3.5" />
                <span>Voice & Video</span>
              </button>
              <button
                onClick={() => handleModeChange("music")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${mode === "music"
                    ? "bg-slate-850 text-fuchsia-300 shadow-sm border border-fuchsia-500/20"
                    : "text-slate-450 hover:text-slate-200"
                  }`}
              >
                <Music className="size-3.5" />
                <span>Music Lounge</span>
              </button>
            </div>

            {/* Header controls */}
            <div className="ml-auto flex items-center gap-3 text-slate-500">
              {mode === "chat" && (
                <button
                  onClick={() => setRightPanelOpen(!rightPanelOpen)}
                  className={`size-8 rounded-lg grid place-items-center transition ${rightPanelOpen ? "text-fuchsia-400 bg-slate-900/60" : "hover:text-slate-300 hover:bg-slate-900/60"}`}
                  title="Toggle Channel Details"
                >
                  <Info className="size-4.5" />
                </button>
              )}
              <button className="size-8 grid place-items-center text-slate-500 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition">
                <Bell className="size-4" />
              </button>

              <div className="flex -space-x-1.5 pl-1.5 border-l border-slate-800">
                {users.slice(0, 4).map((u) => (
                  <div key={u.id} className={`size-6 rounded-full ${u.color} grid place-items-center text-[10px] font-bold text-white ring-2 ring-slate-950`}>
                    {u.isAi ? <Crown className="size-3" /> : u.name[0]}
                  </div>
                ))}
              </div>
            </div>
          </header>

          {/* Conditional Views based on mode */}
          {mode === "chat" ? (
            <>
              {/* Messages Stream */}
              <div ref={streamRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-1 min-h-0">
                {channelMessages.map((m, idx) => {
                  const author = userById(m.authorId, users)!;
                  const prev = channelMessages[idx - 1];
                  const grouped = prev && prev.authorId === m.authorId && !m.taskRef && !prev.taskRef;
                  const flashing = flashId === m.id;
                  const task = m.taskRef ? tasks.find((t) => t.id === m.taskRef) : null;
                  const linkedTask = !m.taskRef
                    ? tasks.find((t) => t.originMessageId === m.id)
                    : null;
                  const canConvert = !!m.text && !m.taskRef && !linkedTask;
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
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setAssignModalSubtitle(undefined);
                            setAssignModalTask(task);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setAssignModalSubtitle(undefined);
                              setAssignModalTask(task);
                            }
                          }}
                          className={`${grouped ? "ml-9" : "ml-9"} mt-1 rounded-lg border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/5 to-violet-500/5 p-3 max-w-md cursor-pointer hover:border-fuchsia-500/40 hover:from-fuchsia-500/10 transition`}
                        >
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
                            <span className="ml-auto text-[10px] text-fuchsia-300/80">
                              {task.assigneeId
                                ? `→ ${userById(task.assigneeId, users)?.handle}`
                                : "Click to assign →"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className={`${grouped ? "ml-9" : "ml-9"} relative`}>
                          <div className="text-sm text-slate-300 leading-relaxed pr-16">{m.text}</div>
                          {linkedTask && (
                            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400/90 bg-emerald-500/10 ring-1 ring-emerald-500/25 rounded-full px-2 py-0.5">
                              <ListTodo className="size-3" /> Task created
                            </div>
                          )}
                          {canConvert && (
                            <button
                              onClick={() => convertMessageToTask(m.id, m.text!)}
                              disabled={spawningTask}
                              title="Convert message to task"
                              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-fuchsia-300 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 ring-1 ring-fuchsia-500/30 transition disabled:opacity-40"
                            >
                              <ListTodo className="size-3" /> Create task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Composer */}
              <div className="p-4 border-t border-slate-900 shrink-0 relative animate-fade-in">
                {showAuto && (
                  <div className="absolute bottom-full left-4 right-4 mb-2 rounded-lg border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
                    <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-800">
                      Quick actions
                    </div>
                    {quickActions.map((o) => (
                      <button
                        key={o.cmd}
                        type="button"
                        onClick={() => setInput(o.example)}
                        className="w-full px-3 py-2.5 hover:bg-slate-800/60 cursor-pointer flex items-center gap-3 text-left transition"
                      >
                        {o.icon === "zap" ? (
                          <Zap className="size-4 text-violet-400 shrink-0" />
                        ) : (
                          <Crown className="size-4 text-fuchsia-400 shrink-0" />
                        )}
                        <div>
                          <div className="text-sm font-mono text-slate-200">{o.example}</div>
                          <div className="text-[11px] text-slate-550">{o.desc}</div>
                        </div>
                      </button>
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
                    placeholder={`Message #${activeChannel?.name}  ·  /createtask, /todo, or @queen`}
                    className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-200 placeholder:text-slate-500 max-h-40 py-1"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || spawningTask}
                    className="size-8 grid place-items-center rounded-md bg-fuchsia-500 hover:bg-fuchsia-400 disabled:bg-slate-800 disabled:text-slate-600 text-white transition"
                  >
                    <Send className="size-3.5" />
                  </button>
                </div>
                <div className="mt-1.5 text-[10px] text-slate-600 flex items-center gap-3 px-1 flex-wrap">
                  <span><MessageSquare className="size-3 inline mr-1" /> Enter to send</span>
                  <span>Shift+Enter for newline</span>
                  <span className="text-slate-700">·</span>
                  <span>Hover a message → Create task</span>
                </div>
              </div>
            </>
          ) : mode === "voice" ? (
            <div className="flex-1 min-h-0">
              <VoiceView channelName={activeChannel?.name || "Voice Lounge"} onLeave={() => handleModeChange("chat")} />
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <MusicView />
            </div>
          )}
        </section>

        {/* RIGHT SIDE PANEL: Details, Pins & Members */}
        {mode === "chat" && rightPanelOpen && (
          <>
            <div
              onClick={() => setRightPanelOpen(false)}
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            />
            <aside className="fixed inset-y-0 right-0 lg:relative w-72 border-l border-slate-900 bg-slate-950/95 lg:bg-slate-950/40 flex flex-col min-h-0 z-40">
              {/* Header */}
              <div className="h-12 border-b border-slate-900 px-4 flex items-center justify-between shrink-0">
                <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase">Channel Details</span>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="size-6 rounded hover:bg-slate-900 text-slate-500 hover:text-slate-300 grid place-items-center transition"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">

                {/* Channel Info */}
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">About</div>
                  <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-900 text-xs text-slate-300 space-y-1.5">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Hash className="size-3.5 text-slate-500" /> {activeChannel?.name}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Welcome to the project feed for {activeProject?.name}. AI and team notifications post directly here.
                    </p>
                  </div>
                </div>

                {/* Pinned Messages */}
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Pinned Threads</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400 font-mono">
                      {pinnedMessages.length}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {pinnedMessages.length === 0 ? (
                      <div className="text-center py-4 border border-dashed border-slate-900 rounded-lg text-slate-600 text-xs">
                        No pinned threads
                      </div>
                    ) : (
                      pinnedMessages.map((m) => {
                        const ch = channels.find((c) => c.id === m.channelId);
                        return (
                          <button
                            key={m.id}
                            onClick={() => jumpToPinned(m.id)}
                            className="w-full text-left p-2.5 rounded-lg border border-slate-900 bg-slate-900/20 hover:bg-slate-900/60 text-xs text-slate-400 hover:text-slate-200 transition space-y-1"
                          >
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-semibold uppercase">
                              <Hash className="size-2.5" /> {ch?.name}
                            </div>
                            <div className="truncate text-slate-300 font-medium">{m.text}</div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Members */}
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Members</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setManageMembersOpen(true)}
                        className="px-1.5 py-0.5 rounded bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-[9px] text-fuchsia-400 hover:text-fuchsia-300 font-bold transition"
                      >
                        Manage
                      </button>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400 font-mono">
                        {channelMembers.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {channelMembers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-2.5 p-1.5 rounded hover:bg-slate-900/30 text-xs text-slate-300 transition"
                      >
                        <div className={`size-6 rounded-full ${u.color} grid place-items-center text-[10px] font-bold text-white shrink-0`}>
                          {u.isAi ? <Crown className="size-3" /> : u.name[0]}
                        </div>
                        <span className="truncate flex-1">{u.name}</span>
                        {u.isAi ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-300 font-bold tracking-wide">
                            AI Agent
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500">{u.handle}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </aside>
          </>
        )}
      </div>

      {manageMembersOpen && activeChannelId && (
        <ManageMembersModal
          channelId={activeChannelId}
          onClose={() => setManageMembersOpen(false)}
          systemUsers={users}
          channelMembers={channelMembers}
          onMembersChanged={setChannelMembers}
        />
      )}

      {assignModalTask && (
        <AcceptAssignModal
          task={assignModalTask}
          subtitle={assignModalSubtitle}
          onClose={() => {
            setAssignModalTask(null);
            setAssignModalSubtitle(undefined);
          }}
          onSubmit={(patch) => {
            updateTask(assignModalTask.id, patch);
            setAssignModalTask(null);
            setAssignModalSubtitle(undefined);
          }}
          users={users}
        />
      )}
    </AppShell>
  );
}

function ManageMembersModal({
  channelId,
  onClose,
  systemUsers,
  channelMembers,
  onMembersChanged,
}: {
  channelId: string;
  onClose: () => void;
  systemUsers: ReturnType<typeof useStore>["users"];
  channelMembers: ReturnType<typeof useStore>["users"];
  onMembersChanged: (newMembers: ReturnType<typeof useStore>["users"]) => void;
}) {
  const [busyUserIds, setBusyUserIds] = useState<Record<string, boolean>>({});

  const handleToggleMember = async (user: typeof systemUsers[0]) => {
    const isMember = channelMembers.some((m) => m.id === user.id);
    setBusyUserIds((prev) => ({ ...prev, [user.id]: true }));
    try {
      if (isMember) {
        await channelsApi.removeMember(channelId, user.id);
        onMembersChanged(channelMembers.filter((m) => m.id !== user.id));
      } else {
        await channelsApi.addMember(channelId, user.id);
        onMembersChanged([...channelMembers, user]);
      }
    } catch (e) {
      console.error("Failed to toggle channel member:", e);
    } finally {
      setBusyUserIds((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-50 flex items-center gap-1.5">
              <Users className="size-4 text-fuchsia-400" /> Channel Members
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Manage who has access to this channel</p>
          </div>
          <button
            onClick={onClose}
            className="size-6 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 grid place-items-center transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {systemUsers.map((u) => {
            const isMember = channelMembers.some((m) => m.id === u.id);
            const isBusy = busyUserIds[u.id];
            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-800/40 bg-slate-900/50 hover:bg-slate-950/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`size-8 rounded-full ${u.color} grid place-items-center text-xs font-bold text-white shrink-0`}>
                    {u.isAi ? <Crown className="size-4" /> : u.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate">{u.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{u.handle}</div>
                  </div>
                </div>

                <button
                  disabled={isBusy}
                  onClick={() => handleToggleMember(u)}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition shrink-0 ${isMember
                      ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                      : "bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400"
                    }`}
                >
                  {isBusy ? "..." : isMember ? "Remove" : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
