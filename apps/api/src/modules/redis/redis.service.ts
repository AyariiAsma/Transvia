import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';
import { REDIS_KEYS } from '@logistic/shared';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // ─── GEO Operations (chauffeurs en ligne) ────────────────────────────────

  async updateDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
    // GEO set pour les recherches de proximité
    await this.redis.geoadd(REDIS_KEYS.DRIVERS_ONLINE, lng, lat, driverId);

    // Metadata de la position
    await this.redis.setex(
      REDIS_KEYS.DRIVER_LOCATION(driverId),
      300, // TTL 5 minutes
      JSON.stringify({ lat, lng, updatedAt: Date.now() }),
    );
  }

  async removeDriverFromOnline(driverId: string): Promise<void> {
    await this.redis.zrem(REDIS_KEYS.DRIVERS_ONLINE, driverId);
    await this.redis.del(REDIS_KEYS.DRIVER_LOCATION(driverId));
  }

  async getNearbyDriverIds(
    lat: number,
    lng: number,
    radiusM: number,
    count = 10,
  ): Promise<string[]> {
    const results = await this.redis.georadius(
      REDIS_KEYS.DRIVERS_ONLINE,
      lng,
      lat,
      radiusM,
      'm',
      'ASC',
      'COUNT',
      count,
    );
    return results as string[];
  }

  async getDriverLocation(driverId: string): Promise<{ lat: number; lng: number; updatedAt: number } | null> {
    const data = await this.redis.get(REDIS_KEYS.DRIVER_LOCATION(driverId));
    return data ? JSON.parse(data) : null;
  }

  // ─── Cache générique ─────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async increment(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(key, ttlSeconds);
  }

  // ─── Sets (sessions, tokens) ─────────────────────────────────────────────

  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.redis.sadd(key, ...members);
  }

  async srem(key: string, member: string): Promise<void> {
    await this.redis.srem(key, member);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redis.smembers(key);
  }

  // ─── Pub/Sub ─────────────────────────────────────────────────────────────

  async publish(channel: string, message: unknown): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  // ─── Dispatch state ──────────────────────────────────────────────────────

  async setDispatchState(rideId: string, state: Record<string, unknown>, ttlSeconds = 300): Promise<void> {
    await this.redis.setex(
      REDIS_KEYS.RIDE_DISPATCH(rideId),
      ttlSeconds,
      JSON.stringify(state),
    );
  }

  async getDispatchState(rideId: string): Promise<Record<string, unknown> | null> {
    return this.get(REDIS_KEYS.RIDE_DISPATCH(rideId));
  }

  async delDispatchState(rideId: string): Promise<void> {
    await this.del(REDIS_KEYS.RIDE_DISPATCH(rideId));
  }
}
