import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SprintsController } from './sprints.controller';
import { SprintsService } from './sprints.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
