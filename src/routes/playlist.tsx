import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PlaylistView } from "@/components/PlaylistView";

export const Route = createFileRoute("/playlist")({
  head: () => ({
    meta: [
      { title: "Playlist Manager — Queen PM" },
      { name: "description", content: "Search, save, and manage your channel playlists for QueenDJ." },
    ],
  }),
  component: PlaylistPage,
});

function PlaylistPage() {
  return (
    <AppShell>
      <PlaylistView />
    </AppShell>
  );
}
