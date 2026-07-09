import { useEffect, useState, useMemo } from "react";
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff,
  Users, MoreHorizontal, Plus, Send, Hash, Loader2,
  AlertCircle, RefreshCw, UserPlus, Bell, Check, Search, Crown, MessageSquare,
} from "lucide-react";
import { Track } from "livekit-client";
import { useStore } from "@/lib/queen-store";
import { useLivekit } from "@/lib/livekit-provider";
import { ParticipantTile } from "./call/ParticipantTile";
import { useLocalParticipant, useParticipants, useTracks, isTrackReference } from "@livekit/components-react";

export interface VoiceViewProps {
  channelName?: string;
  onLeave?: () => void;
}

// ─── Inner view (only rendered when LiveKitRoom context exists) ───────────────
// All livekit hooks live here, so they're guaranteed to have a room context.

function ConnectedCallView({
  channelName,
  onLeave,
}: {
  channelName: string;
  onLeave?: () => void;
}) {
  const { setIsInCall, setCallParticipants } = useStore();
  const { disconnect } = useLivekit();

  // These hooks are safe here because ConnectedCallView is only rendered
  // when status === 'connected' (RoomContext.Provider has a live Room).
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const allParticipants = useMemo(() => {
    const map = new Map();
    if (localParticipant) {
      map.set(localParticipant.identity, localParticipant);
    }
    participants.forEach((p) => {
      map.set(p.identity, p);
    });
    return Array.from(map.values());
  }, [localParticipant, participants]);

  // Get all room tracks once — filter per participant when rendering tiles.
  // This replaces RoomAudioRenderer: each ParticipantTile renders its own AudioTrack.
  const allTracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
    { source: Track.Source.Microphone, withPlaceholder: false },
  ]);

  const [elapsed, setElapsed] = useState(0);
  const [chat, setChat] = useState<Array<{ id: string; who: string; text: string; t: string }>>([]);
  const [draft, setDraft] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [queenDjInCall, setQueenDjInCall] = useState(false);

  // Project members not already in the call
  const { users, activeProjectId, activeChannelId } = useStore();
  const alreadyInCall = new Set(allParticipants.map((p) => p.identity));
  const inviteableMembers = users.filter(
    (u) =>
      !u.isAi &&
      !alreadyInCall.has(u.id) &&
      (u.name.toLowerCase().includes(inviteSearch.toLowerCase()) ||
        u.handle.toLowerCase().includes(inviteSearch.toLowerCase())),
  );

  const API_BASE_URL =
    typeof window !== "undefined"
      ? (import.meta.env.VITE_API_URL ?? "http://localhost:3001")
      : "http://localhost:3001";

  // Check if QueenDJ is in the call
  useEffect(() => {
    const queenDjParticipant = allParticipants.find(p => p.identity === 'queendj');
    setQueenDjInCall(!!queenDjParticipant);
  }, [allParticipants]);

  // Invite QueenDJ to the call
  const handleInviteQueenDj = async () => {
    if (queenDjInCall) return;
    
    try {
      const roomName = `channel-${channelName.replace(/\s+/g, "-").toLowerCase()}`;
      await fetch(`${API_BASE_URL}/queendj/join`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName }),
      });
      setQueenDjInCall(true);
    } catch (err) {
      console.error('Failed to invite QueenDJ:', err);
    }
  };

  // Remove QueenDJ from the call
  const handleRemoveQueenDj = async () => {
    if (!queenDjInCall) return;
    
    try {
      await fetch(`${API_BASE_URL}/queendj/leave`, {
        method: 'POST',
        credentials: 'include',
      });
      setQueenDjInCall(false);
    } catch (err) {
      console.error('Failed to remove QueenDJ:', err);
    }
  };

  const handleSendInvite = async (userId: string) => {
    setSendingTo(userId);
    try {
      await fetch(`${API_BASE_URL}/calls/invite`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: userId,
          roomName: `channel-${channelName.replace(/\s+/g, "-").toLowerCase()}`,
          channelName,
          channelId: activeChannelId,
        }),
      });
      setSentTo((prev) => new Set(prev).add(userId));
    } catch (err) {
      console.error("[Invite] Failed to send:", err);
    } finally {
      setSendingTo(null);
    }
  };

  // Sync store with actual participant state
  useEffect(() => {
    if (localParticipant) {
      setIsInCall(true);
      const all = [localParticipant, ...participants];
      setCallParticipants(all.map((p) => p.name || p.identity));
    }
    return () => {
      setIsInCall(false);
      setCallParticipants([]);
    };
  }, [localParticipant, participants, setIsInCall, setCallParticipants]);

  // Initialize mic/camera toggle state from the real local participant on mount
  useEffect(() => {
    if (!localParticipant) return;
    setIsMicOn(localParticipant.isMicrophoneEnabled);
    setIsCameraOn(localParticipant.isCameraEnabled);
    setIsScreenSharing(!!(localParticipant as any).isScreenShareEnabled);
  }, [localParticipant?.identity]); // identity string is safe in dep array

  // Call timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLeave = async () => {
    await disconnect();
    setIsInCall(false);
    setCallParticipants([]);
    onLeave?.();
  };

  const toggleMic = async () => {
    if (localParticipant) {
      const next = !isMicOn;
      await localParticipant.setMicrophoneEnabled(next);
      setIsMicOn(next);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      const next = !isCameraOn;
      await localParticipant.setCameraEnabled(next);
      setIsCameraOn(next);
    }
  };

  const toggleScreenShare = async () => {
    if (localParticipant) {
      try {
        const next = !isScreenSharing;
        await localParticipant.setScreenShareEnabled(next);
        setIsScreenSharing(next);
      } catch (err) {
        console.error("Screen share error:", err);
      }
    }
  };

  const handleSendChat = () => {
    if (!draft.trim()) return;
    setChat((c) => [
      ...c,
      {
        id: Date.now().toString(),
        who: localParticipant?.name || "You",
        text: draft,
        t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setDraft("");
  };

  const hhmmss = (() => {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${h ? String(h).padStart(2, "0") + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })();

  const focusedParticipant = focusId
    ? allParticipants.find((p) => p.identity === focusId)
    : allParticipants[0];
  const gridParticipants = focusedParticipant
    ? allParticipants.filter((p) => p.identity !== focusedParticipant.identity)
    : allParticipants;

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-0 bg-slate-950">

      {/* CENTER: stage */}
      <main className="flex flex-col min-h-0">
        {/* Topbar */}
        <div className="h-12 shrink-0 border-b border-slate-900 flex items-center px-4 gap-3">
          <div className="flex items-center gap-2">
            <Hash className="size-4 text-slate-500" />
            <span className="font-semibold text-sm">{channelName}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-rose-400 animate-pulse" /> LIVE · {hhmmss}
          </span>
          <span className="text-[11px] text-slate-500">{allParticipants.length} in call</span>
          <div className="ml-auto flex items-center gap-1">
            <button className="size-7 grid place-items-center rounded hover:bg-slate-800 text-slate-400">
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        </div>

        {/* Stage area */}
        <div className="flex-1 min-h-0 p-3 grid grid-rows-[1fr_auto] gap-3">
          <div className={`min-h-0 grid gap-3 ${focusedParticipant ? "grid-cols-[1fr_220px]" : ""}`}>
            {focusedParticipant ? (
              <>
                <ParticipantTile
                  participant={focusedParticipant}
                  tracks={allTracks.filter((t) => isTrackReference(t) && t.participant.identity === focusedParticipant.identity)}
                  large
                />
                <div className="grid grid-cols-1 auto-rows-[120px] gap-2 overflow-y-auto pr-1">
                  {gridParticipants.map((p) => (
                    <ParticipantTile
                      key={p.identity}
                      participant={p}
                      tracks={allTracks.filter((t) => isTrackReference(t) && t.participant.identity === p.identity)}
                      small
                      onClick={() => setFocusId(p.identity)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div
                className="min-h-0 grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(3, Math.ceil(Math.sqrt(Math.max(1, allParticipants.length))))}, minmax(0, 1fr))`,
                }}
              >
                {allParticipants.map((p) => (
                  <ParticipantTile
                    key={p.identity}
                    participant={p}
                    tracks={allTracks.filter((t) => isTrackReference(t) && t.participant.identity === p.identity)}
                    onClick={() => setFocusId(p.identity)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Control bar */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur px-3 py-2.5 flex items-center justify-center gap-2">
            <button
              id="voice-toggle-mic"
              onClick={toggleMic}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition ${isMicOn
                  ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                }`}
            >
              {isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              <span className="hidden sm:inline">{isMicOn ? "Mute" : "Unmute"}</span>
            </button>
            <button
              id="voice-toggle-camera"
              onClick={toggleCamera}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition ${isCameraOn
                  ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                }`}
            >
              {isCameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
              <span className="hidden sm:inline">{isCameraOn ? "Camera" : "Off"}</span>
            </button>
            <button
              id="voice-toggle-screenshare"
              onClick={toggleScreenShare}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition ${isScreenSharing
                  ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
            >
              {isScreenSharing ? <ScreenShareOff className="size-4" /> : <ScreenShare className="size-4" />}
              <span className="hidden sm:inline">Share</span>
            </button>
            <div className="h-6 w-px bg-slate-800 mx-1" />
            <button
              id="voice-leave-call"
              onClick={handleLeave}
              className="h-9 px-4 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1.5"
            >
              <PhoneOff className="size-3.5" /> Leave
            </button>
          </div>
        </div>
      </main>

      {/* RIGHT: participants + chat */}
      <aside className="border-l border-slate-900 bg-slate-950/20 flex flex-col min-h-0">
        <div className="p-3 border-b border-slate-900 flex items-center gap-2">
          <Users className="size-4 text-slate-400" />
          <div className="text-sm font-semibold text-slate-200">Participants</div>
          <span className="ml-auto text-[10px] text-slate-500 font-mono">{allParticipants.length}</span>
        </div>
        <div className="overflow-y-auto max-h-[40%] p-2 space-y-1 border-b border-slate-900">
          {allParticipants.map((p) => (
            <div
              key={p.identity}
              onClick={() => setFocusId(p.identity)}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900/30 cursor-pointer text-xs text-slate-300 transition"
            >
              <div className="size-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {(p.name || p.identity || "?")[0]?.toUpperCase() || "?"}
              </div>
              <span className="truncate flex-1">{p.name || p.identity}</span>
            </div>
          ))}

          {/* Invite button */}
          <button
            onClick={() => { setShowInvite((v) => !v); setInviteSearch(""); }}
            className="w-full mt-1 h-8 rounded-md border border-dashed border-slate-700 text-[11px] text-fuchsia-400 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/40 flex items-center justify-center gap-1.5 transition"
          >
            <UserPlus className="size-3" /> Invite someone
          </button>

          {/* QueenDJ button */}
          <button
            onClick={queenDjInCall ? handleRemoveQueenDj : handleInviteQueenDj}
            className={`w-full mt-1 h-8 rounded-md border text-[11px] flex items-center justify-center gap-1.5 transition ${
              queenDjInCall
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400 hover:bg-fuchsia-500/20"
            }`}
          >
            <Crown className="size-3" /> {queenDjInCall ? "Remove QueenDJ" : "Add QueenDJ"}
          </button>

          {/* Member picker panel */}
          {showInvite && (
            <div className="mt-1 rounded-lg border border-slate-800 bg-slate-900/80 overflow-hidden">
              {/* Search */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-800">
                <Search className="size-3 text-slate-500 shrink-0" />
                <input
                  autoFocus
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  placeholder="Search members…"
                  className="flex-1 bg-transparent outline-none text-[11px] text-slate-200 placeholder:text-slate-500"
                />
              </div>
              {/* Member list */}
              <div className="max-h-40 overflow-y-auto">
                {inviteableMembers.length === 0 ? (
                  <p className="text-center text-[11px] text-slate-500 py-3">
                    {inviteSearch ? "No match" : "Everyone's already in the call"}
                  </p>
                ) : (
                  inviteableMembers.map((u) => {
                    const sent = sentTo.has(u.id);
                    const sending = sendingTo === u.id;
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-800/40 transition"
                      >
                        <div className={`size-6 rounded-full ${u.color || "bg-slate-600"} grid place-items-center text-[10px] font-bold text-white shrink-0`}>
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium text-slate-200 truncate">{u.name}</div>
                          <div className="text-[9px] text-slate-500 truncate">{u.handle}</div>
                        </div>
                        <button
                          disabled={sent || sending}
                          onClick={() => handleSendInvite(u.id)}
                          className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition ${
                            sent
                              ? "bg-emerald-500/15 text-emerald-300 cursor-default"
                              : "bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/30"
                          }`}
                        >
                          {sent ? <Check className="size-3" /> : <Bell className="size-3" />}
                          {sent ? "Sent" : sending ? "…" : "Invite"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        <div className="p-3 border-b border-slate-900 flex items-center gap-2">
          <MessageSquare className="size-4 text-slate-400" />
          <div className="text-sm font-semibold text-slate-200">Chat</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
          {chat.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Call chat starts here</div>
          ) : (
            chat.map((c) => (
              <div key={c.id} className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-200">{c.who}</span>
                  <span className="text-slate-600 text-[9px]">{c.t}</span>
                </div>
                <div className="text-slate-300 leading-relaxed break-words">{c.text}</div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-slate-900 space-y-1.5">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendChat();
              }
            }}
            placeholder="Say something..."
            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-slate-700 transition"
          />
          <button
            onClick={handleSendChat}
            disabled={!draft.trim()}
            className="w-full h-7 rounded-lg text-xs font-medium bg-fuchsia-500 hover:bg-fuchsia-600 disabled:bg-slate-800 disabled:text-slate-600 text-white flex items-center justify-center gap-1 transition"
          >
            <Send className="size-3" /> Send
          </button>
        </div>
      </aside>
    </div>
  );
}

// ─── Outer shell (safe to render always) ─────────────────────────────────────
// Handles status-based rendering: idle lobby → connecting spinner → error → call UI

export function VoiceView({ channelName = "General", onLeave }: VoiceViewProps) {
  const { status, error, connect, disconnect, clearError } = useLivekit();

  const roomName = `channel-${channelName.replace(/\s+/g, "-").toLowerCase()}`;

  const handleJoin = () => connect(roomName);

  const handleLeave = async () => {
    await disconnect();
    onLeave?.();
  };

  // ── Error state ────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center max-w-sm p-6 space-y-4">
          <div className="size-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto">
            <AlertCircle className="size-6 text-rose-400" />
          </div>
          <p className="font-semibold text-slate-200">Connection Failed</p>
          <p className="text-sm text-slate-400 break-words">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              id="voice-retry"
              onClick={() => { clearError(); connect(roomName); }}
              className="h-9 px-4 rounded-lg text-xs font-semibold bg-fuchsia-500 hover:bg-fuchsia-600 text-white flex items-center gap-2"
            >
              <RefreshCw className="size-3.5" /> Retry
            </button>
            <button
              onClick={clearError}
              className="h-9 px-4 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Connecting (waiting for WebSocket) ────────────────────────────────────
  if (status === "connecting") {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 text-fuchsia-400 animate-spin" />
          <p className="text-slate-400 text-sm">
            Connecting to call…
          </p>
          <button
            onClick={handleLeave}
            className="mt-2 h-8 px-3 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Connected: delegate to inner view that uses livekit hooks ──────────────
  if (status === "connected") {
    return <ConnectedCallView channelName={channelName} onLeave={onLeave} />;
  }

  // ── Idle: join lobby ───────────────────────────────────────────────────────
  return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="text-center max-w-sm p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Hash className="size-4" />
            <span className="text-sm font-medium">{channelName}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Voice Channel</h2>
          <p className="text-sm text-slate-400">
            Join the call to speak with your team.
          </p>
        </div>
        <button
          id="voice-join-call"
          onClick={handleJoin}
          className="w-full h-11 rounded-xl text-sm font-semibold bg-fuchsia-500 hover:bg-fuchsia-600 text-white flex items-center justify-center gap-2 transition shadow-lg shadow-fuchsia-500/20"
        >
          <Mic className="size-4" /> Join Call
        </button>
      </div>
    </div>
  );
}
