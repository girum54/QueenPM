import { Body, Controller, Get, Param, Post, Query, UseGuards, Delete } from '@nestjs/common';
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

  @Get('project/:projectId')
  async getCallForProject(@Param('projectId') projectId: string) {
    const call = await this.callsService.getActiveCallForProject(projectId);
    if (!call) {
      return null;
    }
    const participants = await this.callsService.getCallParticipants(call.id);
    return {
      ...call,
      participants: participants.map((p) => ({
        userId: p.userId,
        joinedAt: p.joinedAt,
      })),
    };
  }

  @Post('create')
  async createCall(
    @Body() body: { projectId: string; callType?: 'open' | 'invite_only' },
    @CurrentUser() user: any,
  ) {
    const call = await this.callsService.createCall(
      body.projectId,
      user.id,
      body.callType || 'open',
    );
    return call;
  }

  @Post(':callId/join')
  async joinCall(
    @Param('callId') callId: string,
    @CurrentUser() user: any,
  ) {
    // Check if user is already in call
    const alreadyInCall = await this.callsService.isUserInCall(callId, user.id);
    if (alreadyInCall) {
      // Just return token without adding participant again
      const call = await this.callsService.getCallById(callId);
      if (!call) {
        throw new Error('Call not found');
      }
      const token = await this.callsService.generateAccessToken(
        call.roomName,
        user.id,
        user.name,
      );
      return {
        token,
        url: this.callsService.getLivekitUrl(),
        call,
      };
    }

    // Add participant to call
    await this.callsService.joinCall(callId, user.id);

    const call = await this.callsService.getCallById(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    const token = await this.callsService.generateAccessToken(
      call.roomName,
      user.id,
      user.name,
    );

    return {
      token,
      url: this.callsService.getLivekitUrl(),
      call,
    };
  }

  @Post(':callId/leave')
  async leaveCall(
    @Param('callId') callId: string,
    @CurrentUser() user: any,
  ) {
    await this.callsService.leaveCall(callId, user.id);
    return { success: true };
  }

  @Delete(':callId')
  async endCall(
    @Param('callId') callId: string,
    @CurrentUser() user: any,
  ) {
    const call = await this.callsService.getCallById(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    // Only creator can end call
    if (call.createdBy !== user.id) {
      throw new Error('Only call creator can end the call');
    }

    await this.callsService.endCall(callId);
    return { success: true };
  }

  @Post(':callId/invite')
  async inviteUser(
    @Param('callId') callId: string,
    @Body() body: { recipientId: string },
    @CurrentUser() actor: any,
  ) {
    const call = await this.callsService.getCallById(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    // Create invite record
    await this.callsService.inviteUser(callId, body.recipientId, actor.id);

    // Send notification
    await this.notificationsService.push({
      recipientId: body.recipientId,
      actorId: actor.id,
      type: 'mentioned',
      title: `${actor.name} is inviting you to a call`,
      body: JSON.stringify({
        callId,
        projectId: call.projectId,
        text: `Join the call in project ${call.projectId}`,
      }),
      projectId: call.projectId,
      taskId: null,
    });

    return { sent: true };
  }

  @Get(':callId/participants')
  async getParticipants(@Param('callId') callId: string) {
    const participants = await this.callsService.getCallParticipants(callId);
    return participants.map((p) => ({
      userId: p.userId,
      joinedAt: p.joinedAt,
    }));
  }

  @Get('token/:roomName')
  async getAccessToken(
    @Param('roomName') roomName: string,
    @Query('identity') identity: string | undefined,
    @Query('name') name: string | undefined,
    @CurrentUser() user: any,
  ) {
    const token = await this.callsService.generateAccessToken(
      roomName,
      user.id,
      user.name,
      identity,
      name,
    );
    return {
      token,
      url: this.callsService.getLivekitUrl(),
    };
  }
}
