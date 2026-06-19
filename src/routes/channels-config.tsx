import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Hash, Bot, Plus, Trash2, Shield, Settings, ArrowLeft, Check, Sparkles, MessageSquare, Loader2
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/queen-store";

export const Route = createFileRoute("/channels-config")({
  head: () => ({
    meta: [
      { title: "Channel Settings — Queen PM" },
      { name: "description", content: "Configure project channels and AI monitoring." },
    ],
  }),
  component: ChannelsConfigPage,
});

function ChannelsConfigPage() {
  const { channels, addChannel, updateChannel, deleteChannel } = useStore();
  const navigate = useNavigate();

  const [newName, setNewName] = useState("");
  const [newAiActive, setNewAiActive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await addChannel(newName.trim(), newAiActive);
      setNewName("");
      setNewAiActive(false);
    } finally {
      setIsAdding(false);
    }
  };

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveRename = async (id: string) => {
    if (!editingName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await updateChannel(id, { name: editingName.trim().toLowerCase().replace(/\s+/g, "-") });
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[800px] mx-auto px-8 py-7 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-900 pb-5">
            <button
              onClick={() => navigate({ to: "/channels" })}
              className="size-8 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 grid place-items-center transition"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <MessageSquare className="size-3.5 text-fuchsia-400" /> Workspace
              </div>
              <h1 className="text-2xl font-semibold text-slate-50 tracking-tight">Channel Settings</h1>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            
            {/* LEFT: Add Channel Form */}
            <div className="md:col-span-1 rounded-xl border border-slate-900 bg-slate-950/20 p-5 space-y-4">
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="size-3.5 text-fuchsia-400" /> Create Channel
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">Channel Name</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-xs text-slate-600 font-mono">#</span>
                    <input
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. eng-backend"
                      className="w-full h-9 pl-6 pr-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-100 outline-none focus:border-fuchsia-500 transition"
                    />
                  </div>
                </div>

                {/* AI Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 border border-slate-800/60">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-semibold text-slate-200 flex items-center gap-1">
                      <Sparkles className="size-3 text-fuchsia-400" /> AI Monitoring
                    </div>
                    <div className="text-[9px] text-slate-500">Autonomous task scoping</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewAiActive(!newAiActive)}
                    className={`w-9 h-5 rounded-full p-0.5 transition ${
                      newAiActive ? "bg-fuchsia-500" : "bg-slate-850"
                    }`}
                  >
                    <div className={`size-4 rounded-full bg-white transition-transform ${newAiActive ? "translate-x-4" : ""}`} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full h-8 rounded-lg text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isAdding ? <><Loader2 className="size-3.5 animate-spin" /> Creating...</> : "Create"}
                </button>
              </form>
            </div>

            {/* RIGHT: Channel List & Config */}
            <div className="md:col-span-2 space-y-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                Active Channels ({channels.length})
              </h2>

              <div className="divide-y divide-slate-900 border border-slate-900 rounded-xl bg-slate-950/20 overflow-hidden">
                {channels.map((ch) => (
                  <div key={ch.id} className="flex items-center gap-3 p-3.5 hover:bg-slate-900/20 transition text-xs">
                    
                    {/* Channel name or Input */}
                    <div className="flex-1 min-w-0">
                      {editingId === ch.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 font-mono">#</span>
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveRename(ch.id)}
                            className="h-8 px-2 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-fuchsia-500"
                          />
                          <button
                            onClick={() => saveRename(ch.id)}
                            disabled={isSaving}
                            className="size-7 rounded bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/30 flex items-center justify-center transition disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Hash className="size-3.5 text-slate-500 shrink-0" />
                          <span className="font-semibold text-slate-200 truncate">
                            {ch.name}
                          </span>
                          {ch.id === "c1" && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-500 font-semibold uppercase">
                              Default
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* AI Monitor toggle */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateChannel(ch.id, { aiActive: !ch.aiActive })}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition ${
                            ch.aiActive
                              ? "bg-fuchsia-500/10 text-fuchsia-300 ring-1 ring-fuchsia-500/30"
                              : "bg-slate-900 text-slate-500 hover:text-slate-350"
                          }`}
                        >
                          <Bot className="size-3" />
                          <span>{ch.aiActive ? "AI Active" : "AI Inactive"}</span>
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 pl-2 border-l border-slate-900">
                        {editingId !== ch.id && (
                          <button
                            onClick={() => startRename(ch.id, ch.name)}
                            className="size-7 rounded hover:bg-slate-900 text-slate-500 hover:text-slate-300 flex items-center justify-center transition"
                            title="Rename Channel"
                          >
                            <Settings className="size-3.5" />
                          </button>
                        )}
                        <button
                          disabled={channels.length <= 1 || ch.id === "c1"}
                          onClick={() => deleteChannel(ch.id)}
                          className="size-7 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 flex items-center justify-center transition"
                          title="Delete Channel"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </AppShell>
  );
}
