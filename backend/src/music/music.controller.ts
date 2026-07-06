import {
  Controller, Get, Post, Delete,
  Query, Param, Body,
  BadRequestException,
} from '@nestjs/common';
import { MusicService } from './music.service';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  // ─── YouTube Search ──────────────────────────────────────────────────────

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query) throw new BadRequestException('Query parameter "q" is required');
    return this.musicService.search(query);
  }

  @Get('track-info')
  async getTrackInfo(@Query('videoId') videoId: string) {
    if (!videoId) throw new BadRequestException('Query parameter "videoId" is required');
    return this.musicService.getTrackInfo(videoId);
  }

  // ─── Radio ───────────────────────────────────────────────────────────────

  @Get('radio')
  getRadio(@Query('genre') genre: string) {
    if (!genre) throw new BadRequestException('Query parameter "genre" is required');
    return this.musicService.getRadio(genre);
  }

  // ─── Playlist ────────────────────────────────────────────────────────────

  @Get('playlist')
  getPlaylist(@Query('channelId') channelId: string) {
    if (!channelId) throw new BadRequestException('Query parameter "channelId" is required');
    return this.musicService.getPlaylist(channelId);
  }

  @Post('playlist')
  addTrack(
    @Body() body: {
      channelId: string;
      videoId: string;
      title: string;
      author: string;
      thumbnail: string;
      addedBy: string;
    },
  ) {
    const { channelId, videoId, title, author, thumbnail, addedBy } = body;
    if (!channelId || !videoId || !title) {
      throw new BadRequestException('channelId, videoId, and title are required');
    }
    return this.musicService.addTrack({ channelId, videoId, title, author: author ?? '', thumbnail: thumbnail ?? '', addedBy: addedBy ?? 'Unknown' });
  }

  @Delete('playlist/:id')
  removeTrack(@Param('id') id: string) {
    return this.musicService.removeTrack(id);
  }

  @Delete('playlist')
  clearPlaylist(@Query('channelId') channelId: string) {
    if (!channelId) throw new BadRequestException('Query parameter "channelId" is required');
    return this.musicService.clearPlaylist(channelId);
  }
}
