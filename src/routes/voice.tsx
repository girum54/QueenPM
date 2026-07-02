import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { VoiceView } from "@/components/VoiceView";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice Call — Queen PM" },
      { name: "description", content: "Live voice and video calls with team members." },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  return (
    <AppShell>
      <VoiceView channelName="Voice Lounge" />
    </AppShell>
  );
}
