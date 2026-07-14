import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/queen-store";
import { CallLobby } from "@/components/conferencing/CallLobby";
import { ConferencingView } from "@/components/conferencing/ConferencingView";
import { useLivekit } from "@/lib/livekit-provider";
import { callsApi } from "@/lib/api/queen.api";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/conferencing")({
  component: ConferencingPage,
});

function ConferencingPage() {
  const { activeProjectId, activeCall, setActiveCall, projectTabs } = useStore();
  const { status, connect, disconnect } = useLivekit();
  const [showLobby, setShowLobby] = useState(true);
  const [isRejoining, setIsRejoining] = useState(false);

  const activeProject = projectTabs.find((p: { id: string }) => p.id === activeProjectId);

  // Check if user should be in rejoin mode (has active call but not connected)
  useEffect(() => {
    if (activeCall && status === "idle") {
      setIsRejoining(true);
    }
  }, [activeCall, status]);

  const handleJoin = async () => {
    if (!activeProjectId) return;
    
    try {
      // Create call if none exists
      let call = activeCall;
      if (!call) {
        call = await callsApi.create({ projectId: activeProjectId, callType: "open" });
        setActiveCall(call);
      }
      
      // Join the call and get token
      const response = await callsApi.join(call.id);
      
      // Connect to LiveKit
      await connect(response.call.roomName);
      
      setShowLobby(false);
      setIsRejoining(false);
    } catch (err) {
      console.error("Failed to join call:", err);
    }
  };

  const handleLeave = async () => {
    if (activeCall) {
      await callsApi.leave(activeCall.id);
    }
    await disconnect();
    setActiveCall(null);
    setShowLobby(true);
    setIsRejoining(false);
  };

  const handleCancel = () => {
    // Navigate back to previous page or dashboard
    window.history.back();
  };

  // Show lobby when not connected or when explicitly requested
  if (showLobby || status !== "connected") {
    return (
      <CallLobby
        projectName={activeProject?.name || "Project"}
        callType={activeCall?.callType || "open"}
        onJoin={handleJoin}
        onCancel={handleCancel}
        isRejoining={isRejoining}
      />
    );
  }

  // Show conferencing view when connected
  return (
    <ConferencingView
      projectId={activeProjectId || ""}
      projectName={activeProject?.name || "Project"}
      onLeave={handleLeave}
    />
  );
}
