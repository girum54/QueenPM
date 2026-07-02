import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-store";
import { ApiNotification, notificationsApi } from "./api/queen.api";
import { toast } from "sonner"; // Assuming sonner is installed, if not we can add a fallback or let it fail gently. Looking at typical Lovable apps, sonner is often used. Wait, I should check if it is or just use standard DOM for now. Let's stick to standard state.

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

    // Connect to SSE stream
    const API_BASE_URL = typeof window !== "undefined"
      ? (import.meta.env.VITE_API_URL || "http://localhost:3001")
      : "http://localhost:3001";
      
    // Using EventSource with credentials
    const eventSource = new EventSource(`${API_BASE_URL}/notifications/stream`, {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data) as ApiNotification;
        setNotifications((prev) => {
          // Check if it already exists (prevent duplicates)
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          
          // Optionally show a toast here if you have a toast library like sonner/react-hot-toast
          // toast(newNotif.title, { description: newNotif.body });
          
          return [newNotif, ...prev];
        });
      } catch (err) {
        console.error("Failed to parse notification SSE", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error", err);
      // EventSource automatically attempts to reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [user]);

  const markRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await notificationsApi.markRead(id);
    } catch (e) {
      console.error(e);
      // Revert on failure
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
      // Reload on failure since we lost the object to revert
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
