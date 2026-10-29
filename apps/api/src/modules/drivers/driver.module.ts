import { Module, forwardRef } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { RidesModule } from '../rides/rides.module';

@Module({
  imports: [
    NotificationsModule,
    WebsocketModule,
    forwardRef(() => RidesModule),
  ],
  controllers: [DriverController],
  providers: [DriverService],
  exports: [DriverService],
})
export class DriverModule {}
