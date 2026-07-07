import { Module } from '@nestjs/common';
import { QueenDjService } from './queendj.service';
import { QueenDjController } from './queendj.controller';
import { MusicModule } from '../music/music.module';
import { MessagesModule } from '../messages/messages.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [MusicModule, MessagesModule, DatabaseModule],
  controllers: [QueenDjController],
  providers: [QueenDjService],
  exports: [QueenDjService],
})
export class QueenDjModule {}
