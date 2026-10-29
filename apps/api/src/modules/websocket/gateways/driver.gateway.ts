import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AdminGateway } from './admin.gateway';
import { ClientGateway } from './client.gateway';
import { SOCKET_EVENTS } from '@logistic/shared';

@WebSocketGateway({
  namespace: '/driver',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class DriverGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(DriverGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly adminGateway: AdminGateway,
    private readonly clientGateway: ClientGateway,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('Token manquant');

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub, isActive: true },
        include: { driver: true },
      });

      if (!user || user.role !== 'CHAUFFEUR' || !user.driver) {
        throw new Error('Non autorisé — chauffeur requis');
      }

      client.data.userId = user.id;
      client.data.driverId = user.driver.id;
      client.join(`driver:${user.driver.id}`);

      this.logger.log(`Chauffeur connecté: ${user.driver.id} (socket: ${client.id})`);
    } catch (err) {
      this.logger.warn(`Connexion chauffeur refusée: ${err.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.driverId) {
      this.logger.log(`Chauffeur déconnecté: ${client.data.driverId}`);
      // Optionnel: marquer le chauffeur comme hors ligne après un délai
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE)
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number; heading?: number; speed?: number },
  ) {
    const driverId = client.data.driverId;
    if (!driverId) return;

    // Mettre à jour Redis
    await this.redis.updateDriverLocation(driverId, data.lat, data.lng);

    // Mettre à jour la DB (throttled — toutes les 30 secondes en prod)
    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLat: data.lat,
        currentLng: data.lng,
        lastSeenAt: new Date(),
      },
    });

    // Trouver la course active de ce chauffeur
    const activeRide = await this.prisma.ride.findFirst({
      where: {
        driverId,
        status: { in: ['ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'RIDE_STARTED'] as any },
      },
    });

    if (activeRide) {
      // Calculer ETA
      const dist = Math.sqrt(
        (data.lat - activeRide.pickupLat) ** 2 + (data.lng - activeRide.pickupLng) ** 2,
      ) * 111; // approximation en km
      const etaMinutes = Math.round((dist / 30) * 60);

      // Notifier le client via ClientGateway
      this.clientGateway.broadcastDriverLocation(activeRide.id, {
        driverId,
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        speed: data.speed,
        eta: etaMinutes,
        timestamp: Date.now(),
      });
    }

    // Notifier le dashboard admin
    this.adminGateway.broadcast(SOCKET_EVENTS.DASHBOARD_DRIVER_LOCATION, {
      driverId,
      lat: data.lat,
      lng: data.lng,
      status: 'ONLINE',
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.DRIVER_PING)
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }

  // ─── Méthodes publiques ───────────────────────────────────────────────────

  sendRideRequest(driverId: string, data: unknown) {
    this.server.to(`driver:${driverId}`).emit(SOCKET_EVENTS.RIDE_NEW_REQUEST, data);
  }

  sendEvent(driverId: string, event: string, data: unknown) {
    this.server.to(`driver:${driverId}`).emit(event, data);
  }
}
