/**
 * livekit-provider.tsx
 *
 * Manages the full LiveKit room lifecycle:
 *   idle → connecting (token fetch) → ready (token+url available, LiveKitRoom mounts) → connected → idle
 *
 * The "room guard" is the `status` field:
 *   - 'idle'       : no active call, LiveKitRoom is NOT mounted
 *   - 'connecting' : token is being fetched from the backend
 *   - 'ready'      : token received, LiveKitRoom is mounted & attempting WebSocket connect
 *   - 'connected'  : LiveKit room reports it is fully connected
 *   - 'error'      : something went wrong; `error` holds the message
 *
 * Components that use livekit hooks (useLocalParticipant, useParticipants, etc.)
 * MUST be rendered as children of this provider AND only when status === 'connected' | 'ready',
 * because those hooks require the <LiveKitRoom> context to exist.
 */

import { LiveKitRoom } from '@livekit/components-react';
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

export type LivekitStatus = 'idle' | 'connecting' | 'ready' | 'connected' | 'error';

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
  /** Human-readable error message (null when no error) */
  error: string | null;
  /** Fetch a token and mount <LiveKitRoom> for the given room slug */
  connect: (roomName: string) => Promise<void>;
  /** Disconnect and return to idle state */
  disconnect: () => Promise<void>;
  /** Clear the error and return to idle */
  clearError: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL =
  typeof window !== 'undefined'
    ? (import.meta.env.VITE_API_URL ?? 'http://localhost:3001')
    : (process.env.VITE_API_URL ?? 'http://localhost:3001');

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

  // Keep a ref so disconnect() can always reach the current room
  // even inside stale closures.
  const roomRef = useRef<Room | null>(null);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting' || status === 'ready';

  // ── connect ────────────────────────────────────────────────────────────────
  const connect = useCallback(async (roomName: string) => {
    // Guard: don't allow a second connect() while already active
    if (status === 'connecting' || status === 'ready' || status === 'connected') return;

    setStatus('connecting');
    setError(null);

    try {
      // 1. Fetch token + LiveKit WebSocket URL from the backend (auth-guarded)
      const response = await fetch(
        `${API_BASE_URL}/api/calls/token/${encodeURIComponent(roomName)}`,
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

      // 2. Build the Room instance and attach event listeners BEFORE connecting
      const newRoom = new Room(ROOM_OPTIONS);

      newRoom.on(RoomEvent.Connected, () => {
        setStatus('connected');
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        setStatus('idle');
        setRoom(null);
        setToken(null);
        setUrl(null);
        roomRef.current = null;
      });

      newRoom.on(RoomEvent.Reconnecting, () => {
        // Stay in 'connected' visually but could surface a toast here
        console.warn('[LiveKit] Reconnecting…');
      });

      newRoom.on(RoomEvent.Reconnected, () => {
        setStatus('connected');
      });

      // 3. Initiate the WebSocket connection
      //    Do this before setting state so the 'connected' event can fire naturally.
      await newRoom.connect(livekitUrl, newToken);

      // 4. Persist state so <LiveKitRoom> renders with the already-connected room.
      //    Status will have been set to 'connected' by the RoomEvent.Connected listener.
      roomRef.current = newRoom;
      setRoom(newRoom);
      setToken(newToken);
      setUrl(livekitUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error connecting to LiveKit.';
      setError(message);
      setStatus('error');
      console.error('[LiveKit] connect() error:', err);
    }
  }, [status]);

  // ── disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    const activeRoom = roomRef.current;
    if (activeRoom) {
      await activeRoom.disconnect(true);
      // RoomEvent.Disconnected listener above will reset all state
    } else {
      // If we're stuck in connecting/error, just reset
      setStatus('idle');
      setRoom(null);
      setToken(null);
      setUrl(null);
      setError(null);
      roomRef.current = null;
    }
  }, []);

  // ── clearError ─────────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    setError(null);
    setStatus('idle');
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
      error,
      connect,
      disconnect,
      clearError,
    }),
    [room, token, url, status, isConnected, isConnecting, error, connect, disconnect, clearError],
  );

  return (
    <LivekitContext.Provider value={value}>
      {/*
       * Room Guard: <LiveKitRoom> is ONLY mounted when we have a valid token
       * and room instance (status is 'ready' or 'connected').
       *
       * This prevents livekit hooks (useLocalParticipant, useParticipants, etc.)
       * from crashing when there's no active call.
       *
       * We pass `connect={false}` because we manage the Room.connect() lifecycle
       * ourselves via the Room instance; LiveKitRoom just needs the context.
       */}
      {room && token && url ? (
        <LiveKitRoom room={room} token={token} serverUrl={url} connect={false}>
          {children}
        </LiveKitRoom>
      ) : (
        children
      )}
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
