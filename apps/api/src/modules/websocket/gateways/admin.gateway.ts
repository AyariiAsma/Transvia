import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  namespace: '/admin',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class AdminGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AdminGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
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

      if (!user || user.role !== 'ADMIN') throw new Error('Admin requis');

      client.data.userId = user.id;
      client.join('admin:dashboard');
      this.logger.log(`Admin connecté: ${user.id}`);
    } catch (err) {
      this.logger.warn(`Admin connexion refusée: ${err.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Admin déconnecté: ${client.data.userId}`);
  }

  broadcast(event: string, data: unknown) {
    this.server.to('admin:dashboard').emit(event, data);
  }
}
