/**
 * QueenDJ Command Handler
 * 
 * Listens for QueenDJ chat commands and executes them via the backend API
 */

import { useEffect } from 'react';
import type { ParsedQueenDjCommand } from './chat-commands';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export function useQueenDjCommandHandler() {
  useEffect(() => {
    const handleQueenDjCommand = async (event: CustomEvent) => {
      const { channelId, command, requestedBy } = event.detail;
      
      try {
        let endpoint = '';
        let body: any = { channelId };

        switch (command.type) {
          case 'play':
            endpoint = '/queendj/play';
            body.query = command.query;
            break;
          case 'play_playlist':
            endpoint = '/queendj/play-playlist';
            body.playlistName = command.playlistName;
            break;
          case 'skip':
            endpoint = '/queendj/skip';
            break;
          case 'pause':
            endpoint = '/queendj/pause';
            break;
          case 'resume':
            endpoint = '/queendj/resume';
            break;
          case 'clear':
            endpoint = '/queendj/clear';
            break;
          default:
            console.warn('Unknown QueenDJ command type:', command);
            return;
        }

        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        
        if (!data.success) {
          console.error('QueenDJ command failed:', data.message);
        }
      } catch (error) {
        console.error('Failed to execute QueenDJ command:', error);
      }
    };

    // Listen for the custom event dispatched from chat
    window.addEventListener('queen:dj-command', handleQueenDjCommand as EventListener);

    return () => {
      window.removeEventListener('queen:dj-command', handleQueenDjCommand as EventListener);
    };
  }, []);
}
