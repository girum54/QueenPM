/**
 * MusicView.tsx — Collaborative YouTube Music Lounge for Queen PM
 *
 * Features:
 *  - Real YouTube playback via react-youtube (hidden player, audio-only feel)
 *  - Real-time sync via LiveKit DataChannel (PLAY / PAUSE / SEEK / SUGGEST / VOTE / PARTY_START)
 *  - Synced vs Solo toggle: Solo mode disconnects from room events
 *  - Suggest & Vote queue: anyone can paste a YouTube URL; others vote 👍/👎
 *  - "Party Start" notification: when the first song plays, other users see a toast
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import YouTube, { type YouTubeEvent, type YouTubePlayer } from "react-youtube";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX,
  Heart, Plus, Search, ListMusic, Users, Sparkles, Music,
  Headphones, Share2, Clock, Disc3, ThumbsUp, ThumbsDown, Link2,
  X, Bell, Loader2, Trash2
} from "lucide-react";
import { useLivekit } from "@/lib/livekit-provider";
import { useStore } from "@/lib/queen-store";
import {
  useDataChannel,
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import { useAuth } from "@/lib/auth-store";
import {
  extractYouTubeId,
  fmt,
  type YouTubeMetadata,
} from "@/lib/youtube-utils";
import { playlistApi } from "@/lib/api/queen.api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QueueTrack extends YouTubeMetadata {
  addedBy: string;
  votes: number;
  myVote?: "up" | "down";
  /** DB row id — present when the track is persisted in the playlist */
  dbId?: string;
}

type MusicMsg =
  | { type: "PLAY"; videoId: string; timestamp: number }
  | { type: "PAUSE"; timestamp: number }
  | { type: "SEEK"; timestamp: number }
  | { type: "SUGGEST"; track: YouTubeMetadata; addedBy: string }
  | { type: "VOTE"; videoId: string; direction: "up" | "down"; voter: string }
  | { type: "PARTY_START"; trackTitle: string; startedBy: string }
  | { type: "SET_QUEUE"; tracks: YouTubeMetadata[]; stationName: string };

// ─── Notification Toast ───────────────────────────────────────────────────────

