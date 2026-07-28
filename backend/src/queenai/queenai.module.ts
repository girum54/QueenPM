import { Module } from '@nestjs/common';
import { QueenaiService } from './queenai.service';
import { TasksModule } from '../tasks/tasks.module';
import { SprintsModule } from '../sprints/sprints.module';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { ChannelsModule } from '../channels/channels.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    TasksModule,
    SprintsModule,
    ProjectsModule,
    UsersModule,
    ChannelsModule,
    DatabaseModule,
  ],
  providers: [QueenaiService],
  exports: [QueenaiService],
})
export class QueenaiModule {}
