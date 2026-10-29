import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { HealthController } from './health.controller';
import { QUEUE_NAMES } from '@logistic/shared';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.DISPATCH }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
