import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { QueenDjService, QueenDjState } from './queendj.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('queendj')
@UseGuards(AuthGuard)
export class QueenDjController {
  constructor(private readonly queenDjService: QueenDjService) {
    // Constructor body
  }

  @Get('state')
  getState() {
    return this.queenDjService.getState();
  }

  @Post('join')
  async joinRoom(@Body() body: { roomName: string }) {
    return this.queenDjService.joinRoom(body.roomName);
  }

  @Post('leave')
  async leaveRoom() {
    return this.queenDjService.leaveRoom();
  }

  @Post('play')
  async playTrack(
    @Body() body: { query: string; channelId: string },
    @CurrentUser() user: any,
  ) {
    return this.queenDjService.playTrack(body.query, body.channelId);
  }

  @Post('play-playlist')
  async playPlaylist(
    @Body() body: { playlistName?: string; channelId: string },
    @CurrentUser() user: any,
  ) {
    return this.queenDjService.playPlaylist(body.playlistName || '', body.channelId);
  }

  @Post('skip')
  async skipTrack() {
    return this.queenDjService.skipTrack();
  }

  @Post('pause')
  async pause() {
    return this.queenDjService.pause();
  }

  @Post('resume')
  async resume() {
    return this.queenDjService.resume();
  }

  @Post('clear')
  async clearQueue() {
    return this.queenDjService.clearQueue();
  }
}
