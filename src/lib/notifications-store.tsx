import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-store";
import { ApiNotification, notificationsApi } from "./api/queen.api";
import { toast } from "sonner";

interface NotificationsContextType {
  notifications: ApiNotification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Load initial notifications
    notificationsApi.getAll().then((data) => setNotifications(data)).catch(console.error);

    const API_BASE_URL =
      typeof window !== "undefined"
        ? (import.meta.env.VITE_API_URL || "http://localhost:3001")
        : "http://localhost:3001";

    const eventSource = new EventSource(`${API_BASE_URL}/notifications/stream`, {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data) as ApiNotification;
        setNotifications((prev) => {
          // ── Broadcast task-sync events (not stored in DB, sent to all) ──────
          if ((newNotif as any).recipientId === 'all') {
            try {
              const detail = JSON.parse(newNotif.body || '{}');
              window.dispatchEvent(new CustomEvent('queen:task-sync', { detail }));
            } catch {/* ignore parse errors */}
            return prev; // do NOT add to notification bell
          }

          if (prev.some((n) => n.id === newNotif.id)) return prev;

          // Parse body — call invites carry JSON with channelId (old) or projectId (conferencing)
          let callMeta: {
            channelId?: string;
            channelName?: string;
            text?: string;
            callId?: string;
            projectId?: string;
          } | null = null;
          try { callMeta = newNotif.body ? JSON.parse(newNotif.body) : null; } catch { /* plain string body */ }

          if (callMeta?.projectId) {
            // Rich project call-invite toast
            toast(newNotif.title, {
              description: callMeta.text ?? "You're invited to a voice call",
              duration: 30_000,
              action: {
                label: "📞 Join Call",
                onClick: () => {
                  // Set active project in localStorage and trigger store update
                  localStorage.setItem("active_project_id", callMeta!.projectId!);
                  window.dispatchEvent(
                    new CustomEvent("queen:set-active-project", {
                      detail: { projectId: callMeta!.projectId },
                    })
                  );
                  // Navigate to /conferencing
                  window.history.pushState({}, "", "/conferencing");
                  window.dispatchEvent(new PopStateEvent("popstate"));
                },
              },
            });
          } else if (callMeta?.channelId) {
            // Rich channel call-invite toast – stays for 30 seconds, has an action button
            toast(newNotif.title, {
              description: callMeta.text ?? `Join the voice call in #${callMeta.channelName}`,
              duration: 30_000,
              action: {
                label: "📞 Join Call",
                onClick: () => {
                  // Store so channels page picks it up on next render
                  sessionStorage.setItem("pending_call_channel_id", callMeta!.channelId!);
                  // Dispatch event so channels page can react immediately if already open
                  window.dispatchEvent(
                    new CustomEvent("queen:call-invite", {
                      detail: { channelId: callMeta!.channelId, channelName: callMeta!.channelName },
                    })
                  );
                  // Navigate
                  window.history.pushState({}, "", "/channels?mode=voice");
                  window.dispatchEvent(new PopStateEvent("popstate"));
                },
              },
            });
          } else {
            toast(newNotif.title, { description: newNotif.body ?? undefined, duration: 5000 });
          }

          return [newNotif, ...prev];
        });
      } catch (err) {
        console.error("Failed to parse notification SSE", err);
      }

    };

    eventSource.onerror = (err) => {
      console.error("SSE error", err);
    };

    return () => {
      eventSource.close();
    };
  }, [user]);

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await notificationsApi.markRead(id);
    } catch (e) {
      console.error(e);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllRead();
    } catch (e) {
      console.error(e);
      setNotifications((prev) =>
        prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: false } : n))
      );
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationsApi.delete(id);
    } catch (e) {
      console.error(e);
      notificationsApi.getAll().then((data) => setNotifications(data)).catch(console.error);
    }
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, deleteNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
