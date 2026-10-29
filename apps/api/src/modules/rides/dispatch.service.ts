import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ClientGateway } from '../websocket/gateways/client.gateway';
import { DriverGateway } from '../websocket/gateways/driver.gateway';
import {
  RideStatus,
  DISPATCH_CONFIG,
  SOCKET_EVENTS,
  QUEUE_NAMES,
} from '@logistic/shared';
import { Ride, Driver } from '@prisma/client';

interface DispatchAttempt {
  rideId: string;
  radiusM: number;
  attemptIndex: number;
  excludeDriverIds: string[];
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly clientGateway: ClientGateway,
    private readonly driverGateway: DriverGateway,
    @InjectQueue(QUEUE_NAMES.DISPATCH) private readonly dispatchQueue: Queue,
  ) {}

  /**
   * Démarre le processus de dispatch pour une course
   */
  async startDispatch(ride: Ride): Promise<void> {
    this.logger.log(`🚀 Dispatch démarré pour ride ${ride.id}`);

    // Mettre la course en statut SEARCHING
    await this.prisma.ride.update({
      where: { id: ride.id },
      data: { status: RideStatus.SEARCHING },
    });

    await this.prisma.rideStatusHistory.create({
      data: { rideId: ride.id, status: RideStatus.SEARCHING },
    });

    // Initialiser l'état du dispatch dans Redis
    await this.redis.setDispatchState(ride.id, {
      attempt: 0,
      excludedDrivers: [],
      radiusM: DISPATCH_CONFIG.INITIAL_RADIUS_M,
      startedAt: Date.now(),
    });

    // Lancer la première tentative
    await this.attemptDispatch({
      rideId: ride.id,
      radiusM: DISPATCH_CONFIG.INITIAL_RADIUS_M,
      attemptIndex: 0,
      excludeDriverIds: [],
    });
  }

  /**
   * Tente d'attribuer la course à un chauffeur disponible
   */
  async attemptDispatch(attempt: DispatchAttempt): Promise<void> {
    const { rideId, radiusM, attemptIndex, excludeDriverIds } = attempt;

    // Vérifier que la course est encore en attente
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride || ride.status !== RideStatus.SEARCHING) {
      this.logger.log(`Dispatch annulé pour ride ${rideId} (statut: ${ride?.status})`);
      return;
    }

    this.logger.log(
      `Dispatch attempt #${attemptIndex} pour ride ${rideId} — rayon: ${radiusM}m`,
    );

    // 1. Trouver les chauffeurs dans le rayon (PostGIS)
    const nearbyDriverIds = await this.redis.getNearbyDriverIds(
      ride.pickupLat,
      ride.pickupLng,
      radiusM,
      DISPATCH_CONFIG.MAX_DRIVERS_PER_ATTEMPT,
    );

    // Filtrer les exclus
    const eligibleIds = nearbyDriverIds.filter((id) => !excludeDriverIds.includes(id));

    if (eligibleIds.length === 0) {
      // Augmenter le rayon ou déclarer NO_DRIVER
      if (radiusM >= DISPATCH_CONFIG.MAX_RADIUS_M) {
        await this.handleNoDriver(rideId);
        return;
      }

      // Augmenter le rayon et réessayer
      const newRadius = Math.min(
        radiusM + DISPATCH_CONFIG.RADIUS_STEP_M,
        DISPATCH_CONFIG.MAX_RADIUS_M,
      );

      this.logger.log(`Aucun chauffeur à ${radiusM}m — agrandissement à ${newRadius}m`);

      // Job delayed de 3 secondes
      await this.dispatchQueue.add(
        'attempt',
        { rideId, radiusM: newRadius, attemptIndex: attemptIndex + 1, excludeDriverIds },
        { delay: 3000 },
      );
      return;
    }

    // 2. Valider les chauffeurs (statut APPROVED en base)
    const eligibleDrivers = await this.prisma.driver.findMany({
      where: {
        id: { in: eligibleIds },
        status: 'APPROVED',
        isOnline: true,
      },
      include: {
        user: {
          include: { devices: { where: { isActive: true } } },
        },
        vehicle: { include: { vehicleType: true } },
      },
    });

    if (eligibleDrivers.length === 0) {
      await this.dispatchQueue.add(
        'attempt',
        {
          rideId,
          radiusM: Math.min(radiusM + DISPATCH_CONFIG.RADIUS_STEP_M, DISPATCH_CONFIG.MAX_RADIUS_M),
          attemptIndex: attemptIndex + 1,
          excludeDriverIds,
        },
        { delay: 3000 },
      );
      return;
    }

    // 3. Offrir la course au premier chauffeur disponible
    const driver = eligibleDrivers[0];
    await this.offerRideToDriver(ride, driver, attempt);
  }

  /**
   * Envoie une proposition de course à un chauffeur
   */
  private async offerRideToDriver(
    ride: Ride,
    driver: any,
    attempt: DispatchAttempt,
  ): Promise<void> {
    const timeout = DISPATCH_CONFIG.DRIVER_TIMEOUT_S;

    this.logger.log(`Offre envoyée au chauffeur ${driver.id} pour ride ${ride.id}`);

    // Calculer la distance du pickup
    const driverLocation = await this.redis.getDriverLocation(driver.id);
    const pickupDistanceKm = driverLocation
      ? this.calculateDistance(
          driverLocation.lat,
          driverLocation.lng,
          ride.pickupLat,
          ride.pickupLng,
        )
      : 0;

    const rideRequestPayload = {
      ride: {
        id: ride.id,
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress,
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        dropoffLat: ride.dropoffLat,
        dropoffLng: ride.dropoffLng,
        estimatedFare: ride.estimatedFare,
        currencyCode: ride.currencyCode,
        serviceType: ride.serviceType,
        paymentMethod: ride.paymentMethod,
      },
      pickupDistanceKm: Math.round(pickupDistanceKm * 10) / 10,
      estimatedPickupMinutes: Math.round((pickupDistanceKm / 30) * 60), // 30 km/h moyen
      timeoutSeconds: timeout,
    };

    // Envoyer via WebSocket
    this.driverGateway.sendRideRequest(driver.id, rideRequestPayload);

    // Envoyer push FCM
    const fcmTokens = driver.user.devices.map((d: any) => d.fcmToken);
    if (fcmTokens.length > 0) {
      await this.notifications.sendPushToTokens(fcmTokens, {
        title: '🚗 Nouvelle demande de course',
        body: `${ride.pickupAddress} → ${ride.dropoffAddress}`,
        data: {
          type: 'RIDE_REQUEST',
          rideId: ride.id,
        },
      });
    }

    // Stocker l'offre en cours dans Redis
    await this.redis.set(
      `offer:${ride.id}:${driver.id}`,
      { offeredAt: Date.now() },
      timeout + 5,
    );

    // Job de timeout si le chauffeur ne répond pas
    await this.dispatchQueue.add(
      'driver_timeout',
      {
        rideId: ride.id,
        driverId: driver.id,
        attempt,
      },
      { delay: timeout * 1000 },
    );
  }

  /**
   * Appelé quand un chauffeur accepte
   */
  async acceptRide(rideId: string, driverId: string): Promise<Ride> {
    // Vérifier que l'offre est encore valide
    const offer = await this.redis.get(`offer:${rideId}:${driverId}`);
    if (!offer) {
      throw new BadRequestException('L\'offre a expiré ou n\'existe plus');
    }

    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride || ride.status !== RideStatus.SEARCHING) {
      throw new BadRequestException('Course non disponible');
    }

    // Nettoyer l'offre
    await this.redis.del(`offer:${rideId}:${driverId}`);

    // Mettre à jour la course
    const updatedRide = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ride.update({
        where: { id: rideId },
        data: {
          driverId,
          status: RideStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: {
          client: true,
          driver: {
            include: {
              user: true,
              vehicle: { include: { vehicleType: true } },
            },
          },
        },
      });

      await tx.rideStatusHistory.create({
        data: { rideId, status: RideStatus.ACCEPTED, changedBy: driverId },
      });

      return updated;
    });

    // Nettoyer le dispatch state
    await this.redis.delDispatchState(rideId);

    // Notifier le client
    const driverLocation = await this.redis.getDriverLocation(driverId);
    this.clientGateway.notifyRideAccepted(updatedRide.clientId, {
      ride: updatedRide,
      driver: {
        id: updatedRide.driver!.id,
        ratingAvg: updatedRide.driver!.ratingAvg,
        user: {
          firstName: updatedRide.driver!.user.firstName,
          lastName: updatedRide.driver!.user.lastName,
          avatarUrl: updatedRide.driver!.user.avatarUrl,
          phone: updatedRide.driver!.user.phone,
        },
        vehicle: updatedRide.driver!.vehicle,
      },
      eta: driverLocation ? Math.round(
        (this.calculateDistance(
          driverLocation.lat,
          driverLocation.lng,
          updatedRide.pickupLat,
          updatedRide.pickupLng,
        ) / 30) * 60,
      ) : 5,
    });

    // Notifier le client par push
    const clientDevices = await this.prisma.device.findMany({
      where: { userId: updatedRide.clientId, isActive: true },
    });
    if (clientDevices.length > 0) {
      await this.notifications.sendPushToTokens(
        clientDevices.map((d) => d.fcmToken),
        {
          title: '✅ Chauffeur trouvé !',
          body: `${updatedRide.driver!.user.firstName} arrive dans quelques minutes`,
          data: { type: 'RIDE_ACCEPTED', rideId },
        },
      );
    }

    this.logger.log(`✅ Course ${rideId} acceptée par chauffeur ${driverId}`);
    return updatedRide;
  }

  /**
   * Appelé quand un chauffeur refuse ou timeout
   */
  async handleDriverTimeout(rideId: string, driverId: string, attempt: DispatchAttempt): Promise<void> {
    // Vérifier que l'offre n'a pas déjà été acceptée
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride || ride.status !== RideStatus.SEARCHING) return;

    await this.redis.del(`offer:${rideId}:${driverId}`);

    this.logger.warn(`⏱️ Timeout chauffeur ${driverId} pour ride ${rideId}`);

    // Notifier le chauffeur
    this.driverGateway.sendEvent(driverId, SOCKET_EVENTS.RIDE_REQUEST_TIMEOUT, { rideId });

    // Passer au chauffeur suivant
    const newExcluded = [...attempt.excludeDriverIds, driverId];

    await this.attemptDispatch({
      rideId,
      radiusM: attempt.radiusM,
      attemptIndex: attempt.attemptIndex + 1,
      excludeDriverIds: newExcluded,
    });
  }

  /**
   * Aucun chauffeur disponible
   */
  private async handleNoDriver(rideId: string): Promise<void> {
    this.logger.warn(`❌ Aucun chauffeur pour ride ${rideId}`);

    await this.prisma.$transaction(async (tx) => {
      await tx.ride.update({
        where: { id: rideId },
        data: { status: RideStatus.NO_DRIVER },
      });
      await tx.rideStatusHistory.create({
        data: { rideId, status: RideStatus.NO_DRIVER },
      });
    });

    // Récupérer le clientId
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        client: { include: { devices: { where: { isActive: true } } } },
      },
    });

    if (ride) {
      this.clientGateway.sendEvent(ride.clientId, SOCKET_EVENTS.RIDE_NO_DRIVER, { rideId });

      if (ride.client?.devices?.length > 0) {
        await this.notifications.sendPushToTokens(
          ride.client.devices.map((d: any) => d.fcmToken),
          {
            title: '😔 Aucun chauffeur disponible',
            body: 'Veuillez réessayer dans quelques minutes',
            data: { type: 'RIDE_NO_DRIVER', rideId },
          },
        );
      }
    }

    await this.redis.delDispatchState(rideId);
  }

  /**
   * Calcul Haversine distance (km)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
