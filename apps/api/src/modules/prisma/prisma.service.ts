import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connexion PostgreSQL établie');

    // Activer les extensions PostGIS si pas déjà fait
    await this.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await this.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Connexion PostgreSQL fermée');
  }

  /**
   * Recherche les chauffeurs disponibles dans un rayon donné (PostGIS)
   */
  async findNearbyDrivers(
    lat: number,
    lng: number,
    radiusMeters: number,
    vehicleTypeId: string,
    limit = 10,
  ): Promise<Array<{ id: string; userId: string; distance: number }>> {
    return this.$queryRaw`
      SELECT
        d.id,
        d.user_id as "userId",
        ST_Distance(
          ST_SetSRID(ST_MakePoint(d.current_lng, d.current_lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) as distance
      FROM drivers d
      JOIN vehicles v ON v.driver_id = d.id AND v.is_active = true AND v.type_id = ${vehicleTypeId}::uuid
      WHERE
        d.is_online = true
        AND d.status = 'APPROVED'
        AND d.current_lat IS NOT NULL
        AND d.current_lng IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(d.current_lng, d.current_lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )
      ORDER BY distance ASC
      LIMIT ${limit}
    `;
  }

  /**
   * Soft delete helper
   */
  async softDelete(model: string, id: string): Promise<void> {
    await this.$executeRaw`
      UPDATE ${model}s SET deleted_at = NOW() WHERE id = ${id}::uuid
    `;
  }
}
