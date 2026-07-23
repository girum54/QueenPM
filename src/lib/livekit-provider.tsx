/**
 * livekit-provider.tsx
 *
 * Manages the full LiveKit room lifecycle:
 *   idle → connecting (token fetch) → connected → idle
 *
 * KEY DESIGN DECISION:
 *   We use `RoomContext.Provider` directly instead of `<LiveKitRoom>`.
 *   `<LiveKitRoom>` calls room.disconnect() whenever its `room` prop changes
 *   or when it unmounts — which causes the immediate-disconnect bug.
 *   `RoomContext.Provider` is a plain React context and has zero side-effects.
 *
 * All @livekit/components-react hooks (useLocalParticipant, useParticipants,
 * useTracks, etc.) read from RoomContext, so they work perfectly fine.
 */

import { RoomContext } from '@livekit/components-react';
import { Room, RoomEvent, RoomOptions } from 'livekit-client';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LivekitStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface LivekitContextType {
  /** The livekit-client Room instance (null when idle/connecting) */
  room: Room | null;
  /** JWT token for the current room session */
  token: string | null;
  /** WebSocket URL returned by the backend */
  url: string | null;
  /** Coarse status for guards and loading UI */
  status: LivekitStatus;
  /** True only when the WebSocket handshake is complete */
  isConnected: boolean;
  /** True while fetching the token OR while the room is connecting */
  isConnecting: boolean;
  /** True when LiveKit is intentionally running in offline fallback mode */
  offlineMode: boolean;
  /** Human-readable error message (null when no error) */
  error: string | null;
  /** Fetch a token and connect to LiveKit for the given room slug */
  connect: (roomName: string) => Promise<void>;
  /** Disconnect and return to idle state */
  disconnect: () => Promise<void>;
  /** Clear the error and return to idle */
  clearError: () => void;
  /** Force offline mode for UI testing without a server */
  enableOfflineMode: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RAW_API_URL = typeof window !== 'undefined'
  ? (import.meta.env.VITE_API_URL ?? 'http://localhost:3001')
  : (process.env.VITE_API_URL ?? 'http://localhost:3001');

const API_BASE_URL = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL.replace(/\/$/, '')}/api`;

const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const LivekitContext = createContext<LivekitContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LivekitProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<LivekitStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  // Keep a ref so disconnect() can always reach the current room
  // even inside stale closures.
  const roomRef = useRef<Room | null>(null);
  
  // Track if we're currently in a connection attempt to prevent duplicates
  const isConnectingRef = useRef(false);

  const isConnected = status === 'connected' && !offlineMode;
  const isConnecting = status === 'connecting';

  // ── connect ────────────────────────────────────────────────────────────────
  const connect = useCallback(async (roomName: string) => {
    // Guard: don't allow a second connect() while already active or already connecting
    if (status === 'connecting' || status === 'connected' || isConnectingRef.current) {
      console.log('[LiveKit] Connection already in progress, skipping duplicate request');
      return;
    }

    isConnectingRef.current = true;
    setStatus('connecting');
    setError(null);
    setOfflineMode(false);

    try {
      // 1. Fetch token + LiveKit WebSocket URL from the backend (auth-guarded)
      const response = await fetch(
        `${API_BASE_URL}/calls/token/${encodeURIComponent(roomName)}`,
        { credentials: 'include' },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Token fetch failed (${response.status}): ${body}`);
      }

      const data = await response.json();
      const newToken: string = data.token;
      const livekitUrl: string = data.url;

      if (!newToken || !livekitUrl) {
        throw new Error('Backend returned an invalid token response (missing token or url).');
      }

      // 2. Build the Room instance and attach event listeners BEFORE connecting.
      //    We create the Room ourselves so WE control its full lifecycle.
      const newRoom = new Room(ROOM_OPTIONS);

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('[LiveKit] Room disconnected — resetting state');
        setStatus('idle');
        setRoom(null);
        setToken(null);
        setUrl(null);
        roomRef.current = null;
        isConnectingRef.current = false;
      });

      newRoom.on(RoomEvent.Reconnecting, () => {
        console.warn('[LiveKit] Reconnecting…');
      });

      newRoom.on(RoomEvent.Reconnected, () => {
        console.log('[LiveKit] Reconnected');
        setStatus('connected');
      });

      // 3. Initiate the WebSocket connection.
      //    await resolves only after the room is fully connected.
      await newRoom.connect(livekitUrl, newToken);
      console.log('[LiveKit] Room connected successfully');

      // 4. Commit all state in one batch so React renders once.
      roomRef.current = newRoom;
      setRoom(newRoom);
      setToken(newToken);
      setUrl(livekitUrl);
      setStatus('connected');
      isConnectingRef.current = false;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error connecting to LiveKit.';
      setError(message);
      setStatus('error');
      isConnectingRef.current = false;
      console.error('[LiveKit] connect() error:', err);
    }
  }, [status]);

  // ── disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    const activeRoom = roomRef.current;
    if (activeRoom) {
      // This triggers RoomEvent.Disconnected, which resets all state above.
      await activeRoom.disconnect(true);
    } else {
      // Stuck in connecting/error — just reset manually.
      setStatus('idle');
      setRoom(null);
      setToken(null);
      setUrl(null);
      setError(null);
      setOfflineMode(false);
      roomRef.current = null;
    }
  }, []);

  // ── clearError ─────────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    setError(null);
    setStatus('idle');
  }, []);

  // ── enableOfflineMode ──────────────────────────────────────────────────────
  const enableOfflineMode = useCallback(() => {
    const fakeRoom = new Room(ROOM_OPTIONS);
    roomRef.current = fakeRoom;
    setRoom(fakeRoom);
    setToken('offline-mode');
    setUrl('ws://offline');
    setStatus('connected');
    setOfflineMode(true);
    setError(null);
  }, []);

  // ─── Context value (memoized to prevent unnecessary re-renders) ─────────────
  const value = useMemo<LivekitContextType>(
    () => ({
      room,
      token,
      url,
      status,
      isConnected,
      isConnecting,
      offlineMode,
      error,
      connect,
      disconnect,
      clearError,
      enableOfflineMode,
    }),
    [room, token, url, status, isConnected, isConnecting, error, offlineMode, connect, disconnect, clearError, enableOfflineMode],
  );

  return (
    <LivekitContext.Provider value={value}>
      {/*
       * RoomContext.Provider — NOT <LiveKitRoom>.
       *
       * <LiveKitRoom> calls room.disconnect() whenever the `room` prop changes
       * or when the component unmounts, causing the immediate-disconnect bug.
       *
       * RoomContext.Provider is a plain React context with zero side-effects.
       * All @livekit/components-react hooks (useLocalParticipant, useParticipants,
       * useTracks, etc.) read from this context, so they work perfectly fine.
       */}
      <RoomContext.Provider value={room ?? undefined}>
        {children}
      </RoomContext.Provider>
    </LivekitContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLivekit(): LivekitContextType {
  const context = useContext(LivekitContext);
  if (!context) {
    throw new Error('useLivekit() must be called inside <LivekitProvider>.');
  }
  return context;
}
