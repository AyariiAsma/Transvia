import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { DispatchService } from './dispatch.service';
import { DispatchProcessor } from './dispatch.processor';
import { PricingService } from './pricing.service';
import { GeoModule } from '../geo/geo.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { QUEUE_NAMES } from '@logistic/shared';
import { DriverModule } from '../drivers/driver.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.DISPATCH }),
    GeoModule,
    NotificationsModule,
    WebsocketModule,
    DriverModule,
  ],
  controllers: [RidesController],
  providers: [RidesService, DispatchService, DispatchProcessor, PricingService],
  exports: [RidesService, PricingService],
})
export class RidesModule {}
