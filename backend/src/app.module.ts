import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SprintsModule } from './sprints/sprints.module';
import { BoardsModule } from './boards/boards.module';
import { ProjectsModule } from './projects/projects.module';
import { ChannelsModule } from './channels/channels.module';
import { TasksModule } from './tasks/tasks.module';
import { MessagesModule } from './messages/messages.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,

    SprintsModule,
    BoardsModule,
    ProjectsModule,
    ChannelsModule,
    TasksModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
