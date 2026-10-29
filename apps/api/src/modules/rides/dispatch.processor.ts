import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { DispatchService } from './dispatch.service';
import { QUEUE_NAMES } from '@logistic/shared';

@Processor(QUEUE_NAMES.DISPATCH)
export class DispatchProcessor {
  private readonly logger = new Logger(DispatchProcessor.name);

  constructor(private readonly dispatchService: DispatchService) {}

  @Process('attempt')
  async handleAttempt(job: Job<{
    rideId: string;
    radiusM: number;
    attemptIndex: number;
    excludeDriverIds: string[];
  }>) {
    this.logger.debug(`Processing dispatch attempt: ${JSON.stringify(job.data)}`);
    await this.dispatchService.attemptDispatch(job.data);
  }

  @Process('driver_timeout')
  async handleDriverTimeout(job: Job<{
    rideId: string;
    driverId: string;
    attempt: {
      rideId: string;
      radiusM: number;
      attemptIndex: number;
      excludeDriverIds: string[];
    };
  }>) {
    this.logger.debug(`Driver timeout: driver=${job.data.driverId}, ride=${job.data.rideId}`);
    await this.dispatchService.handleDriverTimeout(
      job.data.rideId,
      job.data.driverId,
      job.data.attempt,
    );
  }
}
