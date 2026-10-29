import { Test } from '@nestjs/testing';
import { PricingService } from '../../../src/modules/rides/pricing.service';
import { PrismaService } from '../../../src/modules/prisma/prisma.service';

const mockRule = {
  id: 'rule-1',
  baseFare: 2.5,
  perKmRate: 0.8,
  perMinuteRate: 0.05,
  minFare: 3.0,
  surgeEnabled: true,
  surgeMultiplierMax: 3.0,
  platformCommissionPct: 0.15,
  cancellationFee: 2.0,
  cancellationGraceMinutes: 5,
};

const mockPrisma = {
  pricingRule: {
    findFirst: jest.fn().mockResolvedValue(mockRule),
  },
  promoCode: { findFirst: jest.fn() },
  ride: { count: jest.fn().mockResolvedValue(0) },
};

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  describe('calculateFare', () => {
    it('devrait calculer correctement un tarif de base', async () => {
      const fare = await service.calculateFare({
        distanceKm: 5,
        durationMinutes: 10,
        vehicleTypeId: 'vtc-standard',
        countryCode: '+216',
        currencyCode: 'TND',
      });

      // base=2.5 + dist=4 (5km*0.8) + time=0.5 (10min*0.05) = 7.0
      expect(fare.base).toBe(2.5);
      expect(fare.distanceCost).toBe(4.0);
      expect(fare.timeCost).toBe(0.5);
      expect(fare.total).toBe(7.0);
      expect(fare.currency).toBe('TND');
    });

    it('devrait appliquer le minimum de fare', async () => {
      const fare = await service.calculateFare({
        distanceKm: 0.5,
        durationMinutes: 2,
        vehicleTypeId: 'vtc-standard',
        countryCode: '+216',
        currencyCode: 'TND',
      });

      // Calculé: 2.5 + 0.4 + 0.1 = 3.0 (exactement le minimum)
      expect(fare.total).toBeGreaterThanOrEqual(3.0);
    });

    it('devrait appliquer le multiplicateur de surge', async () => {
      const fareNormal = await service.calculateFare({
        distanceKm: 5, durationMinutes: 10,
        vehicleTypeId: 'vtc-standard', countryCode: '+216', currencyCode: 'TND',
      });

      const fareSurge = await service.calculateFare({
        distanceKm: 5, durationMinutes: 10,
        vehicleTypeId: 'vtc-standard', countryCode: '+216', currencyCode: 'TND',
        surgeMultiplier: 1.5,
      });

      expect(fareSurge.total).toBeGreaterThan(fareNormal.total);
      expect(fareSurge.surgeMultiplier).toBe(1.5);
    });

    it('devrait plafonner le surge au maximum autorisé', async () => {
      const fare = await service.calculateFare({
        distanceKm: 5, durationMinutes: 10,
        vehicleTypeId: 'vtc-standard', countryCode: '+216', currencyCode: 'TND',
        surgeMultiplier: 10, // > max de 3.0
      });

      expect(fare.surgeMultiplier).toBe(3.0);
    });

    it('devrait déduire la remise promo', async () => {
      const fareWithPromo = await service.calculateFare({
        distanceKm: 10, durationMinutes: 20,
        vehicleTypeId: 'vtc-standard', countryCode: '+216', currencyCode: 'TND',
        promoDiscountAmount: 3.0,
      });

      const fareWithout = await service.calculateFare({
        distanceKm: 10, durationMinutes: 20,
        vehicleTypeId: 'vtc-standard', countryCode: '+216', currencyCode: 'TND',
      });

      expect(fareWithPromo.total).toBeLessThan(fareWithout.total);
      expect(fareWithout.total - fareWithPromo.total).toBe(fareWithPromo.discount);
    });

    it('devrait calculer correctement la commission et les gains chauffeur', async () => {
      const fare = await service.calculateFare({
        distanceKm: 10, durationMinutes: 20,
        vehicleTypeId: 'vtc-standard', countryCode: '+216', currencyCode: 'TND',
      });

      const expectedCommission = Math.round(fare.total * 0.15 * 1000) / 1000;
      expect(fare.platformCommission).toBeCloseTo(expectedCommission, 2);
      expect(fare.driverEarnings).toBeCloseTo(fare.total - fare.platformCommission, 2);
      expect(fare.platformCommission + fare.driverEarnings).toBeCloseTo(fare.total, 2);
    });
  });
});
