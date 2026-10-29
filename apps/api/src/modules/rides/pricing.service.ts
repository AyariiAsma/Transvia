import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FareBreakdown, CurrencyCode } from '@logistic/shared';
import { Decimal } from '@prisma/client/runtime/library';

interface PricingParams {
  distanceKm: number;
  durationMinutes: number;
  vehicleTypeId: string;
  countryCode: string;
  zoneId?: string;
  surgeMultiplier?: number;
  promoCodeId?: string;
  promoDiscountAmount?: number;
  currencyCode: CurrencyCode;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère la règle tarifaire applicable (zone > pays > défaut)
   */
  async getApplicableRule(vehicleTypeId: string, countryCode: string, zoneId?: string) {
    // 1. Règle spécifique à la zone
    if (zoneId) {
      const zoneRule = await this.prisma.pricingRule.findFirst({
        where: {
          vehicleTypeId,
          countryCode,
          zoneId,
          isActive: true,
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (zoneRule) return zoneRule;
    }

    // 2. Règle du pays
    const countryRule = await this.prisma.pricingRule.findFirst({
      where: {
        vehicleTypeId,
        countryCode,
        zoneId: null,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!countryRule) {
      throw new BadRequestException(
        `Aucune règle tarifaire trouvée pour ${vehicleTypeId} - ${countryCode}`,
      );
    }

    return countryRule;
  }

  /**
   * Calcule le tarif complet d'une course
   */
  async calculateFare(params: PricingParams): Promise<FareBreakdown> {
    const {
      distanceKm,
      durationMinutes,
      vehicleTypeId,
      countryCode,
      zoneId,
      surgeMultiplier = 1,
      promoDiscountAmount = 0,
      currencyCode,
    } = params;

    const rule = await this.getApplicableRule(vehicleTypeId, countryCode, zoneId);

    const base = Number(rule.baseFare);
    const distanceCost = distanceKm * Number(rule.perKmRate);
    const timeCost = durationMinutes * Number(rule.perMinuteRate);
    const subtotal = base + distanceCost + timeCost;
    const minFare = Number(rule.minFare);

    // Appliquer le minimum
    const subtotalAfterMin = Math.max(subtotal, minFare);

    // Appliquer le surge
    const effectiveSurge = rule.surgeEnabled
      ? Math.min(surgeMultiplier, Number(rule.surgeMultiplierMax))
      : 1;
    const surgedAmount = subtotalAfterMin * effectiveSurge;
    const surgeAmount = surgedAmount - subtotalAfterMin;

    // Appliquer la promo
    const discount = Math.min(promoDiscountAmount, surgedAmount - minFare);
    const afterDiscount = Math.max(surgedAmount - Math.max(discount, 0), minFare);

    // Arrondir à 3 décimales (TND/DZD/MAD)
    const total = Math.round(afterDiscount * 1000) / 1000;
    const platformCommission = Math.round(total * Number(rule.platformCommissionPct) * 1000) / 1000;
    const driverEarnings = Math.round((total - platformCommission) * 1000) / 1000;

    this.logger.debug(
      `Fare calc: dist=${distanceKm}km, dur=${durationMinutes}min, surge=${effectiveSurge}, ` +
      `discount=${discount}, total=${total} ${currencyCode}`,
    );

    return {
      base,
      distanceCost: Math.round(distanceCost * 1000) / 1000,
      timeCost: Math.round(timeCost * 1000) / 1000,
      subtotal: Math.round(subtotalAfterMin * 1000) / 1000,
      surgeMultiplier: effectiveSurge,
      surgeAmount: Math.round(surgeAmount * 1000) / 1000,
      discount: Math.round(discount * 1000) / 1000,
      total,
      platformCommission,
      driverEarnings,
      currency: currencyCode,
    };
  }

  /**
   * Vérifie et calcule la remise d'un code promo
   */
  async applyPromoCode(
    code: string,
    userId: string,
    vehicleTypeId: string,
    countryCode: string,
    estimatedFare: number,
    currencyCode: CurrencyCode,
  ): Promise<{ discountAmount: number; promoCodeId: string }> {
    const promo = await this.prisma.promoCode.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        countryCodes: { has: countryCode },
      },
    });

    if (!promo) throw new BadRequestException('Code promo invalide ou expiré');

    // Vérifier la limite globale
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestException('Code promo épuisé');
    }

    // Vérifier la limite par utilisateur
    const userUsageCount = await this.prisma.ride.count({
      where: { clientId: userId, promoCodeId: promo.id, status: 'COMPLETED' },
    });
    if (userUsageCount >= promo.userLimitPerCode) {
      throw new BadRequestException('Vous avez déjà utilisé ce code promo');
    }

    // Vérifier le type de véhicule
    if (promo.vehicleTypes?.length > 0) {
      const typeAllowed = promo.vehicleTypes.some((vt: any) => vt.vehicleTypeId === vehicleTypeId);
      if (!typeAllowed) throw new BadRequestException('Code promo non valide pour ce type de véhicule');
    }

    // Vérifier le minimum de fare
    if (promo.minFare && estimatedFare < Number(promo.minFare)) {
      throw new BadRequestException(
        `Montant minimum requis: ${Number(promo.minFare)} ${currencyCode}`,
      );
    }

    // Calculer la remise
    let discountAmount: number;
    if (promo.type === 'PERCENTAGE') {
      discountAmount = estimatedFare * (Number(promo.value) / 100);
    } else {
      discountAmount = Number(promo.value);
    }

    // Appliquer le plafond de réduction
    if (promo.maxDiscount) {
      discountAmount = Math.min(discountAmount, Number(promo.maxDiscount));
    }

    return { discountAmount, promoCodeId: promo.id };
  }

  /**
   * Calcule la durée et distance via OSRM
   */
  async getRouteInfo(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
  ): Promise<{ distanceKm: number; durationMinutes: number; polyline: string }> {
    // Implémenté dans GeoService — appelé ici pour la lisibilité
    throw new Error('Use GeoService.getRoute() instead');
  }
}
