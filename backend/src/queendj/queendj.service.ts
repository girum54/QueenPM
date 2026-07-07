import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoomServiceClient } from 'livekit-server-sdk';
import { MusicService } from '../music/music.service';
import { MessagesService } from '../messages/messages.service';
import { DRIZZLE } from '../database/database.provider';
import { db as DbType } from '../db/db';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

export interface QueenDjState {
  currentRoom: string | null;
  currentTrack: {
    videoId: string;
    title: string;
    author: string;
    thumbnail: string;
  } | null;
  isPlaying: boolean;
  queue: Array<{
    videoId: string;
    title: string;
    author: string;
    thumbnail: string;
  }>;
}

@Injectable()
export class QueenDjService {
  private readonly logger = new Logger(QueenDjService.name);
  private readonly livekitUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private state: QueenDjState = {
    currentRoom: null,
    currentTrack: null,
    isPlaying: false,
    queue: [],
  };

  constructor(
    private config: ConfigService,
    private musicService: MusicService,
    private messagesService: MessagesService,
    @Inject(DRIZZLE) private db: typeof DbType,
  ) {
    this.livekitUrl = this.config.get<string>('LIVEKIT_URL', 'ws://localhost:7880');
    this.apiKey = this.config.get<string>('LIVEKIT_API_KEY', 'devkey');
    this.apiSecret = this.config.get<string>('LIVEKIT_API_SECRET', 'secret');
  }

  private getRoomService(): RoomServiceClient {
    const httpUrl = this.livekitUrl
      .replace('ws://', 'http://')
      .replace('wss://', 'https://');
    return new RoomServiceClient(httpUrl, this.apiKey, this.apiSecret);
  }

  /** Get QueenDJ's current state */
  getState(): QueenDjState {
    return { ...this.state };
  }

  /** Join QueenDJ to a voice call room */
  async joinRoom(roomName: string): Promise<{ success: boolean; message: string }> {
    try {
      const roomService = this.getRoomService();
      
      // Check if room exists
      const rooms = await roomService.listRooms();
      const room = rooms.find(r => r.name === roomName);
      
      if (!room) {
        return { success: false, message: `Room ${roomName} not found` };
      }

      // Check if QueenDJ is already in the room
      const participants = await roomService.listParticipants(roomName);
      const queenDjInRoom = participants.find(p => p.identity === 'queendj');
      
      if (queenDjInRoom) {
        this.state.currentRoom = roomName;
        return { success: true, message: 'QueenDJ is already in the room' };
      }

      // For now, we'll simulate joining by updating state
      // In a full implementation, you'd need to create a bot participant using LiveKit's client SDK
      this.state.currentRoom = roomName;
      this.logger.log(`QueenDJ joined room: ${roomName}`);
      
      return { success: true, message: `QueenDJ joined ${roomName}` };
    } catch (error) {
      this.logger.error(`Failed to join room ${roomName}:`, error);
      return { success: false, message: 'Failed to join room' };
    }
  }

  /** Leave the current room */
  async leaveRoom(): Promise<{ success: boolean; message: string }> {
    if (!this.state.currentRoom) {
      return { success: false, message: 'QueenDJ is not in a room' };
    }

    try {
      // Stop playback
      this.state.isPlaying = false;
      this.state.currentTrack = null;
      
      const roomName = this.state.currentRoom;
      this.state.currentRoom = null;
      
      this.logger.log(`QueenDJ left room: ${roomName}`);
      return { success: true, message: `QueenDJ left ${roomName}` };
    } catch (error) {
      this.logger.error('Failed to leave room:', error);
      return { success: false, message: 'Failed to leave room' };
    }
  }

