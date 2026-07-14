import { useState, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, Loader2, AlertCircle, Users, Lock, Globe } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

interface CallLobbyProps {
  projectName: string;
  callType: "open" | "invite_only";
  onJoin: () => void;
  onCancel: () => void;
  isRejoining?: boolean;
}

export function CallLobby({ projectName, callType, onJoin, onCancel, isRejoining = false }: CallLobbyProps) {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<"checking" | "granted" | "denied">("checking");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [devices, setDevices] = useState<{ audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }>({
    audio: [],
    video: [],
  });

  useEffect(() => {
    async function checkPermissions() {
      try {
        // Request permissions
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        
        // Get available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === "audioinput");
        const videoInputs = devices.filter((d) => d.kind === "videoinput");

        setDevices({ audio: audioInputs, video: videoInputs });
        
        if (audioInputs.length > 0) setSelectedMic(audioInputs[0].deviceId);
        if (videoInputs.length > 0) setSelectedCamera(videoInputs[0].deviceId);

        // Stop the stream after getting permissions
        stream.getTracks().forEach((track) => track.stop());
        
        setPermissionStatus("granted");
      } catch (err) {
        console.error("Permission denied:", err);
        setPermissionStatus("denied");
      }
    }

    checkPermissions();
  }, []);

  const handleRequestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionStatus("granted");
    } catch (err) {
      console.error("Permission denied:", err);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            {callType === "invite_only" ? (
              <Lock className="size-6 text-amber-400" />
            ) : (
              <Globe className="size-6 text-emerald-400" />
            )}
            <h1 className="text-2xl font-bold text-slate-100">
              {isRejoining ? "Rejoin Call" : "Join Call"}
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

        {/* Permission Status */}
        {permissionStatus === "checking" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="size-8 text-fuchsia-400 animate-spin" />
            <p className="text-slate-400 text-sm">Checking camera and microphone permissions...</p>
          </div>
        )}

        {permissionStatus === "denied" && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-rose-300 text-sm">Permissions Required</p>
                <p className="text-rose-200/70 text-xs mt-1">
                  Camera and microphone access are needed to join the call. Please grant permissions in your browser settings.
                </p>
              </div>
            </div>
            <button
              onClick={handleRequestPermissions}
              className="w-full h-9 rounded-lg text-xs font-medium bg-rose-500 hover:bg-rose-600 text-white transition"
            >
              Request Permissions
            </button>
          </div>
        )}

        {permissionStatus === "granted" && (
          <div className="space-y-4">
            {/* Device Selection */}
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                  <Mic className="size-3.5" />
                  Microphone
                </label>
                {devices.audio.length > 0 ? (
                  <select
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    className="w-full h-9 rounded-lg bg-slate-900 border border-slate-800 px-3 text-xs text-slate-200 outline-none focus:border-fuchsia-500 transition"
                  >
                    {devices.audio.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-9 rounded-lg bg-slate-900 border border-slate-800 px-3 flex items-center text-xs text-slate-500">
                    No microphones found
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                  <Video className="size-3.5" />
                  Camera
                </label>
                {devices.video.length > 0 ? (
                  <select
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    className="w-full h-9 rounded-lg bg-slate-900 border border-slate-800 px-3 text-xs text-slate-200 outline-none focus:border-fuchsia-500 transition"
                  >
                    {devices.video.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-9 rounded-lg bg-slate-900 border border-slate-800 px-3 flex items-center text-xs text-slate-500">
                    No cameras found
                  </div>
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
                className="flex-1 h-10 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={onJoin}
                className="flex-1 h-10 rounded-lg text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white flex items-center justify-center gap-2 transition shadow-lg shadow-fuchsia-500/20"
              >
                <Users className="size-3.5" />
                {isRejoining ? "Rejoin Call" : "Join Call"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
