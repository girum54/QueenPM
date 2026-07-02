import { useEffect, useMemo, useState } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX,
  Heart, Plus, Search, ListMusic, Radio, Mic2, Disc3, Users, Sparkles, Music,
  Headphones, Share2, Clock, Trash2
} from "lucide-react";

type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  cover: string; // gradient classes
  bpm?: number;
  mood?: string;
};

const LIB: Track[] = [
  { id: "t1", title: "Neon Skyline", artist: "Aurora Pulse", album: "Voltage", duration: 214, cover: "from-fuchsia-500 to-indigo-600", bpm: 124, mood: "Focus" },
  { id: "t2", title: "Velvet Static", artist: "Maya Chen", album: "Late Drift", duration: 198, cover: "from-rose-500 to-amber-500", bpm: 96, mood: "Chill" },
  { id: "t3", title: "Midnight API", artist: "Queen PM", album: "Standup Bops", duration: 162, cover: "from-pink-500 to-violet-600", bpm: 140, mood: "Hype" },
  { id: "t4", title: "Gradient Rain", artist: "Sofia Reyes", album: "Pastel", duration: 247, cover: "from-sky-500 to-emerald-500", bpm: 88, mood: "Chill" },
  { id: "t5", title: "Sprint Engine", artist: "Diego Park", album: "Velocity", duration: 188, cover: "from-amber-500 to-rose-600", bpm: 132, mood: "Focus" },
  { id: "t6", title: "Tokyo Drift Reply", artist: "Arjun Patel", album: "Reply Guys", duration: 226, cover: "from-emerald-500 to-cyan-600", bpm: 118, mood: "Hype" },
  { id: "t7", title: "Soft Reset", artist: "Aurora Pulse", album: "Voltage", duration: 175, cover: "from-violet-500 to-fuchsia-600", bpm: 102, mood: "Focus" },
  { id: "t8", title: "Backlog Lullaby", artist: "Queen PM", album: "Standup Bops", duration: 203, cover: "from-indigo-500 to-blue-600", bpm: 78, mood: "Chill" },
];

const PLAYLISTS = [
  { id: "focus", name: "Deep Focus", count: 42, cover: "from-fuchsia-500 to-violet-600", desc: "AI-curated for sprint zone" },
  { id: "standup", name: "Standup Bops", count: 18, cover: "from-emerald-500 to-teal-600", desc: "Wake the team up" },
  { id: "ship", name: "Ship It Friday", count: 31, cover: "from-amber-500 to-rose-600", desc: "Deploy day energy" },
  { id: "lofi", name: "Lo-fi Backlog", count: 67, cover: "from-sky-500 to-indigo-600", desc: "Tickets & beats" },
];

