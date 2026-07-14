import { Users, Lock, Globe, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

interface CallLobbyProps {
  projectName: string;
  callType: "open" | "invite_only";
  onJoin: () => void;
  onCancel: () => void;
  isRejoining?: boolean;
  isLoading?: boolean;
}

export function CallLobby({ projectName, callType, onJoin, onCancel, isRejoining = false, isLoading = false }: CallLobbyProps) {
  const { user } = useAuth();

  return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            {isLoading ? (
              <Loader2 className="size-6 text-fuchsia-400 animate-spin" />
            ) : callType === "invite_only" ? (
              <Lock className="size-6 text-amber-400" />
            ) : (
              <Globe className="size-6 text-emerald-400" />
            )}
            <h1 className="text-2xl font-bold text-slate-100">
              {isLoading ? "Checking..." : isRejoining ? "Rejoin Call" : "Join Call"}
            </h1>
          </div>
          <p className="text-slate-400">{projectName}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            {callType === "invite_only" ? (
              <span className="text-xs text-amber-400">Invite Only</span>
            ) : (
              <span className="text-xs text-emerald-400">Open Call</span>
            )}
          </div>
        </div>

        {/* User Preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div className="size-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white">
            {user?.name?.[0] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name || "You"}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 h-10 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onJoin}
            disabled={isLoading}
            className="flex-1 h-10 rounded-lg text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white flex items-center justify-center gap-2 transition shadow-lg shadow-fuchsia-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Users className="size-3.5" />
            )}
            {isLoading ? "Loading..." : isRejoining ? "Rejoin Call" : "Join Call"}
          </button>
        </div>
      </div>
    </div>
  );
}
