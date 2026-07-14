/**
 * QueenDjView.tsx — QueenDJ Bot Management for Queen PM
 *
 * Features:
 *  - Invite QueenDJ to voice calls
 *  - Control QueenDJ playback (play, pause, skip)
 *  - View QueenDJ's current state and queue
 *  - Send commands to QueenDJ via chat (!play, !play playlist)
 */

import { useCallback, useEffect, useState } from "react";
import {
  Crown, Play, Pause, SkipForward, Users, Music, Sparkles,
  Loader2, Phone, PhoneOff, Plus, Trash2, ListMusic, X,
} from "lucide-react";
import { useStore } from "@/lib/queen-store";
import { useAuth } from "@/lib/auth-store";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QueenDjState {
  currentRoom: string | null;
  currentTrack: {
    videoId: string;
    title: string;
    author: string;
    thumbnail: string;
  } | null;
  isPlaying: boolean;
  queue: Array<{
    videoId: string;
    title: string;
    author: string;
    thumbnail: string;
  }>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QueenDjView() {
  const { user } = useAuth();
  const { channels, activeChannelId, queendjPanelOpen, setQueendjPanelOpen } = useStore();
  const playlistChannelId = activeChannelId || channels[0]?.id || 'c4452bb1-4694-415d-8919-e48de2cfaed2';

  const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

  // ── State ────────────────────────────────────────────────────────────────
  const [state, setState] = useState<QueenDjState>({
    currentRoom: null,
    currentTrack: null,
    isPlaying: false,
    queue: [],
  });
  const [loading, setLoading] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<Array<{ text: string; response: string; time: string; type: "success" | "error" | "info" }>>([]);

  // ── Fetch QueenDJ state ─────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/queendj/state`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Failed to fetch QueenDJ state:', err);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchState]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleJoinCall = async () => {
    if (!state.currentRoom) {
      addCommandResponse("QueenDJ is not in a call. Add QueenDJ to a call first!", "error");
      return;
    }
    addCommandResponse(`QueenDJ is already in: ${state.currentRoom}`, "info");
  };

  const handleInviteToCall = async (roomName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/queendj/join`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName }),
      });
      const data = await res.json();
      addCommandResponse(data.message, data.success ? "success" : "error");
      if (data.success) fetchState();
    } catch (err) {
      addCommandResponse("Failed to invite QueenDJ to call", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveCall = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/queendj/leave`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      addCommandResponse(data.message, data.success ? "success" : "error");
      if (data.success) fetchState();
    } catch (err) {
      addCommandResponse("Failed to remove QueenDJ from call", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/queendj/play`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, channelId: playlistChannelId }),
      });
      const data = await res.json();
      addCommandResponse(data.message, data.success ? "success" : "error");
      if (data.success) fetchState();
    } catch (err) {
      addCommandResponse("Failed to play track", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPlaylist = async (playlistName?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/queendj/play-playlist`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistName, channelId: playlistChannelId }),
      });
      const data = await res.json();
      addCommandResponse(data.message, data.success ? "success" : "error");
      if (data.success) fetchState();
    } catch (err) {
      addCommandResponse("Failed to play playlist", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/queendj/skip`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      addCommandResponse(data.message, data.success ? "success" : "error");
      if (data.success) fetchState();
    } catch (err) {
      addCommandResponse("Failed to skip track", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/queendj/pause`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      addCommandResponse(data.message, data.success ? "success" : "error");
      if (data.success) fetchState();
    } catch (err) {
      addCommandResponse("Failed to pause", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/queendj/resume`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      addCommandResponse(data.message, data.success ? "success" : "error");
      if (data.success) fetchState();
    } catch (err) {
      addCommandResponse("Failed to resume", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClearQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/queendj/clear`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      addCommandResponse(data.message, data.success ? "success" : "error");
      if (data.success) fetchState();
    } catch (err) {
      addCommandResponse("Failed to clear queue", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Command parsing ───────────────────────────────────────────────────────
  const addCommandResponse = (response: string, type: "success" | "error" | "info") => {
    setCommandHistory(h => [
      ...h,
      {
        text: commandInput,
        response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type,
      },
    ]);
    setCommandInput("");
  };

  const handleSendCommand = async () => {
    const input = commandInput.trim();
    if (!input) return;

    const lower = input.toLowerCase();
    
    if (lower.startsWith('!play')) {
      const rest = input.slice(5).trim();
      if (lower.startsWith('!play playlist')) {
        const playlistName = rest.slice('playlist'.length).trim();
        await handlePlayPlaylist(playlistName || undefined);
      } else {
        await handlePlayTrack(rest);
      }
    } else if (lower === '!skip') {
      await handleSkip();
    } else if (lower === '!pause') {
      await handlePause();
    } else if (lower === '!resume') {
      await handleResume();
    } else if (lower === '!clear') {
      await handleClearQueue();
    } else {
      addCommandResponse(`Unknown command: ${input}. Try !play, !play playlist, !skip, !pause, !resume, !clear`, "error");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (!queendjPanelOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-950 border-l border-slate-900 shadow-2xl z-50 flex flex-col">

      {/* Header */}
      <div className="shrink-0 border-b border-slate-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center">
            <Crown className="size-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-100">QueenDJ 🤖</h1>
            <p className="text-xs text-slate-400">
              {state.currentRoom ? `Playing in: ${state.currentRoom}` : "Not in a call"}
            </p>
          </div>
          <button
            onClick={() => setQueendjPanelOpen(false)}
            className="size-8 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition grid place-items-center"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        
        {/* Now Playing */}
        {state.currentTrack && (
          <div className="shrink-0 border-b border-slate-900 p-4 bg-slate-900/20">
            <div className="flex items-center gap-4">
              <img src={state.currentTrack.thumbnail} alt={state.currentTrack.title} className="size-16 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Music className="size-4 text-fuchsia-400" />
                  <span className="text-xs font-semibold text-fuchsia-300">Now Playing</span>
                </div>
                <h3 className="text-sm font-medium text-slate-200 truncate">{state.currentTrack.title}</h3>
                <p className="text-xs text-slate-500 truncate">{state.currentTrack.author}</p>
              </div>
              <div className="flex items-center gap-2">
                {state.isPlaying ? (
                  <button onClick={handlePause} disabled={loading} className="size-10 rounded-full bg-slate-800 hover:bg-slate-700 grid place-items-center text-slate-200 transition">
                    <Pause className="size-4" />
                  </button>
                ) : (
                  <button onClick={handleResume} disabled={loading} className="size-10 rounded-full bg-fuchsia-500 hover:bg-fuchsia-400 grid place-items-center text-white transition">
                    <Play className="size-4 fill-current" />
                  </button>
                )}
                <button onClick={handleSkip} disabled={loading} className="size-10 rounded-full bg-slate-800 hover:bg-slate-700 grid place-items-center text-slate-200 transition">
                  <SkipForward className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Queue */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Queue ({state.queue.length} tracks)
            </h3>
            {state.queue.length > 0 && (
              <button onClick={handleClearQueue} disabled={loading} className="text-xs text-rose-400 hover:text-rose-300 transition">
                Clear Queue
              </button>
            )}
          </div>

          {state.queue.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <ListMusic className="size-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Queue is empty</p>
              <p className="text-xs mt-1">Use the playlist to add tracks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {state.queue.map((track, idx) => (
                <div
                  key={`${track.videoId}-${idx}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                    state.currentTrack?.videoId === track.videoId
                      ? "border-fuchsia-500/30 bg-fuchsia-500/5"
                      : "border-slate-900 bg-slate-900/20 hover:bg-slate-900/40"
                  }`}
                >
                  <span className="text-xs text-slate-500 w-6 text-center">{idx + 1}</span>
                  <img src={track.thumbnail} alt={track.title} className="size-10 rounded object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium truncate ${
                      state.currentTrack?.videoId === track.videoId ? "text-fuchsia-300" : "text-slate-200"
                    }`}>
                      {track.title}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{track.author}</div>
                  </div>
                  {state.currentTrack?.videoId === track.videoId && state.isPlaying && (
                    <Music className="size-4 text-fuchsia-400 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
