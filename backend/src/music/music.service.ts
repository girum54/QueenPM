import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RADIO_STATIONS } from './radio.data';
import { DRIZZLE } from '../database/database.provider';
import { db as DbType } from '../db/db';
import * as schema from '../db/schema';
import { eq, asc } from 'drizzle-orm';

@Injectable()
export class MusicService {
  constructor(
    private configService: ConfigService,
    @Inject(DRIZZLE) private db: typeof DbType,
  ) {}

  // ─── YouTube Search ────────────────────────────────────────────────────────

  async search(query: string) {
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) {
      throw new HttpException(
        'YouTube API Key is missing. Please configure YOUTUBE_API_KEY in the backend .env file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`YouTube API responded with status ${response.status}`);
      }
      const data = await response.json();

      return data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        author: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails?.medium?.url ||
          item.snippet.thumbnails?.default?.url,
      }));
    } catch (error) {
      console.error('Failed to fetch from YouTube API:', error);
      throw new HttpException(
        'Failed to fetch search results from YouTube',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Track Info (oEmbed proxy) ─────────────────────────────────────────────

  async getTrackInfo(videoId: string) {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`oEmbed responded with status ${response.status}`);
      }
      const data = await response.json();
      return {
        videoId,
        title: data.title ?? 'Unknown Title',
        author: data.author_name ?? 'Unknown Artist',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      };
    } catch (error) {
      console.error('Failed to fetch YouTube oEmbed info:', error);
      throw new HttpException(
        'Failed to fetch track info from YouTube',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // ─── Radio ────────────────────────────────────────────────────────────────

  getRadio(genre: string) {
    const station = RADIO_STATIONS[genre];
    if (!station) {
      throw new HttpException(
        `Radio station '${genre}' not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return [...station].sort(() => Math.random() - 0.5);
  }

  // ─── Playlist CRUD ────────────────────────────────────────────────────────

  async getPlaylist(channelId: string) {
    return this.db
      .select()
      .from(schema.playlistTracks)
      .where(eq(schema.playlistTracks.channelId, channelId))
      .orderBy(asc(schema.playlistTracks.position), asc(schema.playlistTracks.createdAt));
  }

  async addTrack(dto: {
    channelId: string;
    videoId: string;
    title: string;
    author: string;
    thumbnail: string;
    addedBy: string;
  }) {
    // Calculate next position
    const existing = await this.db
      .select()
      .from(schema.playlistTracks)
      .where(eq(schema.playlistTracks.channelId, dto.channelId));

    const position = existing.length;

    const [inserted] = await this.db
      .insert(schema.playlistTracks)
      .values({ ...dto, position })
      .returning();

    return inserted;
  }

  async removeTrack(id: string) {
    const [deleted] = await this.db
      .delete(schema.playlistTracks)
      .where(eq(schema.playlistTracks.id, id))
      .returning();

    if (!deleted) {
      throw new HttpException('Track not found', HttpStatus.NOT_FOUND);
    }
    return { deleted: id };
  }

  async clearPlaylist(channelId: string) {
    await this.db
      .delete(schema.playlistTracks)
      .where(eq(schema.playlistTracks.channelId, channelId));
    return { cleared: channelId };
  }
}
