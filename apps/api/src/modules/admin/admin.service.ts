import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminGateway } from '../websocket/gateways/admin.gateway';
import { SOCKET_EVENTS } from '@logistic/shared';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly adminGateway: AdminGateway,
  ) {}

  // ─── Dashboard KPIs ────────────────────────────────────────────────────────

  async getDashboardStats() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    const [
      activeRides, onlineDrivers, totalDrivers, pendingDrivers,
      todayRides, todayRevenue, yesterdayRevenue,
      pendingPayouts, totalUsers,
    ] = await Promise.all([
      this.prisma.ride.count({ where: { status: { in: ['SEARCHING', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'RIDE_STARTED'] as any } } }),
      this.prisma.driver.count({ where: { isOnline: true, status: 'APPROVED' } }),
      this.prisma.driver.count({ where: { status: 'APPROVED' } }),
      this.prisma.driver.count({ where: { status: 'PENDING' } }),
      this.prisma.ride.count({ where: { requestedAt: { gte: today } } }),
      this.prisma.payment.aggregate({ where: { createdAt: { gte: today }, status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { createdAt: { gte: yesterday, lt: today }, status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.payout.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({ where: { role: 'CLIENT', deletedAt: null } }),
    ]);

    const todayRev = Number(todayRevenue._sum.amount || 0);
    const yestRev = Number(yesterdayRevenue._sum.amount || 0);
    const revenueChange = yestRev > 0 ? ((todayRev - yestRev) / yestRev) * 100 : 0;

    return {
      success: true,
      data: {
        rides: { active: activeRides, today: todayRides },
        drivers: { online: onlineDrivers, total: totalDrivers, pending: pendingDrivers },
        revenue: { today: todayRev, change: Math.round(revenueChange * 10) / 10 },
        finance: { pendingPayouts },
        users: { total: totalUsers },
        timestamp: new Date(),
      },
    };
  }

  async getMapData() {
    const [activeRides, onlineDrivers] = await Promise.all([
      this.prisma.ride.findMany({
        where: { status: { in: ['RIDE_STARTED', 'ACCEPTED', 'DRIVER_EN_ROUTE'] as any } },
        include: {
          client: { select: { firstName: true, lastName: true } },
          driver: { select: { id: true, userId: true } },
        },
        select: {
          id: true, status: true,
          pickupLat: true, pickupLng: true,
          dropoffLat: true, dropoffLng: true,
          clientId: true, driverId: true,
        } as any,
        take: 100,
      }),
      this.prisma.driver.findMany({
        where: { isOnline: true, status: 'APPROVED', currentLat: { not: null } },
        select: {
          id: true, currentLat: true, currentLng: true, isOnline: true,
          user: { select: { firstName: true, lastName: true } },
        },
        take: 200,
      }),
    ]);

    return { success: true, data: { activeRides, onlineDrivers } };
  }

  // ─── Rides ────────────────────────────────────────────────────────────────

  async getRides(query: any) {
    const { page = 1, limit = 20, status, country, search } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(country ? { countryCode: country } : {}),
      ...(search ? {
        OR: [
          { id: { contains: search } },
          { pickupAddress: { contains: search, mode: 'insensitive' } },
          { dropoffAddress: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [rides, total] = await Promise.all([
      this.prisma.ride.findMany({
        where,
        include: {
          client: { select: { id: true, firstName: true, lastName: true, phone: true } },
          driver: { select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } } },
          vehicleType: { select: { name: true } },
          payment: { select: { amount: true, method: true, status: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.ride.count({ where }),
    ]);

    return {
      success: true,
      data: rides,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  }

  async getRide(id: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        client: true, driver: { include: { user: true, vehicle: true } },
        vehicleType: true, payment: true, ratings: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });
    if (!ride) throw new NotFoundException('Course introuvable');
    return { success: true, data: ride };
  }

  async adminCancelRide(rideId: string, reason: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException();

    await this.prisma.$transaction(async (tx) => {
      await tx.ride.update({
        where: { id: rideId },
        data: { status: 'CANCELLED', cancelReason: `[ADMIN] ${reason}`, cancelledAt: new Date() },
      });
      await tx.rideStatusHistory.create({
        data: { rideId, status: 'CANCELLED', metadata: { reason, cancelledBy: 'admin' } },
      });
    });

    await this.redis.delDispatchState(rideId);
    this.adminGateway.broadcast(SOCKET_EVENTS.DASHBOARD_RIDE_UPDATE, { rideId, status: 'CANCELLED' });
    return { success: true };
  }

  async assignDriver(rideId: string, driverId: string) {
    const [ride, driver] = await Promise.all([
      this.prisma.ride.findUnique({ where: { id: rideId } }),
      this.prisma.driver.findUnique({ where: { id: driverId }, include: { user: true } }),
    ]);

    if (!ride) throw new NotFoundException('Course introuvable');
    if (!driver) throw new NotFoundException('Chauffeur introuvable');

    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: { driverId, status: 'ACCEPTED', acceptedAt: new Date() },
    });

    return { success: true, data: updatedRide };
  }

  async refundRide(rideId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { rideId } });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    if (payment.status === 'REFUNDED') throw new BadRequestException('Déjà remboursé');

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED' },
    });

    return { success: true };
  }

  // ─── Drivers ──────────────────────────────────────────────────────────────

  async getDrivers(query: any) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(search ? {
        user: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        },
      } : {}),
    };

    const [drivers, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true, avatarUrl: true } },
          vehicle: { include: { vehicleType: true } },
          documents: true,
        },
        orderBy: { createdAt: 'desc' },
        skip, take: Number(limit),
      }),
      this.prisma.driver.count({ where }),
    ]);

    return {
      success: true, data: drivers,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  }

  async getDriver(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: true, vehicle: { include: { vehicleType: true } },
        documents: true,
        ridesAsDriver: {
          orderBy: { requestedAt: 'desc' },
          take: 10,
          include: { client: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!driver) throw new NotFoundException('Chauffeur introuvable');
    return { success: true, data: driver };
  }

  async updateDriverStatus(driverId: string, status: string, reason?: string) {
    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: { status: status as any },
      include: { user: { include: { devices: { where: { isActive: true } } } } },
    });

    const titles: Record<string, string> = {
      APPROVED: '✅ Compte approuvé !',
      REJECTED: '❌ Demande refusée',
      SUSPENDED: '⚠️ Compte suspendu',
    };

    if (driver.user?.devices?.length > 0) {
      await this.notifications.sendPushToTokens(
        driver.user.devices.map((d: any) => d.fcmToken),
        {
          title: titles[status] || 'Mise à jour de statut',
          body: reason || `Votre statut a été mis à jour: ${status}`,
          data: { type: 'DRIVER_STATUS_UPDATED', status },
        },
      );
    }

    return { success: true, data: driver };
  }

  async getDriverDocuments(driverId: string) {
    const docs = await this.prisma.driverDocument.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: docs };
  }

  async verifyDocument(driverId: string, docId: string, status: string, reason?: string) {
    const doc = await this.prisma.driverDocument.update({
      where: { id: docId },
      data: {
        status: status as any,
        verifiedAt: status === 'APPROVED' ? new Date() : undefined,
        rejectionReason: status === 'REJECTED' ? reason : undefined,
      },
    });
    return { success: true, data: doc };
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  async getUsers(query: any) {
    const { page = 1, limit = 20, role, search } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, phone: true, email: true,
          role: true, isActive: true, createdAt: true, avatarUrl: true,
          _count: { select: { ridesAsClient: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: Number(limit),
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      success: true, data: users,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        clientProfile: true,
        wallet: true,
        ridesAsClient: { orderBy: { requestedAt: 'desc' }, take: 10, include: { vehicleType: true } },
      },
    });
    if (!user) throw new NotFoundException();
    const { passwordHash, ...safe } = user;
    return { success: true, data: safe };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    await this.prisma.user.update({ where: { id: userId }, data: { isActive } });
    return { success: true };
  }

  // ─── Finance ───────────────────────────────────────────────────────────────

  async getTransactions(query: any) {
    const { page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const [txs, total] = await Promise.all([
      this.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' }, skip, take: Number(limit),
        include: {
          ride: { select: { pickupAddress: true, dropoffAddress: true } },
        },
      }),
      this.prisma.payment.count(),
    ]);
    return { success: true, data: txs, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getPayouts(query: any) {
    const { page = 1, limit = 20, status } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = status ? { status } : {};
    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where, orderBy: { requestedAt: 'desc' }, skip, take: Number(limit),
        include: { driver: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } } },
      }),
      this.prisma.payout.count({ where }),
    ]);
    return { success: true, data: payouts, meta: { total } };
  }

  async processPayout(id: string, status: string) {
    const payout = await this.prisma.payout.update({
      where: { id },
      data: {
        status: status as any,
        processedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
    return { success: true, data: payout };
  }

  // ─── Pricing ───────────────────────────────────────────────────────────────

  async getPricingRules() {
    const rules = await this.prisma.pricingRule.findMany({
      include: { vehicleType: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: rules };
  }

  async createPricingRule(dto: any) {
    const rule = await this.prisma.pricingRule.create({ data: dto });
    return { success: true, data: rule };
  }

  async updatePricingRule(id: string, dto: any) {
    const rule = await this.prisma.pricingRule.update({ where: { id }, data: dto });
    return { success: true, data: rule };
  }

  async getVehicleTypes() {
    const types = await this.prisma.vehicleType.findMany({ orderBy: { order: 'asc' } });
    return { success: true, data: types };
  }

  async createVehicleType(dto: any) {
    const vt = await this.prisma.vehicleType.create({ data: dto });
    return { success: true, data: vt };
  }

  async updateVehicleType(id: string, dto: any) {
    const vt = await this.prisma.vehicleType.update({ where: { id }, data: dto });
    return { success: true, data: vt };
  }

  async getPromoCodes() {
    const promos = await this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    return { success: true, data: promos };
  }

  async createPromoCode(dto: any) {
    const promo = await this.prisma.promoCode.create({
      data: {
        ...dto,
        code: dto.code.toUpperCase(),
        validFrom: new Date(dto.validFrom),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
    return { success: true, data: promo };
  }

  async togglePromoCode(id: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException();
    const updated = await this.prisma.promoCode.update({
      where: { id },
      data: { isActive: !promo.isActive },
    });
    return { success: true, data: updated };
  }

  // ─── Notifications ─────────────────────────────────────────────────────────

  async sendBroadcastNotification(dto: {
    title: string; body: string; target: string; userIds?: string[];
  }) {
    let users: any[] = [];

    if (dto.target === 'ALL') {
      users = await this.prisma.user.findMany({
        where: { isActive: true, deletedAt: null },
        include: { devices: { where: { isActive: true } } },
      });
    } else if (dto.target === 'CLIENTS') {
      users = await this.prisma.user.findMany({
        where: { role: 'CLIENT', isActive: true, deletedAt: null },
        include: { devices: { where: { isActive: true } } },
      });
    } else if (dto.target === 'DRIVERS') {
      users = await this.prisma.user.findMany({
        where: { role: 'CHAUFFEUR', isActive: true, deletedAt: null },
        include: { devices: { where: { isActive: true } } },
      });
    }

    const tokens = users.flatMap((u: any) => u.devices?.map((d: any) => d.fcmToken) || []);
    this.logger.log(`Broadcast: ${tokens.length} tokens — cible: ${dto.target}`);

    if (tokens.length > 0) {
      await this.notifications.sendPushToTokens(tokens, {
        title: dto.title, body: dto.body,
        data: { type: 'BROADCAST' },
      });
    }

    return { success: true, data: { sent: tokens.length } };
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  async getSettings() {
    const settings = await this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
    return { success: true, data: settings };
  }

  async updateSetting(key: string, value: unknown) {
    const setting = await this.prisma.setting.upsert({
      where: { key },
      create: { key, value: value as any },
      update: { value: value as any },
    });
    return { success: true, data: setting };
  }
}
