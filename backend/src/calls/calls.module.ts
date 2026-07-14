import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, NotificationsModule, DatabaseModule],
  providers: [CallsService],
  controllers: [CallsController],
  exports: [CallsService],
})
export class CallsModule {}
