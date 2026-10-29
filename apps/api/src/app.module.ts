import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RidesModule } from './modules/rides/rides.module';
import { DriverModule } from './modules/drivers/driver.module';
import { GeoModule } from './modules/geo/geo.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { WebsocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [
    // ─── Config globale ────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      expandVariables: true,
    }),

    // ─── Rate limiting ─────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 },          // 100 req/min par défaut
      { name: 'auth', ttl: 60000, limit: 10 }, // 10/min pour auth
    ]),

    // ─── Job queues ────────────────────────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('REDIS_URL', 'redis://localhost:6379'),
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
    }),

    // ─── Tâches planifiées ─────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── HTTP client ───────────────────────────────────────────────────────────
    HttpModule.register({ timeout: 10000 }),

    // ─── Infrastructure (global) ───────────────────────────────────────────────
    PrismaModule,
    RedisModule,
    FirebaseModule,
    CloudinaryModule,
    NotificationsModule,

    // ─── Feature modules ───────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    RidesModule,
    DriverModule,
    GeoModule,
    AdminModule,
    WebsocketModule,

    // ─── Utilitaires ───────────────────────────────────────────────────────────
    HealthModule,
    WebhooksModule,
  ],
})
export class AppModule {}
