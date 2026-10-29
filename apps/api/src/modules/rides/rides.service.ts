import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { PricingService } from './pricing.service';
import { DispatchService } from './dispatch.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../redis/redis.service';
import { ClientGateway } from '../websocket/gateways/client.gateway';
import { DriverGateway } from '../websocket/gateways/driver.gateway';
import { CreateRideDto } from './dto/create-ride.dto';
import { FareEstimateDto } from './dto/fare-estimate.dto';
import {
  RideStatus,
  VALID_RIDE_TRANSITIONS,
  TERMINAL_RIDE_STATUSES,
  ACTIVE_RIDE_STATUSES,
  CurrencyCode,
  SOCKET_EVENTS,
} from '@logistic/shared';
import { User } from '@prisma/client';

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly pricing: PricingService,
    private readonly dispatch: DispatchService,
    private readonly notifications: NotificationsService,
    private readonly redis: RedisService,
    private readonly clientGateway: ClientGateway,
    private readonly driverGateway: DriverGateway,
  ) {}

  // ─── Estimation ──────────────────────────────────────────────────────────

  async estimateFare(dto: FareEstimateDto, user: User) {
    // 1. Calculer la route via OSRM
    const route = await this.geo.getRoute(
      dto.pickupLat, dto.pickupLng,
      dto.dropoffLat, dto.dropoffLng,
    );

    // 2. Appliquer le promo si fourni
    let promoDiscount = 0;
    let promoCodeId: string | undefined;

    if (dto.promoCode) {
      try {
        const promo = await this.pricing.applyPromoCode(
          dto.promoCode,
          user.id,
          dto.vehicleTypeId,
          dto.countryCode,
          0, // estimé à 0 pour pré-validation
          dto.currencyCode as CurrencyCode,
        );
        promoDiscount = promo.discountAmount;
        promoCodeId = promo.promoCodeId;
      } catch {
        // Promo invalide — ignorer silencieusement lors de l'estimation
      }
    }

    // 3. Vérifier le surge actif dans la zone
    const surgeMultiplier = await this.getSurgeMultiplier(
      dto.pickupLat, dto.pickupLng, dto.countryCode,
    );

    // 4. Calculer le tarif
    const fareBreakdown = await this.pricing.calculateFare({
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      vehicleTypeId: dto.vehicleTypeId,
      countryCode: dto.countryCode,
      surgeMultiplier,
      promoDiscountAmount: promoDiscount,
      currencyCode: dto.currencyCode as CurrencyCode,
    });

    return {
      success: true,
      data: {
        vehicleTypeId: dto.vehicleTypeId,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        fare: fareBreakdown,
        surgeActive: surgeMultiplier > 1,
        polyline: route.polyline,
        currency: dto.currencyCode,
      },
    };
  }

  // ─── Créer une course ────────────────────────────────────────────────────

  async createRide(dto: CreateRideDto, user: User) {
    // Vérifier pas de course active en cours
    const activeRide = await this.prisma.ride.findFirst({
      where: {
        clientId: user.id,
        status: { in: ACTIVE_RIDE_STATUSES as any },
      },
    });

    if (activeRide) {
      throw new BadRequestException('Vous avez déjà une course en cours');
    }

    // Calculer la route
    const route = await this.geo.getRoute(
      dto.pickupLat, dto.pickupLng,
      dto.dropoffLat, dto.dropoffLng,
    );

    // Appliquer le promo
    let promoDiscount = 0;
    let promoCodeId: string | undefined;
    if (dto.promoCode) {
      const fareRule = await this.pricing.getApplicableRule(dto.vehicleTypeId, dto.countryCode);
      const tempFare = await this.pricing.calculateFare({
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        vehicleTypeId: dto.vehicleTypeId,
        countryCode: dto.countryCode,
        currencyCode: dto.currencyCode as CurrencyCode,
      });

      const promo = await this.pricing.applyPromoCode(
        dto.promoCode,
        user.id,
        dto.vehicleTypeId,
        dto.countryCode,
        tempFare.total,
        dto.currencyCode as CurrencyCode,
      );
      promoDiscount = promo.discountAmount;
      promoCodeId = promo.promoCodeId;
    }

    // Surge
    const surgeMultiplier = await this.getSurgeMultiplier(
      dto.pickupLat, dto.pickupLng, dto.countryCode,
    );

    // Fare final estimé
    const fareBreakdown = await this.pricing.calculateFare({
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      vehicleTypeId: dto.vehicleTypeId,
      countryCode: dto.countryCode,
      surgeMultiplier,
      promoDiscountAmount: promoDiscount,
      currencyCode: dto.currencyCode as CurrencyCode,
    });

    // Créer la course en base
    const ride = await this.prisma.$transaction(async (tx) => {
      const newRide = await tx.ride.create({
        data: {
          clientId: user.id,
          vehicleTypeId: dto.vehicleTypeId,
          serviceType: dto.serviceType as any,
          status: RideStatus.CREATED,
          pickupLat: dto.pickupLat,
          pickupLng: dto.pickupLng,
          pickupAddress: dto.pickupAddress,
          dropoffLat: dto.dropoffLat,
          dropoffLng: dto.dropoffLng,
          dropoffAddress: dto.dropoffAddress,
          routePolyline: route.polyline,
          distanceKm: route.distanceKm,
          durationMinutes: route.durationMinutes,
          estimatedFare: fareBreakdown.total,
          surgeMultiplier,
          promoCodeId,
          paymentMethod: dto.paymentMethod as any,
          currencyCode: dto.currencyCode,
          countryCode: dto.countryCode,
          clientNotes: dto.notes,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        },
      });

      await tx.rideStatusHistory.create({
        data: { rideId: newRide.id, status: RideStatus.CREATED, changedBy: user.id },
      });

      return newRide;
    });

    this.logger.log(`Course créée: ${ride.id} par client ${user.id}`);

    // Démarrer le dispatch (async)
    if (!dto.scheduledAt) {
      setImmediate(() => this.dispatch.startDispatch(ride));
    }

    return { success: true, data: { ride, fareBreakdown } };
  }

  // ─── Récupérer une course ─────────────────────────────────────────────────

  async getRide(rideId: string, user: User) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true } },
        driver: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true } },
            vehicle: { include: { vehicleType: true } },
          },
        },
        vehicleType: true,
        payment: true,
        ratings: true,
      },
    });

    if (!ride) throw new NotFoundException('Course introuvable');

    // Vérifier l'accès
    if (user.role === 'CLIENT' && ride.clientId !== user.id) {
      throw new ForbiddenException('Accès non autorisé');
    }
    if (user.role === 'CHAUFFEUR') {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
      if (!driver || ride.driverId !== driver.id) {
        throw new ForbiddenException('Accès non autorisé');
      }
    }

    return { success: true, data: ride };
  }

  // ─── Historique ───────────────────────────────────────────────────────────

  async getRideHistory(user: User, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = user.role === 'CLIENT'
      ? { clientId: user.id }
      : { driver: { userId: user.id } };

    const [rides, total] = await Promise.all([
      this.prisma.ride.findMany({
        where: { ...where, status: { in: ['COMPLETED', 'CANCELLED', 'PAYMENT_CONFIRMED'] as any } },
        include: {
          vehicleType: true,
          payment: { select: { amount: true, status: true, method: true } },
          ratings: { where: { raterId: user.id } },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ride.count({ where }),
    ]);

    return {
      success: true,
      data: rides,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // ─── Annuler une course ───────────────────────────────────────────────────

  async cancelRide(rideId: string, user: User, reason: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driver: { include: { user: { include: { devices: { where: { isActive: true } } } } } },
        client: { include: { devices: { where: { isActive: true } } } },
      },
    });

    if (!ride) throw new NotFoundException('Course introuvable');
    if (TERMINAL_RIDE_STATUSES.includes(ride.status as any)) {
      throw new BadRequestException('Course déjà terminée');
    }

    // Vérifier droits d'annulation
    let cancellationFee = 0;
    if (user.role === 'CLIENT' && ride.clientId !== user.id) {
      throw new ForbiddenException('Accès non autorisé');
    }
    if (user.role === 'CHAUFFEUR') {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
      if (!driver || ride.driverId !== driver.id) {
        throw new ForbiddenException('Accès non autorisé');
      }
    }

    // Frais d'annulation si chauffeur déjà accepté et grace period écoulée
    if (
      user.role === 'CLIENT' &&
      ride.acceptedAt &&
      ride.status === RideStatus.DRIVER_EN_ROUTE
    ) {
      const rule = await this.pricing.getApplicableRule(ride.vehicleTypeId, ride.countryCode);
      const minutesSinceAccepted = (Date.now() - ride.acceptedAt.getTime()) / 60000;
      if (minutesSinceAccepted > Number(rule.cancellationGraceMinutes)) {
        cancellationFee = Number(rule.cancellationFee);
      }
    }

    const updatedRide = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ride.update({
        where: { id: rideId },
        data: {
          status: RideStatus.CANCELLED,
          cancelledBy: user.id,
          cancelReason: reason,
          cancellationFee,
          cancelledAt: new Date(),
        },
      });

      await tx.rideStatusHistory.create({
        data: {
          rideId,
          status: RideStatus.CANCELLED,
          changedBy: user.id,
          metadata: { reason, fee: cancellationFee },
        },
      });

      return updated;
    });

    // Nettoyer le dispatch
    await this.redis.delDispatchState(rideId);

    // Notifier l'autre partie
    if (user.role === 'CLIENT' && ride.driverId) {
      this.driverGateway.sendEvent(ride.driverId, SOCKET_EVENTS.RIDE_CANCELLED, {
        rideId,
        reason,
        cancelledBy: 'client',
      });
      const driverFcms = ride.driver?.user?.devices?.map((d: any) => d.fcmToken) || [];
      if (driverFcms.length > 0) {
        await this.notifications.sendPushToTokens(driverFcms, {
          title: '❌ Course annulée',
          body: `Le client a annulé la course`,
          data: { type: 'RIDE_CANCELLED', rideId },
        });
      }
    }

    if (user.role === 'CHAUFFEUR') {
      this.clientGateway.sendEvent(ride.clientId, SOCKET_EVENTS.RIDE_CANCELLED, {
        rideId,
        reason,
        cancelledBy: 'driver',
      });
    }

    return { success: true, data: updatedRide, cancellationFee };
  }

  // ─── Notation ─────────────────────────────────────────────────────────────

  async rateRide(rideId: string, user: User, score: number, comment?: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { driver: true },
    });

    if (!ride) throw new NotFoundException('Course introuvable');
    if (ride.clientId !== user.id) throw new ForbiddenException();
    if (!['COMPLETED', 'PAYMENT_CONFIRMED'].includes(ride.status)) {
      throw new BadRequestException('Course non terminée');
    }

    const existingRating = await this.prisma.rating.findFirst({
      where: { rideId, raterId: user.id },
    });
    if (existingRating) throw new BadRequestException('Déjà noté');

    if (!ride.driverId) throw new BadRequestException('Pas de chauffeur assigné');

    const rating = await this.prisma.$transaction(async (tx) => {
      const newRating = await tx.rating.create({
        data: {
          rideId,
          raterId: user.id,
          rateeId: ride.driverId!,
          score,
          comment,
        },
      });

      // Mettre à jour la moyenne du chauffeur
      const stats = await tx.rating.aggregate({
        where: { rateeId: ride.driverId! },
        _avg: { score: true },
        _count: true,
      });

      await tx.driver.update({
        where: { id: ride.driverId! },
        data: {
          ratingAvg: stats._avg.score || score,
        },
      });

      return newRating;
    });

    return { success: true, data: rating };
  }

  // ─── Suivi en temps réel ──────────────────────────────────────────────────

  async getDriverTracking(rideId: string, user: User) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride || ride.clientId !== user.id) throw new ForbiddenException();
    if (!ride.driverId) throw new BadRequestException('Pas de chauffeur assigné');

    const location = await this.redis.getDriverLocation(ride.driverId);
    return { success: true, data: location };
  }

  // ─── Reçu ─────────────────────────────────────────────────────────────────

  async getRideReceipt(rideId: string, user: User) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        client: true,
        driver: { include: { user: true, vehicle: true } },
        vehicleType: true,
        payment: true,
      },
    });

    if (!ride) throw new NotFoundException();
    if (ride.clientId !== user.id && ride.role !== 'ADMIN') throw new ForbiddenException();

    return { success: true, data: ride };
  }

  // ─── Helper: Surge multiplier ─────────────────────────────────────────────

  private async getSurgeMultiplier(
    lat: number,
    lng: number,
    countryCode: string,
  ): Promise<number> {
    // Vérifier les paramètres globaux
    const surgeSetting = await this.prisma.setting.findUnique({
      where: { key: `${countryCode.replace('+', '')}.surge.enabled` },
    });
    if (!surgeSetting?.value) return 1;

    // TODO: Calculer le surge basé sur la demande (rides en attente vs chauffeurs en ligne)
    return 1; // Pour l'instant, désactivé par défaut
  }
}
