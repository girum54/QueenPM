import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { QueenaiModule } from '../queenai/queenai.module';

@Module({
  imports: [DatabaseModule, QueenaiModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