interface ToastNotif {
  id: string;
  message: string;
  emoji: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const MUSIC_ROOM = "music-lounge";

// ─── Outer Component (Handles Connection) ────────────────────────────────────

export function MusicView() {
  const { connect, disconnect, status, enableOfflineMode } = useLivekit();

  useEffect(() => {
    connect(MUSIC_ROOM);
    return () => { disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status !== "ready" && status !== "connected") {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          {status === "error" ? (
            <>
              <p className="text-rose-400 text-sm font-semibold">Failed to connect to LiveKit</p>
              <p className="text-slate-500 text-xs">Ensure your LiveKit server is running.</p>
              <button
                onClick={enableOfflineMode}
                className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
              >
                Test UI in Offline Mode
              </button>
            </>
          ) : (
            <>
              <Disc3 className="size-8 text-fuchsia-400 animate-spin [animation-duration:3s]" />
              <p className="text-slate-400 text-sm">Joining Music Lounge…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return <ConnectedMusicView />;
}

// ─── Inner Component (Safe to use LiveKit hooks) ─────────────────────────────

function ConnectedMusicView() {
  const { user } = useAuth();
  const { isConnected } = useLivekit();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  // ── State ────────────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(72);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("all");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"queue" | "suggest" | "dj">("queue");
  const [partyMode, setPartyMode] = useState(true);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [radioLoading, setRadioLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeMetadata[]>([]);
  const [notifications, setNotifications] = useState<ToastNotif[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(true);

  const { channels, activeChannelId } = useStore();
  const playlistChannelId = activeChannelId || channels[0]?.id || 'c4452bb1-4694-415d-8919-e48de2cfaed2';

  const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

  const playerRef = useRef<YouTubePlayer | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const partyModeRef = useRef(partyMode);
  partyModeRef.current = partyMode;

  const current = queue[currentIdx] ?? null;

  // ── State ────────────────────────────────────────────────────────────────
  const { send } = useDataChannel("music-sync", (msg) => {
    // receive incoming messages from other participants
    try {
      const data: MusicMsg = JSON.parse(new TextDecoder().decode(msg.payload));
      handleIncoming(data);
    } catch { /* ignore bad payloads */ }
  });

  const broadcast = useCallback((msg: MusicMsg) => {
    try {
      const encoded = new TextEncoder().encode(JSON.stringify(msg));
      send(encoded, { reliable: true });
    } catch (e) {
      console.warn("LiveKit broadcast failed (disconnected/offline):", e);
    }
  }, [send]);

  // ── Handle incoming sync messages ─────────────────────────────────────
  const handleIncoming = useCallback((msg: MusicMsg) => {
    if (msg.type === "PARTY_START") {
      pushNotif(`🎵 ${msg.startedBy} started: ${msg.trackTitle}`, "🎉");
      return;
    }
    if (!partyModeRef.current) return; // Solo mode: ignore sync events

    if (msg.type === "PLAY") {
      const player = playerRef.current;
      if (player) {
        // Find the track in queue by videoId
        setQueue(q => {
          const idx = q.findIndex(t => t.videoId === msg.videoId);
          if (idx >= 0) setCurrentIdx(idx);
          return q;
        });
        player.seekTo(msg.timestamp, true);
        player.playVideo();
        setPlaying(true);
      }
    } else if (msg.type === "PAUSE") {
      playerRef.current?.pauseVideo();
      playerRef.current?.seekTo(msg.timestamp, true);
      setProgress(msg.timestamp);
      setPlaying(false);
    } else if (msg.type === "SEEK") {
      playerRef.current?.seekTo(msg.timestamp, true);
      setProgress(msg.timestamp);
    } else if (msg.type === "SUGGEST") {
      setQueue(q => {
        if (q.find(t => t.videoId === msg.track.videoId)) return q;
        return [...q, { ...msg.track, addedBy: msg.addedBy, votes: 1, myVote: undefined }];
      });
      pushNotif(`${msg.addedBy} suggested: ${msg.track.title}`, "🎵");
    } else if (msg.type === "VOTE") {
      setQueue(q => q.map(t => t.videoId === msg.videoId
        ? { ...t, votes: t.votes + (msg.direction === "up" ? 1 : -1) }
        : t
      ));
    } else if (msg.type === "SET_QUEUE") {
      const newTracks = msg.tracks.map(t => ({ ...t, addedBy: "Queen DJ 🤖", votes: 1 }));
      setQueue(newTracks);
      if (newTracks.length > 0) {
        setCurrentIdx(0);
        setPlaying(true);
      }
      pushNotif(`📻 Queen DJ loaded ${msg.stationName} Radio`, "🤖");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Notifications ─────────────────────────────────────────────────────
  const pushNotif = (message: string, emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications(n => [...n, { id, message, emoji }]);
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 5000);
  };

  // ── Progress bar polling ───────────────────────────────────────────────
  const startProgressPoll = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(async () => {
      const player = playerRef.current;
      if (!player) return;
      try {
        const t = await player.getCurrentTime();
        const d = await player.getDuration();
        setProgress(t);
        if (d > 0) setDuration(d);
      } catch { /* player not ready yet */ }
    }, 500);
  }, []);

  useEffect(() => {
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, []);

  // ── Load persisted playlist on channel change ─────────────────────────
  useEffect(() => {
    if (!playlistChannelId) return;
    setPlaylistLoading(true);
    playlistApi.getByChannel(playlistChannelId)
      .then(tracks => {
        if (tracks.length > 0) {
          setQueue(tracks.map(t => ({
            videoId: t.videoId,
            title: t.title,
            author: t.author,
            thumbnail: t.thumbnail,
            addedBy: t.addedBy,
            votes: 1,
            dbId: t.id,
          })));
        } else {
          setQueue([]);
        }
      })
      .catch(err => console.error('Failed to load playlist:', err))
      .finally(() => setPlaylistLoading(false));
  }, [playlistChannelId]);

  // ── YouTube player events ──────────────────────────────────────────────
  const onReady = (e: YouTubeEvent) => {
    playerRef.current = e.target;
    e.target.setVolume(volume);
    if (playing) e.target.playVideo();
  };

  const onStateChange = (e: YouTubeEvent) => {
    const YT = (window as any).YT?.PlayerState;
    if (!YT) return;
    if (e.data === YT.PLAYING) {
      setPlaying(true);
      startProgressPoll();
    } else if (e.data === YT.PAUSED) {
      setPlaying(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
    } else if (e.data === YT.ENDED) {
      handleNext();
    }
  };

  // ── Playback controls ─────────────────────────────────────────────────
  const handlePlay = async () => {
    const player = playerRef.current;
    if (!player || !current) return;
    try {
      const ts = await player.getCurrentTime();
      player.playVideo();
      setPlaying(true);

      // First play in party → notify everyone
      if (partyMode) {
        broadcast({ type: "PLAY", videoId: current.videoId, timestamp: ts });
        if (ts < 1) {
          // It's the start of a new song — send party notification
          broadcast({ type: "PARTY_START", trackTitle: current.title, startedBy: user?.name ?? "Someone" });
        }
      }
    } catch (e) {
      console.warn("YouTube player handlePlay error:", e);
    }
  };

  const handlePause = async () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      const ts = await player.getCurrentTime();
      player.pauseVideo();
      setPlaying(false);
      if (partyMode) broadcast({ type: "PAUSE", timestamp: ts });
    } catch (e) {
      console.warn("YouTube player handlePause error:", e);
    }
  };

  const handleSeek = async (pct: number) => {
    const player = playerRef.current;
    if (!player) return;
    try {
      const ts = pct * duration;
      player.seekTo(ts, true);
      setProgress(ts);
      if (partyMode) broadcast({ type: "SEEK", timestamp: ts });
    } catch (e) {
      console.warn("YouTube player handleSeek error:", e);
    }
  };

  const handleNext = () => {
    setCurrentIdx(i => {
      const next = shuffle
        ? Math.floor(Math.random() * queue.length)
        : repeat === "one" ? i : (i + 1) % queue.length;
      return next;
    });
    setProgress(0);
    setPlaying(true);
  };

  const handlePrev = () => {
    setCurrentIdx(i => (i - 1 + queue.length) % queue.length);
    setProgress(0);
    setPlaying(true);
  };

  const playTrack = (idx: number) => {
    setCurrentIdx(idx);
    setProgress(0);
    setPlaying(true);
    if (partyMode && queue[idx]) {
      broadcast({ type: "PLAY", videoId: queue[idx].videoId, timestamp: 0 });
      broadcast({ type: "PARTY_START", trackTitle: queue[idx].title, startedBy: user?.name ?? "Someone" });
    }
  };

  // ── Volume ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      playerRef.current.setVolume(muted ? 0 : volume);
    } catch (e) {
      console.warn("YouTube player setVolume error:", e);
    }
  }, [volume, muted]);

  // ── Suggest or Search a track ─────────────────────────────────────────
  const handleSuggest = async () => {
    const input = urlInput.trim();
    if (!input) return;

    setUrlLoading(true);
    setUrlError("");
    setSearchResults([]);

    const videoId = extractYouTubeId(input);
    
    if (videoId) {
      // It's a direct URL — proxy via backend to avoid YouTube's 401 on browser-side oEmbed calls
      try {
        const res = await fetch(`${API_BASE_URL}/music/track-info?videoId=${encodeURIComponent(videoId)}`);
        setUrlLoading(false);
        if (!res.ok) { setUrlError("Couldn't fetch track info. Check the URL and try again."); return; }
        const meta = await res.json();
        setSearchResults([meta]);
      } catch {
        setUrlLoading(false);
        setUrlError("Couldn't fetch track info. Check the URL and try again.");
        return;
      }
    } else {
      // It's a text search
      try {
        const response = await fetch(`${API_BASE_URL}/music/search?q=${encodeURIComponent(input)}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const data = await response.json();
        setSearchResults(data);
        setUrlLoading(false);
      } catch (err) {
        console.error(err);
        setUrlLoading(false);
        setUrlError("Search failed. Please ask the admin to configure the YouTube API key.");
      }
    }
  };

  const handleAddSearchResult = async (meta: YouTubeMetadata) => {
    if (queue.find(t => t.videoId === meta.videoId)) {
      setUrlError("This track is already in the queue.");
      return;
    }

    // Persist to DB first so we get the dbId
    let dbId: string | undefined;
    try {
      const saved = await playlistApi.addTrack({
        channelId: playlistChannelId,
        videoId: meta.videoId,
        title: meta.title,
        author: meta.author,
        thumbnail: meta.thumbnail,
        addedBy: user?.name ?? "Unknown",
      });
      dbId = saved.id;
    } catch (err) {
      console.error("Failed to persist track:", err);
    }

    const track: QueueTrack = { ...meta, addedBy: user?.name ?? "You", votes: 1, dbId };
    setQueue(q => [...q, track]);
    setSearchResults(res => res.filter(r => r.videoId !== meta.videoId));
    setUrlInput("");

    if (queue.length === 0) {
      setCurrentIdx(0);
      setPlaying(true);
    }

    broadcast({ type: "SUGGEST", track: meta, addedBy: user?.name ?? "Someone" });
    if (queue.length === 0) {
      broadcast({ type: "PARTY_START", trackTitle: meta.title, startedBy: user?.name ?? "Someone" });
    }
  };

  /** Removes a track from the playlist, both locally and from the database. */
  const handleRemoveTrack = async (track: QueueTrack) => {
    if (track.dbId) {
      try {
        await playlistApi.removeTrack(track.dbId);
      } catch (err) {
        console.error("Failed to delete track from playlist database:", err);
      }
    }

    setQueue(q => {
      const idx = q.findIndex(t => t.videoId === track.videoId);
      if (idx === -1) return q;
      
      const newQueue = q.filter(t => t.videoId !== track.videoId);
      
      // If we are removing the active track or tracks before it, update currentIdx
      if (idx === currentIdx) {
        // Move to the next index or reset to 0
        setCurrentIdx(newQueue.length > 0 ? idx % newQueue.length : 0);
        setProgress(0);
      } else if (idx < currentIdx) {
        setCurrentIdx(currentIdx - 1);
      }
      
      return newQueue;
    });
  };

  /** Play a track immediately without adding it to the queue permanently. */
  const handlePlayNow = (meta: YouTubeMetadata) => {
    const track: QueueTrack = { ...meta, addedBy: user?.name ?? "You", votes: 1 };
    // Insert at front (or replace if already exists) so it plays next
    setQueue(q => {
      const existing = q.findIndex(t => t.videoId === meta.videoId);
      if (existing !== -1) {
        // Already in queue — just jump to it
        setCurrentIdx(existing);
        setProgress(0);
        setPlaying(true);
        return q;
      }
      // Prepend at currentIdx+1 so it plays right now
      const insertAt = Math.max(0, currentIdx + (queue.length > 0 ? 1 : 0));
      const next = [...q];
      next.splice(insertAt, 0, track);
      setCurrentIdx(insertAt);
      setProgress(0);
      setPlaying(true);
      return next;
    });
    setSearchResults([]);
    setUrlInput("");
    if (partyMode) {
      broadcast({ type: "PLAY", videoId: meta.videoId, timestamp: 0 });
      broadcast({ type: "PARTY_START", trackTitle: meta.title, startedBy: user?.name ?? "Someone" });
    }
  };

  const handleStartRadio = async (genre: string, stationName: string) => {
    setRadioLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/music/radio?genre=${genre}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed");
      const tracks: YouTubeMetadata[] = await res.json();
      
      const newTracks = tracks.map(t => ({ ...t, addedBy: "Queen DJ 🤖", votes: 1 }));
      
      // Completely replace local queue
      setQueue(newTracks);

      if (newTracks.length > 0) {
        setCurrentIdx(0);
        setPlaying(true);
      }

      // Sync the queue replacement across the entire group lounge
      broadcast({ type: "SET_QUEUE", tracks, stationName });
      broadcast({ type: "PARTY_START", trackTitle: `${stationName} Radio`, startedBy: "Queen DJ 🤖" });

    } catch (err) {
      console.error(err);
      setUrlError("Failed to load radio station.");
    } finally {
      setRadioLoading(false);
      setTab("queue");
    }
  };

  const handleVote = (videoId: string, direction: "up" | "down") => {
    setQueue(q => q.map(t => {
      if (t.videoId !== videoId) return t;
      if (t.myVote === direction) return t; // already voted
      const diff = direction === "up" ? 1 : -1;
      return { ...t, votes: t.votes + diff, myVote: direction };
    }));
    broadcast({ type: "VOTE", videoId, direction, voter: user?.name ?? "?" });
  };

  const toggleLike = (videoId: string) => setLiked(s => {
    const n = new Set(s);
    n.has(videoId) ? n.delete(videoId) : n.add(videoId);
    return n;
  });

  const filtered = useMemo(() =>
    queue.filter(t => [t.title, t.author].join(" ").toLowerCase().includes(search.toLowerCase())),
    [search, queue]
  );

  const allParticipants = localParticipant ? [localParticipant, ...participants] : participants;

  // ── Loading state ─────────────────────────────────────────────────────

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_300px] min-h-0 bg-slate-950 relative">

      {/* ── Hidden YouTube Player ─────────────────────────────────── */}
      {current && (
        <div className="absolute left-0 bottom-0 opacity-0 pointer-events-none size-0 overflow-hidden">
          <YouTube
            videoId={current.videoId}
            opts={{
              playerVars: {
                autoplay: playing ? 1 : 0,
                controls: 0,
                modestbranding: 1,
                rel: 0,
              },
            }}
            onReady={onReady}
            onStateChange={onStateChange}
          />
        </div>
      )}

      {/* ── Toast Notifications ───────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div
            key={n.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/90 border border-slate-700 shadow-xl text-xs text-slate-200 animate-fade-in backdrop-blur"
          >
            <Bell className="size-3 text-fuchsia-400 shrink-0" />
            <span>{n.message}</span>
          </div>
        ))}
      </div>

      {/* ── CENTER ───────────────────────────────────────────────────── */}
      <main className="flex flex-col min-h-0 overflow-hidden">

        {/* Now Playing Hero */}
        <div className="relative shrink-0 p-6 border-b border-slate-900 overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${current ? "from-fuchsia-600 to-violet-700" : "from-slate-800 to-slate-900"} opacity-15`} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="relative flex items-center gap-5">
            {/* Cover */}
            <div className="size-24 rounded-xl overflow-hidden shrink-0 shadow-2xl shadow-black/50 bg-slate-800">
              {current ? (
                <img src={current.thumbnail} alt={current.title} className="size-full object-cover" />
              ) : (
                <div className="size-full bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center">
                  <Music className="size-10 text-white/40" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-rose-400 animate-pulse" /> LIVE LOUNGE
                </span>
                {partyMode && isConnected && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 flex items-center gap-1">
                    <Users className="size-3" /> Party · {allParticipants.length} listening
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold truncate text-slate-100">
                {current?.title ?? "Nothing playing"}
              </h1>
              <div className="text-xs text-slate-400 truncate">
                {current?.author ?? "Paste a YouTube link to get started"}
              </div>

              {/* Controls */}
              <div className="flex items-center flex-wrap gap-1.5 mt-3">
                <button
                  onClick={() => playing ? handlePause() : handlePlay()}
                  disabled={!current}
                  className="h-8 px-3 rounded-full bg-white text-slate-900 text-[11px] font-bold flex items-center gap-1 hover:scale-105 transition disabled:opacity-40"
                >
                  {playing ? <Pause className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  onClick={() => current && toggleLike(current.videoId)}
                  disabled={!current}
                  className="size-8 rounded-full border border-slate-800 hover:bg-slate-900 grid place-items-center disabled:opacity-40"
                >
                  <Heart className={`size-3.5 ${current && liked.has(current.videoId) ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
                </button>
                <button
                  onClick={() => setPartyMode(p => !p)}
                  className={`h-8 px-2.5 rounded-full border text-[11px] font-medium flex items-center gap-1 ${
                    partyMode
                      ? "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40"
                      : "border-slate-800 text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <Headphones className="size-3" /> {partyMode ? "Synced" : "Solo"}
                </button>
                <button className="h-8 px-2.5 rounded-full border border-slate-800 hover:bg-slate-900 text-[11px] text-slate-300 flex items-center gap-1">
                  <Share2 className="size-3" /> Share
                </button>
                <button 
                  onClick={() => setTab("dj")}
                  className={`h-8 px-2.5 rounded-full border ${tab === "dj" ? "bg-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-200" : "border-slate-800 text-slate-300 hover:bg-slate-900"} text-[11px] flex items-center gap-1`}
                >
                  <Sparkles className="size-3" /> Queen DJ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs + search */}
        <div className="shrink-0 border-b border-slate-900 px-4 h-11 flex items-center gap-1">
          <button onClick={() => setTab("queue")} className={`px-3 h-7 rounded text-[11px] font-medium transition ${tab === "queue" ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"}`}>Queue</button>
          <button onClick={() => setTab("suggest")} className={`px-3 h-7 rounded text-[11px] font-medium transition ${tab === "suggest" ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"}`}>+ Suggest</button>
          <div className="ml-auto flex items-center gap-2 px-2 py-0.5 rounded bg-slate-900/50 border border-slate-900 text-xs w-44">
            <Search className="size-3.5 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search queue…"
              className="bg-transparent outline-none flex-1 text-xs placeholder:text-slate-500 text-slate-200"
            />
          </div>
        </div>

        {/* List / Suggest Panel */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === "suggest" ? (
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-400">Search for a song name, or paste a YouTube URL to suggest a track for the party.</p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900/40 focus-within:border-fuchsia-500/50 transition">
                  <Search className="size-4 text-slate-500 shrink-0" />
                  <input
                    value={urlInput}
                    onChange={e => { setUrlInput(e.target.value); setUrlError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleSuggest()}
                    placeholder="Search e.g. 'lofi beats' or paste URL..."
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none"
                  />
                  {urlInput && (
                    <button onClick={() => { setUrlInput(""); setSearchResults([]); }} className="text-slate-500 hover:text-slate-300">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSuggest}
                  disabled={!urlInput.trim() || urlLoading}
                  className="h-9 px-4 rounded-lg bg-fuchsia-500 hover:bg-fuchsia-400 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition"
                >
                  {urlLoading ? "…" : "Search"}
                </button>
              </div>
              {urlError && <p className="text-xs text-rose-400">{urlError}</p>}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Results</h3>
                  {searchResults.map(res => (
                    <div key={res.videoId} className="flex items-center gap-3 p-2 rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 transition">
                      <img src={res.thumbnail} alt={res.title} className="size-12 rounded object-cover shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-200 truncate">{res.title}</div>
                        <div className="text-xs text-slate-500 truncate">{res.author}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handlePlayNow(res)}
                          title="Play now"
                          className="h-8 px-3 rounded-md bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-medium transition flex items-center gap-1.5"
                        >
                          <Play className="size-3" /> Play
                        </button>
                        <button
                          onClick={() => handleAddSearchResult(res)}
                          title="Add to queue"
                          className="h-8 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested tracks with votes */}
              <div className="space-y-1.5 mt-8 border-t border-slate-900 pt-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Queue Suggestions</h3>
                {queue.length === 0 ? (
                  <div className="text-center py-10 text-slate-600 text-sm border border-dashed border-slate-900 rounded-lg">
                    <Music className="size-8 mx-auto mb-2 opacity-40" />
                    No tracks yet. Be the first DJ!
                  </div>
                ) : (
                  queue.map((t, i) => (
                    <div key={t.videoId} className={`flex items-center gap-2 p-2.5 rounded-lg border transition ${i === currentIdx ? "border-fuchsia-500/30 bg-fuchsia-500/5" : "border-slate-900 bg-slate-900/20 hover:bg-slate-900/40"}`}>
                      <img src={t.thumbnail} alt={t.title} className="size-10 rounded object-cover shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-medium truncate ${i === currentIdx ? "text-fuchsia-300" : "text-slate-200"}`}>{t.title}</div>
                        <div className="text-[10px] text-slate-500">{t.author} · by {t.addedBy}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleVote(t.videoId, "up")} className={`size-6 grid place-items-center rounded hover:bg-emerald-500/10 transition ${t.myVote === "up" ? "text-emerald-400" : "text-slate-500"}`}>
                          <ThumbsUp className="size-3" />
                        </button>
                        <span className="text-[10px] font-mono text-slate-400 w-4 text-center">{t.votes}</span>
                        <button onClick={() => handleVote(t.videoId, "down")} className={`size-6 grid place-items-center rounded hover:bg-rose-500/10 transition ${t.myVote === "down" ? "text-rose-400" : "text-slate-500"}`}>
                          <ThumbsDown className="size-3" />
                        </button>
                        <button onClick={() => playTrack(i)} className="ml-1 size-6 grid place-items-center rounded hover:bg-fuchsia-500/20 text-slate-400 hover:text-fuchsia-300 transition">
                          <Play className="size-3 fill-current" />
                        </button>
                        <button onClick={() => handleRemoveTrack(t)} title="Remove track" className="size-6 grid place-items-center rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition">
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : tab === "dj" ? (
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-400">Queen DJ 🤖 will load a curated playlist so the music never stops.</p>
              
              <div className="grid grid-cols-1 gap-2 mt-4">
                <button onClick={() => handleStartRadio('focus', 'Deep Focus')} disabled={radioLoading} className="text-left p-3 rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 hover:border-fuchsia-500/50 transition relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative text-sm font-medium text-slate-200 mb-0.5 flex items-center gap-2">
                    🧠 Deep Focus
                    {radioLoading && <Loader2 className="size-3 animate-spin text-slate-400" />}
                  </div>
                  <div className="relative text-xs text-slate-500">Ambient, synthwave, binaural beats</div>
                </button>

                <button onClick={() => handleStartRadio('lofi', 'Lofi & Chill')} disabled={radioLoading} className="text-left p-3 rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 hover:border-fuchsia-500/50 transition relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative text-sm font-medium text-slate-200 mb-0.5 flex items-center gap-2">
                    ☕ Lofi & Chill
                    {radioLoading && <Loader2 className="size-3 animate-spin text-slate-400" />}
                  </div>
                  <div className="relative text-xs text-slate-500">Relaxing lofi hip hop for casual work</div>
                </button>

                <button onClick={() => handleStartRadio('hype', 'Standup Hype')} disabled={radioLoading} className="text-left p-3 rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 hover:border-fuchsia-500/50 transition relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative text-sm font-medium text-slate-200 mb-0.5 flex items-center gap-2">
                    🚀 Standup Hype
                    {radioLoading && <Loader2 className="size-3 animate-spin text-slate-400" />}
                  </div>
                  <div className="relative text-xs text-slate-500">High-energy bops to wake up the team</div>
                </button>
              </div>
            </div>
          ) : (
            // Queue tab
            queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
                <Music className="size-10 opacity-40" />
                <p className="text-sm">Queue is empty</p>
                <button onClick={() => setTab("suggest")} className="text-[11px] px-3 py-1.5 rounded-lg border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/10 transition">
                  + Suggest a track
                </button>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-slate-500 sticky top-0 bg-slate-950 z-10">
                  <tr className="border-b border-slate-900 text-left">
                    <th className="font-semibold py-2 pl-4 w-10">#</th>
                    <th className="font-semibold py-2">Title</th>
                    <th className="font-semibold py-2 hidden md:table-cell">Artist</th>
                    <th className="font-semibold py-2 pr-4 w-16 text-right"><Clock className="size-3 inline" /></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const isCurrent = currentIdx === queue.indexOf(t);
                    return (
                      <tr
                        key={t.videoId}
                        onDoubleClick={() => playTrack(queue.indexOf(t))}
                        className={`group border-b border-slate-950 hover:bg-slate-900/40 cursor-pointer ${isCurrent ? "bg-fuchsia-500/5" : ""}`}
                      >
                        <td className="py-2 pl-4 text-slate-500">
                          {isCurrent && playing ? (
                            <div className="flex items-end gap-px h-3">
                              <span className="w-0.5 bg-fuchsia-400 h-1 animate-pulse" />
                              <span className="w-0.5 bg-fuchsia-400 h-2.5 animate-pulse [animation-delay:120ms]" />
                              <span className="w-0.5 bg-fuchsia-400 h-1.5 animate-pulse [animation-delay:240ms]" />
                            </div>
                          ) : (
                            <>
                              <span className="group-hover:hidden">{i + 1}</span>
                              <button onClick={() => playTrack(queue.indexOf(t))} className="hidden group-hover:block text-slate-300">
                                <Play className="size-3 fill-current" />
                              </button>
                            </>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <img src={t.thumbnail} alt={t.title} className="size-8 rounded object-cover shrink-0" />
                            <div className="min-w-0">
                              <div className={`font-medium truncate ${isCurrent ? "text-fuchsia-300" : "text-slate-200"}`}>{t.title}</div>
                              <div className="text-[10px] text-slate-500 truncate">{t.author}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 text-slate-400 hidden md:table-cell truncate max-w-[100px]">{t.addedBy}</td>
                        <td className="py-2 pr-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); toggleLike(t.videoId); }} className={`size-6 grid place-items-center text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 ${liked.has(t.videoId) ? "opacity-100" : ""}`}>
                              <Heart className={`size-3 ${liked.has(t.videoId) ? "fill-rose-500 text-rose-500" : ""}`} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveTrack(t); }} title="Remove from queue" className="size-6 grid place-items-center text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100">
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* Player Bar */}
        <div className="shrink-0 border-t border-slate-900 bg-slate-950 px-3 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Left: current track info */}
          <div className="flex items-center gap-2 min-w-0">
            {current ? (
              <img src={current.thumbnail} alt={current.title} className="size-8 rounded object-cover shrink-0" />
            ) : (
              <div className="size-8 rounded bg-slate-800 shrink-0 grid place-items-center">
                <Music className="size-4 text-slate-600" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-medium truncate text-slate-200">{current?.title ?? "No track selected"}</div>
              <div className="text-[10px] text-slate-500 truncate">{current?.author ?? "Add a YouTube link →"}</div>
            </div>
            <button onClick={() => current && toggleLike(current.videoId)} disabled={!current} className="size-7 grid place-items-center text-slate-400 hover:text-rose-400 disabled:opacity-30">
              <Heart className={`size-3 ${current && liked.has(current.videoId) ? "fill-rose-500 text-rose-500" : ""}`} />
            </button>
            {/* Save to Queue — visible while a track is playing */}
            {current && (() => {
              const isSaved = queue.some(t => t.videoId === current.videoId && t.dbId);
              return (
                <button
                  title={isSaved ? "Already in queue" : "Save to queue"}
                  disabled={isSaved}
                  onClick={async () => {
                    if (!isSaved) {
                      let dbId: string | undefined;
                      try {
                        const saved = await playlistApi.addTrack({
                          channelId: playlistChannelId,
                          videoId: current.videoId,
                          title: current.title,
                          author: current.author,
                          thumbnail: current.thumbnail,
                          addedBy: user?.name ?? "Unknown",
                        });
                        dbId = saved.id;
                      } catch (err) {
                        console.error("Failed to persist track:", err);
                      }
                      setQueue(q => q.map(t =>
                        t.videoId === current.videoId ? { ...t, dbId: dbId ?? t.dbId } : t
                      ));
                    }
                  }}
                  className={`flex items-center gap-1 px-2 h-6 rounded text-[10px] font-medium border transition ${
                    isSaved
                      ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 cursor-default"
                      : "border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/10 cursor-pointer"
                  }`}
                >
                  <ListMusic className="size-3" />
                  {isSaved ? "Saved" : "+ Queue"}
                </button>
              );
            })()}
          </div>

          {/* Center: controls + seek */}
          <div className="flex flex-col items-center gap-1 min-w-[260px]">
            <div className="flex items-center gap-1">
              <button onClick={() => setShuffle(s => !s)} className={`size-7 grid place-items-center rounded ${shuffle ? "text-fuchsia-300" : "text-slate-500 hover:text-slate-200"}`}>
                <Shuffle className="size-3" />
              </button>
              <button onClick={handlePrev} disabled={queue.length === 0} className="size-7 grid place-items-center text-slate-300 hover:text-white disabled:opacity-30">
                <SkipBack className="size-3.5 fill-current" />
              </button>
              <button
                onClick={() => playing ? handlePause() : handlePlay()}
                disabled={!current}
                className="size-8 rounded-full bg-white text-slate-900 grid place-items-center hover:scale-105 transition shadow disabled:opacity-30"
              >
                {playing ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
              </button>
              <button onClick={handleNext} disabled={queue.length === 0} className="size-7 grid place-items-center text-slate-300 hover:text-white disabled:opacity-30">
                <SkipForward className="size-3.5 fill-current" />
              </button>
              <button
                onClick={() => setRepeat(r => r === "off" ? "all" : r === "all" ? "one" : "off")}
                className={`size-7 grid place-items-center rounded relative ${repeat !== "off" ? "text-fuchsia-300" : "text-slate-500 hover:text-slate-200"}`}
              >
                <Repeat className="size-3" />
                {repeat === "one" && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold">1</span>}
              </button>
            </div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-[9px] text-slate-500 font-mono w-8 text-right">{fmt(progress)}</span>
              <div
                className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden cursor-pointer group"
                onClick={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  handleSeek((e.clientX - r.left) / r.width);
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 group-hover:from-fuchsia-400 transition-all"
                  style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-[9px] text-slate-500 font-mono w-8">{fmt(duration)}</span>
            </div>
          </div>

          {/* Right: volume */}
          <div className="flex items-center gap-1.5 justify-end">
            <button onClick={() => setMuted(m => !m)} className="size-7 grid place-items-center text-slate-400 hover:text-slate-200">
              {muted || volume === 0 ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </button>
            <input
              type="range" min={0} max={100} value={muted ? 0 : volume}
              onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
              className="w-16 accent-fuchsia-500 cursor-pointer"
            />
          </div>
        </div>
      </main>

      {/* ── RIGHT: Listening Party + Up Next ─────────────────────────── */}
      <aside className="border-l border-slate-900 bg-slate-950/20 flex flex-col min-h-0">
        <div className="p-3 border-b border-slate-900 flex items-center gap-2">
          <Users className="size-4 text-fuchsia-400" />
          <div className="text-sm font-semibold text-slate-200">Listening Party</div>
          <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded border font-mono ${
            isConnected
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-slate-800 text-slate-500 border-slate-700"
          }`}>
            {isConnected ? (partyMode ? "SYNCED" : "SOLO") : "OFFLINE"}
          </span>
        </div>

        {/* Participants */}
        <div className="p-2 space-y-0.5 border-b border-slate-900 max-h-[35%] overflow-y-auto">
          {allParticipants.length === 0 ? (
            <div className="text-center py-4 text-slate-600 text-[11px]">You're alone in the lounge</div>
          ) : (
            allParticipants.map((p, idx) => {
              const displayName = p.name || p.identity || "Offline Guest";
              return (
              <div key={p.identity || `offline-${idx}`} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-900/30">
                <div className="size-7 rounded-md bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center text-[10px] font-bold text-white relative shrink-0">
                  {displayName[0].toUpperCase()}
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border border-slate-950 grid place-items-center">
                    <Music className="size-1.5 text-white" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate text-slate-200">{displayName}</div>
                  <div className="text-[10px] text-slate-500 truncate">♪ {current?.title ?? "idle"}</div>
                </div>
              </div>
            )})
          )}
        </div>

        {/* Up Next */}
        <div className="p-3 border-b border-slate-900 flex items-center gap-2">
          <ListMusic className="size-4 text-slate-400" />
          <div className="text-sm font-semibold text-slate-200">Up Next</div>
          <span className="ml-auto text-[10px] text-slate-500 font-mono">{Math.max(0, queue.length - currentIdx - 1)} in queue</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
          {queue.length === 0 ? (
            <div className="text-center py-6 text-slate-600 text-[11px]">Queue is empty</div>
          ) : (
            queue.map((t, i) => {
              const isCurrent = i === currentIdx;
              const isPast = i < currentIdx;
              return (
                <button
                  key={t.videoId}
                  onClick={() => playTrack(i)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-900/30 text-left ${isCurrent ? "bg-fuchsia-500/10" : ""} ${isPast ? "opacity-40" : ""}`}
                >
                  <img src={t.thumbnail} alt={t.title} className="size-7 rounded object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-medium truncate ${isCurrent ? "text-fuchsia-300" : "text-slate-300"}`}>{t.title}</div>
                    <div className="text-[10px] text-slate-500 truncate">{t.author}</div>
                  </div>
                  {isCurrent && playing && <Disc3 className="size-3.5 text-fuchsia-400 animate-spin [animation-duration:6s] shrink-0" />}
                </button>
              );
            })
          )}
        </div>
        <div className="p-2 border-t border-slate-900">
          <button
            onClick={() => setTab("suggest")}
            className="w-full h-8 rounded-md bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/30 text-fuchsia-200 text-[10px] font-medium flex items-center justify-center gap-1 hover:from-fuchsia-500/30 transition"
          >
            <Plus className="size-3" /> Add a track
          </button>
        </div>
      </aside>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 h-7 rounded text-[11px] font-medium transition ${active ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"}`}
    >
      {children}
    </button>
  );
}
