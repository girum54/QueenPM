import { Participant, Track } from "livekit-client";
import {
  VideoTrack,
  AudioTrack,
  TrackReferenceOrPlaceholder,
  isTrackReference,
  useIsSpeaking,
} from "@livekit/components-react";
import { Mic, MicOff, Video, VideoOff, ScreenShare, Maximize2 } from "lucide-react";

export interface ParticipantTileProps {
  participant: Participant;
  /** Pre-filtered TrackReferences for this participant (camera, mic, screenshare). */
  tracks: TrackReferenceOrPlaceholder[];
  large?: boolean;
  small?: boolean;
  onClick?: () => void;
}

export function ParticipantTile({ participant, tracks, large, small, onClick }: ParticipantTileProps) {
  const isSpeaking = useIsSpeaking(participant);

  // Resolve each source — only count a track as "on" if it's a real (non-placeholder) unmuted ref
  const cameraTrack = tracks.find(
    (t) => t.source === Track.Source.Camera && isTrackReference(t) && !t.publication.isMuted,
  );
  const screenShareTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare && isTrackReference(t) && !t.publication.isMuted,
  );
  const micTrack = tracks.find(
    (t) => t.source === Track.Source.Microphone && isTrackReference(t),
  );

  const isCameraOn = !!cameraTrack;
  const isMicOn = micTrack && isTrackReference(micTrack) ? !micTrack.publication.isMuted : false;
  const isScreenSharing = !!screenShareTrack;
  const isLocal = participant.isLocal;

  const name = participant.name || participant.identity || "Unknown";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Screen share takes visual priority over camera
  const videoTrack = screenShareTrack ?? cameraTrack;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={[
        "relative rounded-xl overflow-hidden border bg-slate-900 group w-full transition-all cursor-pointer",
        small ? "h-[120px]" : large ? "h-full min-h-[300px]" : "h-full min-h-[100px]",
        isSpeaking
          ? "border-fuchsia-500/70 shadow-[0_0_14px_rgba(217,70,239,0.25)]"
          : "border-slate-800 hover:border-slate-700",
      ].join(" ")}
    >
      {/* ── Video layer ─────────────────────────────────────────────────── */}
      {videoTrack && isTrackReference(videoTrack) ? (
        <div className="absolute inset-0">
          <VideoTrack trackRef={videoTrack} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 grid place-items-center">
          <div
            className={[
              "rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center font-bold text-white shadow-lg transition-all",
              small ? "size-10 text-sm" : large ? "size-20 text-2xl" : "size-16 text-lg",
              isSpeaking ? "ring-2 ring-fuchsia-400 ring-offset-2 ring-offset-slate-900 scale-105" : "",
            ].join(" ")}
          >
            {initials}
          </div>
        </div>
      )}

      {/* ── Audio track — remote participants only (suppress local echo) ─ */}
      {!isLocal && micTrack && isTrackReference(micTrack) && (
        <AudioTrack trackRef={micTrack} />
      )}

      {/* ── Screen-share badge ────────────────────────────────────────── */}
      {isScreenSharing && (
        <div className="absolute top-2 left-2 rounded-full bg-emerald-500/90 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white flex items-center gap-1 border border-emerald-400/30">
          <ScreenShare className="size-3" />
          {videoTrack === screenShareTrack ? "Sharing screen" : "Screen"}
        </div>
      )}

      {/* ── Name + status bar ────────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-center gap-2">
        <span
          className={[
            "font-medium text-white truncate flex-1 text-left",
            small ? "text-[10px]" : "text-xs",
          ].join(" ")}
        >
          {name}
          {isLocal && <span className="text-slate-400 ml-1">(You)</span>}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isMicOn ? (
            <Mic className={`size-3 transition ${isSpeaking ? "text-fuchsia-400" : "text-slate-300"}`} />
          ) : (
            <MicOff className="size-3 text-rose-400" />
          )}
          {isCameraOn ? (
            <Video className="size-3 text-slate-300" />
          ) : (
            <VideoOff className="size-3 text-slate-500" />
          )}
        </div>
      </div>

      {/* ── Expand / focus button ────────────────────────────────────── */}
      {!small && (
        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className="absolute top-2 right-2 size-6 rounded bg-black/50 hover:bg-black/70 grid place-items-center opacity-0 group-hover:opacity-100 transition"
        >
          <Maximize2 className="size-3 text-white" />
        </button>
      )}
    </div>
  );
}
