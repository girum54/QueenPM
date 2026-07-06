import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { SprintsModule } from './sprints/sprints.module';
import { BoardsModule } from './boards/boards.module';
import { ProjectsModule } from './projects/projects.module';
import { ChannelsModule } from './channels/channels.module';
import { TasksModule } from './tasks/tasks.module';
import { MessagesModule } from './messages/messages.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { CallsModule } from './calls/calls.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MusicModule } from './music/music.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,

    // Auth must come before other modules
    AuthModule,
    DashboardModule,
    SprintsModule,
    BoardsModule,
    ProjectsModule,
    ChannelsModule,
    TasksModule,
    MessagesModule,
    UsersModule,
    CallsModule,
    NotificationsModule,
    MusicModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Register AuthGuard globally — all routes are protected by default
    // Decorate with @Public() to allow unauthenticated access
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule { }
