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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SOCKET_EVENTS } from '@logistic/shared';

@WebSocketGateway({
  namespace: '/client',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class ClientGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ClientGateway.name);

  // Map userId → socketId pour les messages directs
  private userSockets = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
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
      });

      if (!user || user.role !== 'CLIENT') throw new Error('Non autorisé');

      client.data.userId = user.id;
      client.join(`user:${user.id}`);
      this.userSockets.set(user.id, client.id);

      this.logger.log(`Client connecté: ${user.id} (${client.id})`);
    } catch (err) {
      this.logger.warn(`Client connexion refusée: ${err.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.userSockets.delete(client.data.userId);
      this.logger.log(`Client déconnecté: ${client.data.userId}`);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.CLIENT_TRACKING_START)
  handleTrackingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { rideId: string }) {
    client.join(`ride:${data.rideId}`);
    this.logger.debug(`Client ${client.data.userId} suit la course ${data.rideId}`);
  }

  @SubscribeMessage(SOCKET_EVENTS.CLIENT_TRACKING_STOP)
  handleTrackingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { rideId: string }) {
    client.leave(`ride:${data.rideId}`);
  }

  // ─── Méthodes publiques appelées par les services ────────────────────────

  sendEvent(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  notifyRideAccepted(clientId: string, data: unknown) {
    this.server.to(`user:${clientId}`).emit(SOCKET_EVENTS.RIDE_ACCEPTED, data);
  }

  broadcastDriverLocation(rideId: string, locationData: unknown) {
    this.server.to(`ride:${rideId}`).emit(SOCKET_EVENTS.RIDE_DRIVER_LOCATION, locationData);
  }
}
