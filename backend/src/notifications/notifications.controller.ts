import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** SSE endpoint — browser subscribes here to receive real-time notifications */
  @Sse('stream')
  stream(
    @CurrentUser() user: { id: string },
    @Res() res: Response,
  ): Observable<MessageEvent> {
    // Keep the SSE connection alive with a heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    res.on('close', () => clearInterval(heartbeat));

    return this.notificationsService.streamForUser(user.id) as Observable<MessageEvent>;
  }

  /** List all notifications for the current user */
  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.notificationsService.findAllForUser(user.id);
  }

  /** Mark a single notification as read */
  @Patch(':id/read')
  markRead(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.markRead(id, user.id);
  }

  /** Mark ALL notifications as read */
  @Patch('read-all')
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllRead(user.id);
  }

  /** Delete a notification */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.remove(id, user.id);
  }
}
