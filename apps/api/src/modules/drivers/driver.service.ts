import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ClientGateway } from '../websocket/gateways/client.gateway';
import { AdminGateway } from '../websocket/gateways/admin.gateway';
import { DriverRegisterDto } from './dto/driver-register.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DispatchService } from '../rides/dispatch.service';
import {
  RideStatus,
  VALID_RIDE_TRANSITIONS,
  ACTIVE_RIDE_STATUSES,
  SOCKET_EVENTS,
  APP_CONFIG,
} from '@logistic/shared';
import { User } from '@prisma/client';

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly clientGateway: ClientGateway,
    private readonly adminGateway: AdminGateway,
    private readonly dispatch: DispatchService,
  ) {}

  // ─── Inscription chauffeur ────────────────────────────────────────────────

  async registerDriver(dto: DriverRegisterDto, user: User) {
    const existing = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (existing) throw new ConflictException('Profil chauffeur déjà créé');

    const driver = await this.prisma.$transaction(async (tx) => {
      const newDriver = await tx.driver.create({
        data: {
          userId: user.id,
          licenseNumber: dto.licenseNumber,
          licenseExpiry: new Date(dto.licenseExpiry),
          status: 'PENDING',
        },
      });

      await tx.vehicle.create({
        data: {
          driverId: newDriver.id,
          typeId: dto.vehicleTypeId,
          make: dto.vehicleMake,
          model: dto.vehicleModel,
          year: dto.vehicleYear,
          plateNumber: dto.vehiclePlate,
          color: dto.vehicleColor,
        },
      });

      // Wallet chauffeur si pas déjà créé
      await tx.wallet.upsert({
        where: { userId: user.id },
        create: { userId: user.id, balance: 0, currency: 'TND' },
        update: {},
      });

      return newDriver;
    });

    // Notifier les admins
    this.adminGateway.broadcast(SOCKET_EVENTS.DASHBOARD_NEW_DRIVER_DOC, {
      driverId: driver.id,
      userId: user.id,
      message: 'Nouveau chauffeur en attente de validation',
    });

    return { success: true, data: driver };
  }

  // ─── Documents ────────────────────────────────────────────────────────────

  async uploadDocument(dto: UploadDocumentDto, user: User) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) throw new NotFoundException('Profil chauffeur introuvable');

    const doc = await this.prisma.driverDocument.upsert({
      where: { driverId_type: { driverId: driver.id, type: dto.type as any } },
      create: {
        driverId: driver.id,
        type: dto.type as any,
        cloudinaryUrl: dto.cloudinaryUrl,
        cloudinaryPublicId: dto.cloudinaryPublicId,
        status: 'PENDING',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      update: {
        cloudinaryUrl: dto.cloudinaryUrl,
        cloudinaryPublicId: dto.cloudinaryPublicId,
        status: 'PENDING',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    // Notifier les admins
    this.adminGateway.broadcast(SOCKET_EVENTS.DASHBOARD_NEW_DRIVER_DOC, {
      driverId: driver.id,
      documentType: dto.type,
    });

    return { success: true, data: doc };
  }

  async getDocuments(user: User) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: user.id },
      include: { documents: true },
    });
    if (!driver) throw new NotFoundException('Profil chauffeur introuvable');
    return { success: true, data: driver.documents };
  }

  // ─── Statut en ligne/hors ligne ───────────────────────────────────────────

  async updateOnlineStatus(
    isOnline: boolean,
    lat?: number,
    lng?: number,
    user?: User,
  ) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user!.id } });
    if (!driver) throw new NotFoundException('Profil chauffeur introuvable');
    if (driver.status !== 'APPROVED') {
      throw new ForbiddenException('Compte chauffeur non approuvé');
    }

    // Vérifier que tous les documents sont valides
    if (isOnline) {
      const pendingDocs = await this.prisma.driverDocument.count({
        where: {
          driverId: driver.id,
          status: { not: 'APPROVED' },
        },
      });
      const totalDocs = await this.prisma.driverDocument.count({
        where: { driverId: driver.id },
      });

      if (totalDocs < APP_CONFIG.DRIVER_REQUIRED_DOCUMENTS.length) {
        throw new BadRequestException('Documents incomplets');
      }
      if (pendingDocs > 0) {
        throw new BadRequestException('Documents en attente de validation');
      }
    }

    await this.prisma.driver.update({
      where: { id: driver.id },
      data: {
        isOnline,
        currentLat: lat,
        currentLng: lng,
        lastSeenAt: new Date(),
      },
    });

    if (isOnline && lat && lng) {
      await this.redis.updateDriverLocation(driver.id, lat, lng);
      this.adminGateway.broadcast(SOCKET_EVENTS.DASHBOARD_DRIVER_LOCATION, {
        driverId: driver.id,
        lat,
        lng,
        status: 'ONLINE',
      });
    } else {
      await this.redis.removeDriverFromOnline(driver.id);
      this.adminGateway.broadcast(SOCKET_EVENTS.DASHBOARD_DRIVER_LOCATION, {
        driverId: driver.id,
        status: 'OFFLINE',
      });
    }

    return { success: true, data: { isOnline } };
  }

  // ─── Course active ────────────────────────────────────────────────────────

  async getActiveRide(user: User) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) throw new NotFoundException();

    const ride = await this.prisma.ride.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ACTIVE_RIDE_STATUSES as any },
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true } },
        vehicleType: true,
      },
    });

    return { success: true, data: ride };
  }

  // ─── Accepter une course ──────────────────────────────────────────────────

  async acceptRide(rideId: string, user: User) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) throw new NotFoundException();

    const ride = await this.dispatch.acceptRide(rideId, driver.id);
    return { success: true, data: ride };
  }

  // ─── Refuser une course ───────────────────────────────────────────────────

  async rejectRide(rideId: string, user: User) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) throw new NotFoundException();

    // Supprimer l'offre pour ce chauffeur (le dispatch continuera automatiquement via timeout)
    await this.redis.del(`offer:${rideId}:${driver.id}`);
    this.logger.log(`Chauffeur ${driver.id} a refusé la course ${rideId}`);

    return { success: true };
  }

  // ─── Mise à jour statut course ────────────────────────────────────────────

  async updateRideStatus(rideId: string, newStatus: string, user: User) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) throw new NotFoundException();

    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        client: { include: { devices: { where: { isActive: true } } } },
      },
    });

    if (!ride) throw new NotFoundException('Course introuvable');
    if (ride.driverId !== driver.id) throw new ForbiddenException();

    // Valider la transition
    const validNextStatuses = VALID_RIDE_TRANSITIONS[ride.status as RideStatus] || [];
    if (!validNextStatuses.includes(newStatus as RideStatus)) {
      throw new BadRequestException(
        `Transition invalide: ${ride.status} → ${newStatus}`,
      );
    }

    const updateData: any = { status: newStatus };
    if (newStatus === 'DRIVER_ARRIVED') updateData.arrivedAt = new Date();
    if (newStatus === 'RIDE_STARTED') updateData.startedAt = new Date();

    const updatedRide = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ride.update({ where: { id: rideId }, data: updateData });
      await tx.rideStatusHistory.create({
        data: { rideId, status: newStatus as any, changedBy: driver.id },
      });
      return updated;
    });

    // Notifier le client
    const eventMap: Record<string, string> = {
      DRIVER_ARRIVED: SOCKET_EVENTS.RIDE_DRIVER_ARRIVED,
      RIDE_STARTED: SOCKET_EVENTS.RIDE_STARTED,
    };

    const event = eventMap[newStatus];
    if (event) {
      this.clientGateway.sendEvent(ride.clientId, event, { rideId, status: newStatus });

      const fcmTokens = ride.client?.devices?.map((d: any) => d.fcmToken) || [];
      const titles: Record<string, string> = {
        DRIVER_ARRIVED: '🚗 Le chauffeur est arrivé !',
        RIDE_STARTED: '▶️ Course démarrée',
      };
      if (fcmTokens.length > 0) {
        await this.notifications.sendPushToTokens(fcmTokens, {
          title: titles[newStatus] || 'Mise à jour de votre course',
          body: '',
          data: { type: `RIDE_${newStatus}`, rideId },
        });
      }
    }

    // Mettre à jour le dashboard admin
    this.adminGateway.broadcast(SOCKET_EVENTS.DASHBOARD_RIDE_UPDATE, {
      rideId,
      status: newStatus,
    });

    return { success: true, data: updatedRide };
  }

  // ─── Terminer la course ───────────────────────────────────────────────────

  async completeRide(rideId: string, user: User) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) throw new NotFoundException();

    // D'abord mettre à COMPLETED
    const result = await this.updateRideStatus(rideId, 'COMPLETED', user);
    const ride = result.data;

    // Recalculer le tarif final basé sur la durée et distance réelles
    // (si la course a duré plus longtemps que prévu)
    const updatedRide = await this.prisma.$transaction(async (tx) => {
      // Mettre à jour les earnings du chauffeur et de la plateforme
      const finalFare = Number(ride.finalFare || ride.estimatedFare || 0);
      const commissionPct = 0.15; // TODO: récupérer depuis pricing rule
      const driverEarnings = finalFare * (1 - commissionPct);

      await tx.driver.update({
        where: { id: driver.id },
        data: {
          totalRides: { increment: 1 },
          earningsTotal: { increment: driverEarnings },
        },
      });

      // Créer le paiement si méthode = CASH
      if (ride.paymentMethod === 'CASH') {
        await tx.payment.create({
          data: {
            rideId,
            payerId: ride.clientId,
            payeeId: driver.userId,
            amount: finalFare,
            currency: ride.currencyCode,
            method: 'CASH',
            status: 'COMPLETED',
            idempotencyKey: `ride_${rideId}_cash`,
            platformCommission: finalFare * commissionPct,
            driverEarnings,
          },
        });

        // Créditer le wallet du chauffeur
        const wallet = await tx.wallet.findUnique({ where: { userId: driver.userId } });
        if (wallet) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: driverEarnings } },
          });
          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              type: 'CREDIT',
              amount: driverEarnings,
              balanceAfter: Number(wallet.balance) + driverEarnings,
              description: `Gains course #${rideId.slice(0, 8)}`,
              referenceId: rideId,
            },
          });
        }
      }

      return tx.ride.update({
        where: { id: rideId },
        data: { status: 'PAYMENT_CONFIRMED', completedAt: new Date() },
      });
    });

    // Notifier le client
    const clientData = await this.prisma.user.findUnique({
      where: { id: ride.clientId },
      include: { devices: { where: { isActive: true } } },
    });

    if (clientData?.devices?.length > 0) {
      await this.notifications.sendPushToTokens(
        clientData.devices.map((d) => d.fcmToken),
        {
          title: '✅ Course terminée !',
          body: 'Notez votre chauffeur et partagez votre avis',
          data: { type: 'RIDE_COMPLETED', rideId },
        },
      );
    }

    this.clientGateway.sendEvent(ride.clientId, SOCKET_EVENTS.RIDE_COMPLETED, {
      rideId,
      finalFare: ride.finalFare || ride.estimatedFare,
      currency: ride.currencyCode,
    });

    return { success: true, data: updatedRide };
  }

  // ─── Gains & Stats ────────────────────────────────────────────────────────

  async getEarnings(user: User) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) throw new NotFoundException();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayEarnings, weekEarnings, monthEarnings, wallet] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { payeeId: user.id, status: 'COMPLETED', createdAt: { gte: today } },
        _sum: { driverEarnings: true },
      }),
      this.prisma.payment.aggregate({
        where: { payeeId: user.id, status: 'COMPLETED', createdAt: { gte: weekStart } },
        _sum: { driverEarnings: true },
      }),
      this.prisma.payment.aggregate({
        where: { payeeId: user.id, status: 'COMPLETED', createdAt: { gte: monthStart } },
        _sum: { driverEarnings: true },
      }),
      this.prisma.wallet.findUnique({ where: { userId: user.id } }),
    ]);

    return {
      success: true,
      data: {
        today: Number(todayEarnings._sum.driverEarnings || 0),
        week: Number(weekEarnings._sum.driverEarnings || 0),
        month: Number(monthEarnings._sum.driverEarnings || 0),
        total: Number(driver.earningsTotal),
        walletBalance: Number(wallet?.balance || 0),
        currency: wallet?.currency || 'TND',
      },
    };
  }

  async getStats(user: User) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: user.id },
      include: { _count: { select: { ridesAsDriver: true } } },
    });
    if (!driver) throw new NotFoundException();

    const cancelledRides = await this.prisma.ride.count({
      where: { driverId: driver.id, status: 'CANCELLED', cancelledBy: user.id },
    });

    return {
      success: true,
      data: {
        totalRides: driver.totalRides,
        ratingAvg: driver.ratingAvg,
        cancellationRate:
          driver.totalRides > 0 ? cancelledRides / driver.totalRides : 0,
        status: driver.status,
        isOnline: driver.isOnline,
      },
    };
  }

  async getHistory(user: User, page: number, limit: number) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) throw new NotFoundException();

    const skip = (page - 1) * limit;
    const [rides, total] = await Promise.all([
      this.prisma.ride.findMany({
        where: { driverId: driver.id, status: { in: ['COMPLETED', 'PAYMENT_CONFIRMED', 'CANCELLED'] as any } },
        include: {
          client: { select: { firstName: true, lastName: true, avatarUrl: true } },
          vehicleType: true,
          payment: { select: { amount: true, driverEarnings: true, currency: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ride.count({ where: { driverId: driver.id } }),
    ]);

    return { success: true, data: rides, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async requestPayout(amount: number, user: User) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) throw new NotFoundException('Portefeuille introuvable');
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Solde insuffisant');
    }

    const payout = await this.prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({ where: { userId: user.id } });
      const p = await tx.payout.create({
        data: {
          driverId: driver!.id,
          amount,
          currency: wallet.currency,
          status: 'PENDING',
        },
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYOUT',
          amount,
          balanceAfter: Number(wallet.balance) - amount,
          description: `Demande de retrait`,
          referenceId: p.id,
        },
      });
      return p;
    });

    return { success: true, data: payout };
  }

  async getPayouts(user: User) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
    if (!driver) throw new NotFoundException();
    const payouts = await this.prisma.payout.findMany({
      where: { driverId: driver.id },
      orderBy: { requestedAt: 'desc' },
    });
    return { success: true, data: payouts };
  }
}
