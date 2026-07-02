import {
  LiveKitRoom,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from '@livekit/components-react';
import { Room, RoomOptions } from 'livekit-client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface LivekitContextType {
  room: Room | null;
  token: string | null;
  url: string | null;
  isConnected: boolean;
  error: string | null;
  connect: (roomName: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const LivekitContext = createContext<LivekitContextType | null>(null);

export function LivekitProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async (roomName: string) => {
    try {
      setError(null);
      
      // Get token from backend
      const response = await fetch(`/api/calls/token/${roomName}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      const newToken = data.token;
      const livekitUrl = data.url;
      
      if (!newToken || !livekitUrl) {
        throw new Error('Invalid response: missing token or url');
      }
      
      setToken(newToken);
      setUrl(livekitUrl);

      // Create room connection
      const roomOptions: RoomOptions = {
        audio: true,
        video: { resolution: { width: 640, height: 480 } },
        screenShare: { resolution: { width: 1280, height: 720 } },
      };

      const newRoom = new Room(roomOptions);
      
      newRoom.on('connected', () => setIsConnected(true));
      newRoom.on('disconnected', () => {
        setIsConnected(false);
        setRoom(null);
        setToken(null);
      });
      
      newRoom.on('error', (error) => {
        setError(error.message);
        console.error('LiveKit error:', error);
      });

      await newRoom.connect(livekitUrl, newToken);
      setRoom(newRoom);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error connecting to Livekit';
      setError(message);
      console.error('Connection error:', err);
    }
  };

  const disconnect = async () => {
    if (room) {
      await room.disconnect();
      setRoom(null);
      setToken(null);
      setIsConnected(false);
    }
  };

  return (
    <LivekitContext.Provider
      value={{
        room,
        token,
        url,
        isConnected,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </LivekitContext.Provider>
  );
}

export function useLivekit() {
  const context = useContext(LivekitContext);
  if (!context) {
    throw new Error('useLivekit must be used within LivekitProvider');
  }
  return context;
}
