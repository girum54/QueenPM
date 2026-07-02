import { useEffect, useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff,
  Users, MessageSquare, MoreHorizontal, Plus, Send, Hash, Loader2
} from "lucide-react";
import { useStore } from "@/lib/queen-store";
import { useLivekit } from "@/lib/livekit-provider";
import { ParticipantTile } from "./call/ParticipantTile";
import { useLocalParticipant, useParticipants, RoomAudioRenderer } from "@livekit/components-react";

export interface VoiceViewProps {
  channelName?: string;
  onLeave?: () => void;
}

export function VoiceView({ channelName = "General", onLeave }: VoiceViewProps) {
  const { setIsInCall, setCallParticipants } = useStore();
  const { room, isConnected, connect, disconnect, error } = useLivekit();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  
  const [elapsed, setElapsed] = useState(0);
  const [chat, setChat] = useState<Array<{ id: string; who: string; text: string; t: string }>>([]);
  const [draft, setDraft] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Initialize room connection
  useEffect(() => {
    const roomName = `channel-${channelName?.replace(/\s+/g, '-').toLowerCase() || 'general'}`;
    connect(roomName);
    
    return () => {
      disconnect();
    };
  }, [channelName, connect, disconnect]);

  // Update store when call state changes
  useEffect(() => {
    if (isConnected && localParticipant) {
      setIsInCall(true);
      const allParticipants = [localParticipant, ...participants];
      setCallParticipants(allParticipants.map(p => p.name || p.identity));
    }
    
    return () => {
      setIsInCall(false);
      setCallParticipants([]);
    };
  }, [isConnected, localParticipant, participants, setIsInCall, setCallParticipants]);

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
      await localParticipant.setMicrophoneEnabled(!isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!isCameraOn);
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleScreenShare = async () => {
    if (localParticipant) {
      try {
        await localParticipant.setScreenShareEnabled(!isScreenSharing);
        setIsScreenSharing(!isScreenSharing);
      } catch (err) {
        console.error('Screen share error:', err);
      }
    }
  };

  const handleSendChat = () => {
    if (!draft.trim()) return;
    setChat((c) => [...c, {
      id: Date.now().toString(),
      who: localParticipant?.name || "You",
      text: draft,
      t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setDraft("");
  };

  const hhmmss = (() => {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${h ? String(h).padStart(2, "0") + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })();

  const allParticipants = localParticipant ? [localParticipant, ...participants] : participants;
  const focusedParticipant = focusId ? allParticipants.find(p => p.identity === focusId) : allParticipants[0];
  const gridParticipants = focusedParticipant 
    ? allParticipants.filter(p => p.identity !== focusedParticipant.identity)
    : allParticipants;

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center text-rose-300 p-4">
          <p className="font-semibold mb-2">Connection Error</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 text-fuchsia-400 animate-spin" />
          <p className="text-slate-400">Connecting to call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-0 bg-slate-950">
      <RoomAudioRenderer />
      
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
            <button onClick={() => setChatOpen((v) => !v)} className={`h-7 px-2 rounded text-[11px] flex items-center gap-1.5 ${chatOpen ? "text-fuchsia-400 bg-slate-900" : "text-slate-300 hover:bg-slate-800"}`}>
              <MessageSquare className="size-3.5" /> Chat
            </button>
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
                <ParticipantTile participant={focusedParticipant} large />
                <div className="grid grid-cols-1 auto-rows-[120px] gap-2 overflow-y-auto pr-1">
                  {gridParticipants.map((p) => (
                    <ParticipantTile 
                      key={p.identity} 
                      participant={p} 
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
                  gridTemplateColumns: `repeat(${Math.min(3, Math.ceil(Math.sqrt(allParticipants.length)))}, minmax(0, 1fr))`,
                }}
              >
                {allParticipants.map((p) => (
                  <ParticipantTile 
                    key={p.identity} 
                    participant={p} 
                    onClick={() => setFocusId(p.identity)} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Control bar */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur px-3 py-2.5 flex items-center justify-center gap-2">
            <button
              onClick={toggleMic}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition ${
                isMicOn
                  ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
              }`}
            >
              {isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              <span className="hidden sm:inline">{isMicOn ? "Mute" : "Unmute"}</span>
            </button>
            <button
              onClick={toggleCamera}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition ${
                isCameraOn
                  ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
              }`}
            >
              {isCameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
              <span className="hidden sm:inline">{isCameraOn ? "Camera" : "Off"}</span>
            </button>
            <button
              onClick={toggleScreenShare}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition ${
                isScreenSharing
                  ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {isScreenSharing ? <ScreenShareOff className="size-4" /> : <ScreenShare className="size-4" />}
              <span className="hidden sm:inline">Share</span>
            </button>
            <div className="h-6 w-px bg-slate-800 mx-1" />
            <button className="h-9 px-3 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5 transition">
              Queen
            </button>
            <div className="h-6 w-px bg-slate-800 mx-1" />
            <button
              onClick={handleLeave}
              className="h-9 px-4 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1.5"
            >
              <PhoneOff className="size-3.5" /> Leave
            </button>
          </div>
        </div>
      </main>

      {/* RIGHT: chat */}
      {chatOpen && (
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
                  {(p.name || p.identity)[0].toUpperCase()}
                </div>
                <span className="truncate flex-1">{p.name || p.identity}</span>
              </div>
            ))}
            <button className="w-full mt-1 h-8 rounded-md border border-dashed border-slate-800 text-[11px] text-slate-400 hover:bg-slate-900/50 flex items-center justify-center gap-1.5">
              <Plus className="size-3" /> Invite
            </button>
          </div>
          <div className="p-3 border-b border-slate-900 flex items-center gap-2">
            <MessageSquare className="size-4 text-slate-400" />
            <div className="text-sm font-semibold text-slate-200">Chat</div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            {chat.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Call chat starts here
              </div>
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
      )}
    </div>
  );
}
