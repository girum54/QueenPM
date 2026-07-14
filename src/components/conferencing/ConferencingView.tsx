import { useState, useEffect, useMemo } from "react";
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, Users, MoreHorizontal, X, Maximize2, Minus, Loader2, AlertCircle } from "lucide-react";
import { Track } from "livekit-client";
import { useLivekit } from "@/lib/livekit-provider";
import { useLocalParticipant, useParticipants, useTracks, isTrackReference } from "@livekit/components-react";
import { ParticipantTile } from "../call/ParticipantTile";
import { useStore } from "@/lib/queen-store";
import { callsApi, type ApiCall } from "@/lib/api/queen.api";

interface ConferencingViewProps {
  projectId: string;
  projectName: string;
  onLeave: () => void;
}

export function ConferencingView({ projectId, projectName, onLeave }: ConferencingViewProps) {
  const { status, error, connect, disconnect, clearError } = useLivekit();
  const { users, activeProjectId } = useStore();
  const [call, setCall] = useState<ApiCall | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [localJoinTime, setLocalJoinTime] = useState<number | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);

  // Fetch call info for this project
  useEffect(() => {
    async function loadCall() {
      try {
        const callData = await callsApi.getForProject(projectId);
        console.log("Loaded call data:", callData);
        setCall(callData);
      } catch (err) {
        console.error("Failed to load call:", err);
      }
    }
    loadCall();
  }, [projectId]);
  // Call timer - hybrid approach: use server time if valid, otherwise local join time
  useEffect(() => {
    if (!call) {
      setLocalJoinTime(null);
      setElapsed(0);
      return;
    }

    // Try to use server startedAt if it's reasonable (not in the future)
    let startTime: number;
    let useServerTime = false;

    if (call.startedAt) {
      const serverStarted = new Date(call.startedAt).getTime();
      const now = Date.now();
      const diff = now - serverStarted;
      
      console.log("Server time check - startedAt:", call.startedAt, "serverStarted:", serverStarted, "now:", now, "diff:", diff);
      
      // Only use server time if it's in the past (diff > 0)
      if (diff > 0) {
        startTime = serverStarted;
        useServerTime = true;
        console.log("Using server time:", call.startedAt, "diff:", diff);
      } else {
        console.log("Server time is in future or equal, using local join time");
        // Check if we have a stored local join time for this call
        const storedKey = `call_start_${call.id}`;
        const stored = localStorage.getItem(storedKey);
        if (stored) {
          startTime = parseInt(stored, 10);
          console.log("Using stored local join time:", new Date(startTime).toISOString());
        } else {
          startTime = now;
          localStorage.setItem(storedKey, startTime.toString());
          console.log("Starting new local join time:", new Date(startTime).toISOString());
        }
        useServerTime = false;
      }
    } else {
      startTime = Date.now();
      useServerTime = false;
    }

    if (!useServerTime) {
      setLocalJoinTime(startTime);
    }

    const updateTimer = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsed(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [call?.startedAt, call?.id, call]);

  // These hooks are safe when status === 'connected'
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

  const allTracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
    { source: Track.Source.Microphone, withPlaceholder: false },
  ]);

  // Initialize mic/camera state from local participant
  useEffect(() => {
    if (!localParticipant) return;
    setIsMicOn(localParticipant.isMicrophoneEnabled);
    setIsCameraOn(localParticipant.isCameraEnabled);
    setIsScreenSharing(!!(localParticipant as any).isScreenShareEnabled);
  }, [localParticipant?.identity]);

  const alreadyInCall = new Set(allParticipants.map((p) => p.identity));
  const inviteableMembers = users.filter(
    (u) =>
      !u.isAi &&
      !alreadyInCall.has(u.id) &&
      (u.name.toLowerCase().includes(inviteSearch.toLowerCase()) ||
        u.handle.toLowerCase().includes(inviteSearch.toLowerCase())),
  );

  const handleLeave = async () => {
    if (call) {
      // Clean up stored local join time
      localStorage.removeItem(`call_start_${call.id}`);
      await callsApi.leave(call.id);
    }
    await disconnect();
    onLeave();
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

  const handleInvite = async (userId: string) => {
    if (!call) return;
    try {
      await callsApi.invite(call.id, userId);
    } catch (err) {
      console.error("Failed to invite:", err);
    }
  };

const formatDuration = (totalSeconds: number) => {
  const s = Math.floor(totalSeconds); // Ensure we are working with whole seconds
  
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  // Pad segments to ensure 2 digits (e.g., 01, 09, 10)
  const pad = (num: number) => String(num).padStart(2, "0");

  // Choose your format:
  // Option A: Only show hours if > 0 (Your current logic, but fixed)
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(sec)}`;
  }
  return `${pad(m)}:${pad(sec)}`;
};

  const focusedParticipant = focusId
    ? allParticipants.find((p) => p.identity === focusId)
    : allParticipants[0];
  const gridParticipants = focusedParticipant
    ? allParticipants.filter((p) => p.identity !== focusedParticipant.identity)
    : allParticipants;

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
            <button onClick={onLeave} className="h-9 px-4 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Connecting state ─────────────────────────────────────────────────────────
  if (status === "connecting") {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 text-fuchsia-400 animate-spin" />
          <p className="text-slate-400 text-sm">Connecting to call...</p>
          <button onClick={handleLeave} className="mt-2 h-8 px-3 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Connected state ─────────────────────────────────────────────────────────
  if (status === "connected") {
    return (
      <div className="h-full min-h-0 bg-slate-950 relative">
        {/* Main stage */}
        <main className="relative flex-1 min-h-0 flex items-center justify-center">
          <div className="w-full h-full flex items-center justify-center p-3">
            {focusedParticipant ? (
              <ParticipantTile
                participant={focusedParticipant}
                tracks={allTracks.filter((t) => isTrackReference(t) && t.participant.identity === focusedParticipant.identity)}
                large
                onClick={() => setFocusId(null)}
              />
            ) : (
              <div
                className="grid gap-3 w-full max-w-6xl"
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

          {/* Mini participant overlay when focused */}
          {focusedParticipant && gridParticipants.length > 0 && (
            <div className="absolute bottom-20 right-4 z-10 w-48 space-y-2">
              {gridParticipants.slice(0, 3).map((p) => (
                <ParticipantTile
                  key={p.identity}
                  participant={p}
                  tracks={allTracks.filter((t) => isTrackReference(t) && t.participant.identity === p.identity)}
                  small
                  onClick={() => setFocusId(p.identity)}
                />
              ))}
            </div>
          )}

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/60 to-transparent border-b border-slate-900/50 flex items-center px-4 gap-3 z-10">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-slate-500" />
              <span className="font-semibold text-sm text-white">{projectName}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE · {formatDuration(elapsed)}
            </span>
            <span className="text-[11px] text-slate-300">{allParticipants.length} in call</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="size-7 grid place-items-center rounded hover:bg-slate-800/60 text-slate-400 hover:text-slate-300"
                title="Toggle sidebar"
              >
                <Users className="size-4" />
              </button>
              <button className="size-7 grid place-items-center rounded hover:bg-slate-800/60 text-slate-400 hover:text-slate-300">
                <MoreHorizontal className="size-4" />
              </button>
            </div>
          </div>

          {/* Control bar */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="rounded-xl border border-slate-900/50 bg-slate-900/60 backdrop-blur px-2 py-2 flex items-center justify-center gap-1.5 flex-wrap max-w-2xl mx-auto">
              <button
                onClick={toggleMic}
                className={`h-8 px-2 rounded-lg flex items-center gap-1 text-xs font-medium transition ${
                  isMicOn
                    ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                }`}
                title={isMicOn ? "Mute" : "Unmute"}
              >
                {isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              </button>
              <button
                onClick={toggleCamera}
                className={`h-8 px-2 rounded-lg flex items-center gap-1 text-xs font-medium transition ${
                  isCameraOn
                    ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                }`}
                title={isCameraOn ? "Turn off camera" : "Turn on camera"}
              >
                {isCameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
              </button>
              <button
                onClick={toggleScreenShare}
                className={`h-8 px-2 rounded-lg flex items-center gap-1 text-xs font-medium transition ${
                  isScreenSharing
                    ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
                title={isScreenSharing ? "Stop sharing" : "Share screen"}
              >
                {isScreenSharing ? <ScreenShareOff className="size-4" /> : <ScreenShare className="size-4" />}
              </button>
              <div className="h-6 w-px bg-slate-800 mx-1 shrink-0" />
              <button
                onClick={handleLeave}
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1.5 shrink-0"
                title="Leave call"
              >
                <PhoneOff className="size-3.5" /> <span className="hidden sm:inline">Leave</span>
              </button>
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <aside
          className={`absolute top-0 right-0 bottom-0 w-80 bg-slate-950/95 backdrop-blur border-l border-slate-900 flex flex-col transition-transform duration-300 z-15 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-3 border-b border-slate-900 flex items-center gap-2">
            <Users className="size-4 text-slate-400" />
            <div className="text-sm font-semibold text-slate-200">Participants</div>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">{allParticipants.length}</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="size-6 grid place-items-center rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition"
              title="Close sidebar"
            >
              <X className="size-3" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1 border-b border-slate-900">
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
              onClick={() => {
                setShowInvite((v) => !v);
                setInviteSearch("");
              }}
              className="w-full mt-1 h-8 rounded-md border border-dashed border-slate-700 text-[11px] text-fuchsia-400 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/40 flex items-center justify-center gap-1.5 transition"
            >
              <Users className="size-3" /> Invite someone
            </button>

            {/* Invite panel */}
            {showInvite && (
              <div className="mt-1 rounded-lg border border-slate-800 bg-slate-900/80 overflow-hidden">
                <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-800">
                  <input
                    value={inviteSearch}
                    onChange={(e) => setInviteSearch(e.target.value)}
                    placeholder="Search members…"
                    className="flex-1 bg-transparent outline-none text-[11px] text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {inviteableMembers.length === 0 ? (
                    <p className="text-center text-[11px] text-slate-500 py-3">
                      {inviteSearch ? "No match" : "Everyone's already in the call"}
                    </p>
                  ) : (
                    inviteableMembers.map((u) => (
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
                          onClick={() => handleInvite(u.id)}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/30 transition"
                        >
                          Invite
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    );
  }

  // ── Idle state (should show lobby) ─────────────────────────────────────────────
  return null;
}
