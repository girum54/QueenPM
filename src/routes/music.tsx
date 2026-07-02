import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MusicView } from "@/components/MusicView";

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "Music Lounge — Queen PM" },
      { name: "description", content: "Team radio with synchronized listening party." },
    ],
  }),
  component: MusicPage,
});

function MusicPage() {
  return (
    <AppShell>
      <MusicView />
    </AppShell>
  );
}
