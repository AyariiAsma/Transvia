import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck, HealthCheckService, HealthCheckResult,
  HttpHealthIndicator, PrismaHealthIndicator,
} from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import { QUEUE_NAMES } from '@logistic/shared';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.DISPATCH) private readonly dispatchQueue: Queue,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check complet (DB, Redis, OSRM)' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // PostgreSQL
      () => this.prismaIndicator.pingCheck('postgresql', this.prisma),

      // OSRM routing
      () =>
        this.http.pingCheck(
          'osrm',
          `${process.env.OSRM_BASE_URL || 'http://router.project-osrm.org'}/route/v1/driving/10.18,36.81;10.19,36.82`,
          { timeout: 5000 },
        ).catch(() => ({ osrm: { status: 'down', message: 'OSRM unreachable' } } as any)),
    ]);
  }

  @Get('ping')
  @Public()
  @ApiOperation({ summary: 'Ping simple' })
  ping() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
