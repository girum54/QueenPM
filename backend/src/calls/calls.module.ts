import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';

@Module({
  imports: [ConfigModule],
  providers: [CallsService],
  controllers: [CallsController],
  exports: [CallsService],
})
export class CallsModule {}
