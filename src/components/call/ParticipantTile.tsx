import { useEffect, useRef } from "react";
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, Hand, Maximize2,
} from "lucide-react";
import { Participant, TrackReference, isScreenShareEnabled } from "livekit-client";
import { VideoTrack, AudioTrack } from "@livekit/components-react";

export interface ParticipantTileProps {
  participant: Participant | LocalParticipant;
  large?: boolean;
  small?: boolean;
  onClick?: () => void;
}

interface LocalParticipant {
  name?: string;
  identity: string;
}

export function ParticipantTile({
  participant,
  large,
  small,
  onClick,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isCameraOn = "isCameraEnabled" in participant && participant.isCameraEnabled();
  const isMicOn = "isMicrophoneEnabled" in participant && participant.isMicrophoneEnabled();
  const isScreenSharing = "isScreenShareEnabled" in participant && participant.isScreenShareEnabled();
  const name = participant.name || participant.identity || "Unknown";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const bgColor = "from-fuchsia-500 to-violet-600";

  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl overflow-hidden border bg-slate-900 group w-full ${
        small ? "h-[120px]" : large ? "h-full min-h-[300px]" : "h-full min-h-[100px]"
      } border-slate-800 hover:border-slate-700 transition`}
    >
      {isCameraOn ? (
        <div className={`absolute inset-0 bg-gradient-to-br ${bgColor} opacity-80`}>
          {/* Video will render here */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 grid place-items-center">
          <div className={`${
            small ? "size-10 text-sm" : large ? "size-20 text-2xl" : "size-16 text-lg"
          } rounded-full bg-gradient-to-br ${bgColor} grid place-items-center font-bold text-white shadow-lg`}>
            {initials}
          </div>
        </div>
      )}

      {isScreenSharing && (
        <div className="absolute inset-0 bg-slate-950/50 grid place-items-center border-t-2 border-emerald-500">
          <div className="rounded-lg bg-slate-900/95 border border-emerald-500/50 px-3 py-2 flex items-center gap-2 text-xs text-emerald-300">
            <ScreenShare className="size-3.5" />
            <span>Sharing</span>
          </div>
        </div>
      )}

      {/* Name & Status Bar */}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center gap-2">
        <span className={`${
          small ? "text-[10px]" : "text-xs"
        } font-medium text-white truncate flex-1`}>
          {name}
        </span>
        <div className="flex items-center gap-1 text-slate-300">
          {isMicOn ? (
            <Mic className="size-3" />
          ) : (
            <MicOff className="size-3 text-rose-400" />
          )}
          {isCameraOn && <Video className="size-3" />}
        </div>
      </div>

      {!small && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="absolute top-2 right-2 size-6 rounded bg-black/50 hover:bg-black/70 grid place-items-center opacity-0 group-hover:opacity-100 transition"
        >
          <Maximize2 className="size-3 text-white" />
        </button>
      )}
    </button>
  );
}
