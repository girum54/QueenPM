import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { QueenDjView } from "@/components/QueenDjView";

export const Route = createFileRoute("/queendj")({
  head: () => ({
    meta: [
      { title: "QueenDJ — Queen PM" },
      { name: "description", content: "Control QueenDJ bot in voice calls. Play music, manage queue, and send commands." },
    ],
  }),
  component: QueenDjPage,
});

function QueenDjPage() {
  return (
    <AppShell>
      <QueenDjView />
    </AppShell>
  );
}