const LISTENING_NOW = [
  { id: "u2", name: "Maya Chen", color: "from-emerald-500 to-teal-600", track: "Velvet Static" },
  { id: "u4", name: "Sofia Reyes", color: "from-sky-500 to-blue-600", track: "Gradient Rain" },
  { id: "u5", name: "Queen PM", color: "from-pink-500 to-rose-600", track: "Midnight API", ai: true },
];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function MusicView() {
  const [queue, setQueue] = useState<Track[]>([LIB[2], LIB[0], LIB[5], LIB[3]]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(38);
  const [volume, setVolume] = useState(72);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("all");
  const [liked, setLiked] = useState<Set<string>>(new Set(["t2", "t3"]));
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"library" | "playlists">("library");
  const [partyMode, setPartyMode] = useState(true);

  const current = queue[idx];

  useEffect(() => {
    if (!playing || !current) return;
    const t = setInterval(() => {
      setProgress((p) => {
        if (p + 1 >= current.duration) {
          // auto-next
          setIdx((i) => (repeat === "one" ? i : (i + 1) % queue.length));
          return 0;
        }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [playing, current, repeat, queue.length]);

  const filtered = useMemo(
    () => LIB.filter((t) =>
      [t.title, t.artist, t.album].join(" ").toLowerCase().includes(search.toLowerCase()),
    ),
    [search],
  );

  const toggleLike = (id: string) =>
    setLiked((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const addToQueue = (t: Track) => setQueue((q) => [...q, t]);
  const playNow = (t: Track) => {
    setQueue((q) => {
      const n = [...q];
      const exists = n.findIndex((x) => x.id === t.id);
      if (exists >= 0) {
        setIdx(exists);
        return n;
      }
      const newQ = [...n.slice(0, idx + 1), t, ...n.slice(idx + 1)];
      setIdx(idx + 1);
      return newQ;
    });
    setProgress(0);
    setPlaying(true);
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-0 bg-slate-950">
      {/* CENTER */}
      <main className="flex flex-col min-h-0">
        {/* Now playing hero */}
        <div className="relative shrink-0 p-6 border-b border-slate-900 overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${current?.cover ?? "from-slate-800 to-slate-900"} opacity-20`} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="relative flex items-center gap-5">
            <div className={`size-24 rounded-xl bg-gradient-to-br ${current?.cover} shadow-2xl shadow-black/50 grid place-items-center relative overflow-hidden shrink-0`}>
              <Disc3 className={`size-12 text-white/40 ${playing ? "animate-spin [animation-duration:6s]" : ""}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-rose-400 animate-pulse" /> LIVE LOUNGE
                </span>
                {partyMode && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 flex items-center gap-1">
                    <Users className="size-3" /> Party · 8 listening
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold mt-1.5 truncate text-slate-100">{current?.title ?? "Nothing playing"}</h1>
              <div className="text-xs text-slate-400 truncate">
                {current?.artist} · <span className="text-slate-500">{current?.album}</span>
              </div>
              <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
                <button
                  onClick={() => { setPlaying((p) => !p); }}
                  className="h-8 px-3 rounded-full bg-white text-slate-900 text-[11px] font-bold flex items-center gap-1 hover:scale-105 transition"
                >
                  {playing ? <Pause className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  onClick={() => current && toggleLike(current.id)}
                  className="size-8 rounded-full border border-slate-800 hover:bg-slate-900 grid place-items-center"
                >
                  <Heart className={`size-3.5 ${current && liked.has(current.id) ? "fill-rose-500 text-rose-500" : "text-slate-350"}`} />
                </button>
                <button
                  onClick={() => setPartyMode((p) => !p)}
                  className={`h-8 px-2.5 rounded-full border text-[11px] font-medium flex items-center gap-1 ${
                    partyMode
                      ? "bg-fuchsia-500/20 text-fuchsia-205 border-fuchsia-500/40"
                      : "border-slate-800 text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <Headphones className="size-3" /> {partyMode ? "Synced" : "Solo"}
                </button>
                <button className="h-8 px-2.5 rounded-full border border-slate-800 hover:bg-slate-900 text-[11px] text-slate-300 flex items-center gap-1">
                  <Share2 className="size-3" /> Share
                </button>
                <button className="h-8 px-2.5 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/30 text-fuchsia-200 text-[11px] flex items-center gap-1">
                  <Sparkles className="size-3" /> Queen DJ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs + search */}
        <div className="shrink-0 border-b border-slate-900 px-4 h-11 flex items-center gap-1">
          <TabBtn active={tab === "library"} onClick={() => setTab("library")}>Tracks</TabBtn>
          <TabBtn active={tab === "playlists"} onClick={() => setTab("playlists")}>Playlists</TabBtn>
          <div className="ml-auto flex items-center gap-2 px-2 py-0.5 rounded bg-slate-900/50 border border-slate-900 text-xs w-48">
            <Search className="size-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracks…"
              className="bg-transparent outline-none flex-1 text-xs placeholder:text-slate-500 text-slate-200"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === "library" ? (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500 sticky top-0 bg-slate-950 z-10">
                <tr className="border-b border-slate-900 text-left">
                  <th className="font-semibold py-2 pl-4 w-10">#</th>
                  <th className="font-semibold py-2">Title</th>
                  <th className="font-semibold py-2 hidden md:table-cell">Album</th>
                  <th className="font-semibold py-2 hidden lg:table-cell w-20">BPM</th>
                  <th className="font-semibold py-2 pr-4 w-20 text-right"><Clock className="size-3 inline" /></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const isCurrent = current?.id === t.id;
                  return (
                    <tr
                      key={t.id}
                      onDoubleClick={() => playNow(t)}
                      className={`group border-b border-slate-950 hover:bg-slate-900/40 ${isCurrent ? "bg-fuchsia-500/5" : ""}`}
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
                            <button onClick={() => playNow(t)} className="hidden group-hover:block text-slate-300">
                              <Play className="size-3 fill-current" />
                            </button>
                          </>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className={`size-8 rounded bg-gradient-to-br ${t.cover} shrink-0`} />
                          <div className="min-w-0">
                            <div className={`font-medium truncate ${isCurrent ? "text-fuchsia-300" : "text-slate-200"}`}>{t.title}</div>
                            <div className="text-[10px] text-slate-500 truncate">{t.artist}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 text-slate-400 hidden md:table-cell">{t.album}</td>
                      <td className="py-2 text-slate-400 hidden lg:table-cell font-mono text-xs">{t.bpm}</td>
                      <td className="py-2 pr-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => toggleLike(t.id)} className="size-6 grid place-items-center text-slate-500 hover:text-rose-450 opacity-0 group-hover:opacity-100">
                            <Heart className={`size-3 ${liked.has(t.id) ? "fill-rose-500 text-rose-500 opacity-100" : ""}`} />
                          </button>
                          <button onClick={() => addToQueue(t)} className="size-6 grid place-items-center text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100">
                            <Plus className="size-3" />
                          </button>
                          <span className="text-[10px] text-slate-500 font-mono w-10 inline-block">{fmt(t.duration)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
              {PLAYLISTS.map((p) => (
                <div key={p.id} className="group rounded-xl border border-slate-900 bg-slate-900/10 p-3 hover:bg-slate-900/40 transition">
                  <div className={`aspect-square rounded-lg bg-gradient-to-br ${p.cover} mb-2.5 grid place-items-center relative overflow-hidden`}>
                    <ListMusic className="size-8 text-white/40" />
                    <button className="absolute bottom-2 right-2 size-8 rounded-full bg-fuchsia-500 grid place-items-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition shadow-lg">
                      <Play className="size-3.5 fill-white text-white" />
                    </button>
                  </div>
                  <div className="text-xs font-semibold truncate text-slate-205">{p.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{p.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Player bar */}
        <div className="shrink-0 border-t border-slate-900 bg-slate-950 px-3 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`size-8 rounded bg-gradient-to-br ${current?.cover} shrink-0`} />
            <div className="min-w-0">
              <div className="text-xs font-medium truncate text-slate-200">{current?.title}</div>
              <div className="text-[10px] text-slate-500 truncate">{current?.artist}</div>
            </div>
            <button onClick={() => current && toggleLike(current.id)} className="size-7 grid place-items-center text-slate-400 hover:text-rose-400">
              <Heart className={`size-3 ${current && liked.has(current.id) ? "fill-rose-500 text-rose-500" : ""}`} />
            </button>
          </div>
          <div className="flex flex-col items-center gap-1 min-w-[280px]">
            <div className="flex items-center gap-1">
              <button onClick={() => setShuffle((s) => !s)} className={`size-7 grid place-items-center rounded ${shuffle ? "text-fuchsia-300" : "text-slate-450 hover:text-slate-200"}`}>
                <Shuffle className="size-3" />
              </button>
              <button onClick={() => { setIdx((i) => (i - 1 + queue.length) % queue.length); setProgress(0); }} className="size-7 grid place-items-center text-slate-300 hover:text-white">
                <SkipBack className="size-3.5 fill-current" />
              </button>
              <button onClick={() => setPlaying((p) => !p)} className="size-8 rounded-full bg-white text-slate-900 grid place-items-center hover:scale-105 transition shadow">
                {playing ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
              </button>
              <button onClick={() => { setIdx((i) => (i + 1) % queue.length); setProgress(0); }} className="size-7 grid place-items-center text-slate-300 hover:text-white">
                <SkipForward className="size-3.5 fill-current" />
              </button>
              <button
                onClick={() => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"))}
                className={`size-7 grid place-items-center rounded relative ${repeat !== "off" ? "text-fuchsia-300" : "text-slate-450 hover:text-slate-200"}`}
              >
                <Repeat className="size-3" />
                {repeat === "one" && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold">1</span>}
              </button>
            </div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-[9px] text-slate-500 font-mono w-8 text-right">{fmt(progress)}</span>
              <div
                className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden cursor-pointer group"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - r.left) / r.width;
                  setProgress(Math.floor(pct * (current?.duration ?? 0)));
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 group-hover:from-fuchsia-400"
                  style={{ width: `${current ? (progress / current.duration) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-500 font-mono w-8">{fmt(current?.duration ?? 0)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <button onClick={() => setMuted((m) => !m)} className="size-7 grid place-items-center text-slate-400 hover:text-slate-205">
              {muted || volume === 0 ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </button>
            <input
              type="range" min={0} max={100} value={muted ? 0 : volume}
              onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
              className="w-16 accent-fuchsia-500 cursor-pointer"
            />
          </div>
        </div>
      </main>

      {/* RIGHT: queue + listening party */}
      <aside className="border-l border-slate-900 bg-slate-950/20 flex flex-col min-h-0">
        <div className="p-3 border-b border-slate-900 flex items-center gap-2">
          <Users className="size-4 text-fuchsia-400" />
          <div className="text-sm font-semibold text-slate-200">Listening Party</div>
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">SYNCED</span>
        </div>
        <div className="p-2 space-y-0.5 border-b border-slate-900 max-h-[35%] overflow-y-auto">
          {LISTENING_NOW.map((u) => (
            <div key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-900/30">
              <div className={`size-7 rounded-md bg-gradient-to-br ${u.color} grid place-items-center text-[10px] font-bold text-white relative`}>
                {u.name.split(" ").map((n) => n[0]).join("")}
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border border-slate-950 grid place-items-center">
                  <Music className="size-1.5 text-white" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate flex items-center gap-0.5 text-slate-200">
                  {u.name}
                  {u.ai && <Sparkles className="size-3 text-fuchsia-300 shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-500 truncate">♪ {u.track}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-b border-slate-900 flex items-center gap-2">
          <ListMusic className="size-4 text-slate-400" />
          <div className="text-sm font-semibold text-slate-200">Up Next</div>
          <span className="ml-auto text-[10px] text-slate-500 font-mono">{queue.length - idx - 1} in queue</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
          {queue.map((t, i) => {
            const isCurrent = i === idx;
            const isPast = i < idx;
            return (
              <button
                key={`${t.id}-${i}`}
                onClick={() => { setIdx(i); setProgress(0); setPlaying(true); }}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-900/30 text-left ${
                  isCurrent ? "bg-fuchsia-500/10" : ""
                } ${isPast ? "opacity-40" : ""}`}
              >
                <div className={`size-7 rounded bg-gradient-to-br ${t.cover} shrink-0 grid place-items-center`}>
                  {isCurrent && playing && <Disc3 className="size-3.5 text-white animate-spin [animation-duration:6s]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-medium truncate ${isCurrent ? "text-fuchsia-300" : "text-slate-350"}`}>{t.title}</div>
                  <div className="text-[10px] text-slate-500 truncate">{t.artist}</div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{fmt(t.duration)}</span>
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-slate-900">
          <button className="w-full h-8 rounded-md bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/30 text-fuchsia-200 text-[10px] font-medium flex items-center justify-center gap-1">
            <Sparkles className="size-3" /> Queen DJ auto-queue
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
