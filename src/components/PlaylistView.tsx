/**
 * PlaylistView.tsx — Playlist Manager for Queen PM
 *
 * Features:
 *  - Search YouTube for tracks
 *  - Add tracks to channel playlists
 *  - View and manage saved playlists
 *  - Remove tracks from playlists
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, Plus, ListMusic, Music, Trash2, X, Loader2,
} from "lucide-react";
import { useStore } from "@/lib/queen-store";
import { useAuth } from "@/lib/auth-store";
import {
  extractYouTubeId,
  type YouTubeMetadata,
} from "@/lib/youtube-utils";
import { playlistApi } from "@/lib/api/queen.api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlaylistTrack extends YouTubeMetadata {
  addedBy: string;
  dbId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlaylistView() {
  const { user } = useAuth();
  const { channels, activeChannelId, playlistPanelOpen, setPlaylistPanelOpen } = useStore();
  const playlistChannelId = activeChannelId || channels[0]?.id || 'c4452bb1-4694-415d-8919-e48de2cfaed2';

  const RAW_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
  const API_BASE_URL = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL.replace(/\/$/, '')}/api`;

  // ── State ────────────────────────────────────────────────────────────────
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
  const [search, setSearch] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeMetadata[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(true);

  // ── Load persisted playlist on channel change ─────────────────────────
  useEffect(() => {
    if (!playlistChannelId) return;
    setPlaylistLoading(true);
    playlistApi.getByChannel(playlistChannelId)
      .then(tracks => {
        const formatted = tracks.map(t => ({
          videoId: t.videoId,
          title: t.title,
          author: t.author,
          thumbnail: t.thumbnail,
          addedBy: t.addedBy,
          dbId: t.id,
        }));
        setPlaylist(formatted);
      })
      .catch(err => console.error('Failed to load playlist:', err))
      .finally(() => setPlaylistLoading(false));
  }, [playlistChannelId]);

  // ── Search or add a track ─────────────────────────────────────────────
  const handleSearch = async () => {
    const input = urlInput.trim();
    if (!input) return;

    setUrlLoading(true);
    setUrlError("");
    setSearchResults([]);

    const videoId = extractYouTubeId(input);
    
    if (videoId) {
      // It's a direct URL — proxy via backend
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

  const handleAddTrack = async (meta: YouTubeMetadata) => {
    if (playlist.find(t => t.videoId === meta.videoId)) {
      setUrlError("This track is already in the playlist.");
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

    const track: PlaylistTrack = { ...meta, addedBy: user?.name ?? "You", dbId };
    setPlaylist(p => [...p, track]);
    setSearchResults(res => res.filter(r => r.videoId !== meta.videoId));
    setUrlInput("");
  };

  /** Removes a track from the playlist, both locally and from the database. */
  const handleRemoveTrack = async (track: PlaylistTrack) => {
    if (track.dbId) {
      try {
        await playlistApi.removeTrack(track.dbId);
      } catch (err) {
        console.error("Failed to delete track from playlist database:", err);
      }
    }

    setPlaylist(p => p.filter(t => t.videoId !== track.videoId));
  };

  const filtered = useMemo(() =>
    playlist.filter(t => [t.title, t.author].join(" ").toLowerCase().includes(search.toLowerCase())),
    [search, playlist]
  );

  // ── Loading state ─────────────────────────────────────────────────────

  if (!playlistPanelOpen) return null;

  if (playlistLoading) {
    return (
      <div className="fixed inset-y-0 right-0 w-96 bg-slate-950 border-l border-slate-900 shadow-2xl z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-fuchsia-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading playlist…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-950 border-l border-slate-900 shadow-2xl z-50 flex flex-col">

      {/* Header */}
      <div className="shrink-0 border-b border-slate-900 px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center">
            <ListMusic className="size-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-100">Playlist Manager</h1>
            <p className="text-xs text-slate-400">Search, save, and manage your channel playlists for QueenDJ</p>
          </div>
          <button
            onClick={() => setPlaylistPanelOpen(false)}
            className="size-8 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition grid place-items-center"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900/40 focus-within:border-fuchsia-500/50 transition">
            <Search className="size-4 text-slate-500 shrink-0" />
            <input
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setUrlError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search e.g. 'lofi beats' or paste YouTube URL..."
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none"
            />
            {urlInput && (
              <button onClick={() => { setUrlInput(""); setSearchResults([]); }} className="text-slate-500 hover:text-slate-300">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={!urlInput.trim() || urlLoading}
            className="h-10 px-5 rounded-lg bg-fuchsia-500 hover:bg-fuchsia-400 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-semibold transition"
          >
            {urlLoading ? "…" : "Search"}
          </button>
        </div>
        {urlError && <p className="text-xs text-rose-400 mt-2">{urlError}</p>}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="shrink-0 border-b border-slate-900 p-4 bg-slate-900/20">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Search Results</h3>
            <div className="space-y-2">
              {searchResults.map(res => (
                <div key={`search-${res.videoId}`} className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 transition">
                  <img src={res.thumbnail} alt={res.title} className="size-12 rounded object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-200 truncate">{res.title}</div>
                    <div className="text-xs text-slate-500 truncate">{res.author}</div>
                  </div>
                  <button
                    onClick={() => handleAddTrack(res)}
                    className="h-8 px-4 rounded-md bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-medium transition flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="size-3" /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Playlist */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Channel Playlist ({playlist.length} tracks)
              </h3>
              <div className="flex items-center gap-2 px-2 py-1 rounded bg-slate-900/50 border border-slate-900 text-xs w-40">
                <Search className="size-3.5 text-slate-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search playlist…"
                  className="bg-transparent outline-none flex-1 text-xs placeholder:text-slate-500 text-slate-200"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                <Music className="size-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">{search ? "No tracks match your search" : "Your playlist is empty"}</p>
                <p className="text-xs mt-1">Search for songs above to add them</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((track, idx) => (
                  <div
                    key={track.dbId ?? `track-${track.videoId}-${idx}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-900 bg-slate-900/20 hover:bg-slate-900/40 transition group"
                  >
                    <span className="text-xs text-slate-500 w-6 text-center">{idx + 1}</span>
                    <img src={track.thumbnail} alt={track.title} className="size-10 rounded object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-200 truncate">{track.title}</div>
                      <div className="text-xs text-slate-500 truncate">{track.author} · added by {track.addedBy}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveTrack(track)}
                      title="Remove from playlist"
                      className="size-8 grid place-items-center rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
