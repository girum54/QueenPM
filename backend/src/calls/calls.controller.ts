import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CallsService } from './calls.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('calls')
@UseGuards(AuthGuard)
export class CallsController {
  constructor(private callsService: CallsService) {}

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
}
