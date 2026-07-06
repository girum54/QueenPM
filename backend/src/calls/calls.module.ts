import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, NotificationsModule],
  providers: [CallsService],
  controllers: [CallsController],
  exports: [CallsService],
})
export class CallsModule {}
