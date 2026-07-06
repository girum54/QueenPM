import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CallsService } from './calls.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('calls')
@UseGuards(AuthGuard)
export class CallsController {
  constructor(
    private callsService: CallsService,
    private notificationsService: NotificationsService,
  ) {}

  @Get('active')
  async getActiveCalls() {
    return this.callsService.getActiveCalls();
  }

  @Get('token/:roomName')
  async getAccessToken(
    @Param('roomName') roomName: string,
    @CurrentUser() user: any,
  ) {
    const token = await this.callsService.generateAccessToken(
      roomName,
      user.id,
      user.name,
    );
    return {
      token,
      url: this.callsService.getLivekitUrl(),
    };
  }

  /** Send a call invite notification to a project member */
  @Post('invite')
  async inviteUser(
    @Body() body: { recipientId: string; roomName: string; channelName: string; channelId: string },
    @CurrentUser() actor: any,
  ) {
    await this.notificationsService.push({
      recipientId: body.recipientId,
      actorId: actor.id,
      type: 'mentioned',
      title: `${actor.name} is inviting you to a call`,
      body: JSON.stringify({
        channelId: body.channelId,
        channelName: body.channelName,
        text: `Join the voice call in #${body.channelName} now`,
      }),
      projectId: null,
      taskId: null,
    });
    return { sent: true };
  }
}