  /** Play a specific track by search query or video ID */
  async playTrack(query: string, channelId: string): Promise<{ success: boolean; message: string; track?: any }> {
    if (!this.state.currentRoom) {
      return { success: false, message: 'QueenDJ is not in a voice call. Add QueenDJ to a call first!' };
    }

    try {
      // First, check if it's a YouTube video ID
      const videoIdMatch = query.match(/^[a-zA-Z0-9_-]{11}$/);
      let track;

      if (videoIdMatch) {
        // It's a video ID, get track info
        track = await this.musicService.getTrackInfo(query);
      } else {
        // It's a search query, search YouTube
        const results = await this.musicService.search(query);
        if (results.length === 0) {
          return { success: false, message: `No results found for "${query}"` };
        }
        track = results[0];
      }

      // Update state
      this.state.currentTrack = track;
      this.state.isPlaying = true;
      this.state.queue = [track]; // Replace queue with this track

      this.logger.log(`Playing track: ${track.title}`);
      
      // Send a message to the channel announcing the track
      await this.messagesService.create({
        authorId: 'queendj',
        channelId,
        text: `🎵 Now playing: ${track.title} by ${track.author}`,
      });

      return { success: true, message: `Now playing: ${track.title}`, track };
    } catch (error) {
      this.logger.error('Failed to play track:', error);
      return { success: false, message: 'Failed to play track' };
    }
  }

  /** Play a playlist from the library */
  async playPlaylist(playlistName: string, channelId: string): Promise<{ success: boolean; message: string; tracks?: any[] }> {
    if (!this.state.currentRoom) {
      return { success: false, message: 'QueenDJ is not in a voice call. Add QueenDJ to a call first!' };
    }

    try {
      // Get playlist tracks for the channel
      const tracks = await this.musicService.getPlaylist(channelId);
      
      if (tracks.length === 0) {
        return { success: false, message: 'No tracks found in the playlist' };
      }

      // If a specific playlist name is provided, we could filter by playlist name
      // For now, we'll use the channel's playlist
      const formattedTracks = tracks.map(t => ({
        videoId: t.videoId,
        title: t.title,
        author: t.author,
        thumbnail: t.thumbnail,
      }));

      // Update state
      this.state.queue = formattedTracks;
      this.state.currentTrack = formattedTracks[0];
      this.state.isPlaying = true;

      this.logger.log(`Playing playlist with ${tracks.length} tracks`);
      
      // Send a message to the channel
      await this.messagesService.create({
        authorId: 'queendj',
        channelId,
        text: `🎵 Playing playlist with ${tracks.length} tracks. Starting with: ${formattedTracks[0].title}`,
      });

      return { success: true, message: `Playing playlist with ${tracks.length} tracks`, tracks: formattedTracks };
    } catch (error) {
      this.logger.error('Failed to play playlist:', error);
      return { success: false, message: 'Failed to play playlist' };
    }
  }

  /** Skip to the next track in the queue */
  async skipTrack(): Promise<{ success: boolean; message: string }> {
    if (!this.state.currentRoom || this.state.queue.length === 0) {
      return { success: false, message: 'No tracks in queue' };
    }

    try {
      const currentIndex = this.state.queue.findIndex(
        t => t.videoId === this.state.currentTrack?.videoId
      );
      
      if (currentIndex === -1 || currentIndex === this.state.queue.length - 1) {
        // No more tracks
        this.state.isPlaying = false;
        this.state.currentTrack = null;
        return { success: true, message: 'End of queue' };
      }

      const nextTrack = this.state.queue[currentIndex + 1];
      this.state.currentTrack = nextTrack;
      
      this.logger.log(`Skipped to: ${nextTrack.title}`);
      return { success: true, message: `Now playing: ${nextTrack.title}` };
    } catch (error) {
      this.logger.error('Failed to skip track:', error);
      return { success: false, message: 'Failed to skip track' };
    }
  }

  /** Pause playback */
  async pause(): Promise<{ success: boolean; message: string }> {
    if (!this.state.currentRoom) {
      return { success: false, message: 'QueenDJ is not in a room' };
    }

    this.state.isPlaying = false;
    return { success: true, message: 'Paused' };
  }

  /** Resume playback */
  async resume(): Promise<{ success: boolean; message: string }> {
    if (!this.state.currentRoom || !this.state.currentTrack) {
      return { success: false, message: 'No track to resume' };
    }

    this.state.isPlaying = true;
    return { success: true, message: `Resuming: ${this.state.currentTrack.title}` };
  }

  /** Clear the queue */
  async clearQueue(): Promise<{ success: boolean; message: string }> {
    this.state.queue = [];
    this.state.currentTrack = null;
    this.state.isPlaying = false;
    return { success: true, message: 'Queue cleared' };
  }
}
