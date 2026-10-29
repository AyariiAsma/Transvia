import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientGateway } from './gateways/client.gateway';
import { DriverGateway } from './gateways/driver.gateway';
import { AdminGateway } from './gateways/admin.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  providers: [AdminGateway, ClientGateway, DriverGateway],
  exports: [ClientGateway, DriverGateway, AdminGateway],
})
export class WebsocketModule {}
