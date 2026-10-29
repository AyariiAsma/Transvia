/**
 * Prisma Seed — Données de démonstration pour LogisticApp
 * Exécuter: npm run db:seed (dans apps/api)
 */
import { PrismaClient, UserRole, DriverStatus, DocumentStatus, Language } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed LogisticApp...');

  // ─── Types de véhicules ─────────────────────────────────────────────────
  const economique = await prisma.vehicleType.upsert({
    where: { id: 'vt-eco-0000-0000-0000-000000000001' },
    create: {
      id: 'vt-eco-0000-0000-0000-000000000001',
      name: 'Économique',
      baseFare: 2.5,
      perKmRate: 0.8,
      perMinuteRate: 0.1,
      minFare: 3.5,
      maxPassengers: 4,
      serviceType: 'RIDE',
      isActive: true,
    },
    update: {},
  });

  const confort = await prisma.vehicleType.upsert({
    where: { id: 'vt-conf-0000-0000-0000-000000000002' },
    create: {
      id: 'vt-conf-0000-0000-0000-000000000002',
      name: 'Confort',
      baseFare: 4.0,
      perKmRate: 1.2,
      perMinuteRate: 0.15,
      minFare: 6.0,
      maxPassengers: 4,
      serviceType: 'RIDE',
      isActive: true,
    },
    update: {},
  });

  const livraison = await prisma.vehicleType.upsert({
    where: { id: 'vt-liv-0000-0000-0000-000000000003' },
    create: {
      id: 'vt-liv-0000-0000-0000-000000000003',
      name: 'Livraison',
      baseFare: 3.0,
      perKmRate: 1.0,
      perMinuteRate: 0.1,
      minFare: 4.5,
      maxPassengers: 0,
      serviceType: 'DELIVERY',
      isActive: true,
    },
    update: {},
  });

  console.log('✅ Types de véhicules créés');

  // ─── Règles tarifaires par pays ─────────────────────────────────────────
  const adminUserId = 'admin-0000-0000-0000-000000000001';

  // Tunisie — TND
  await prisma.pricingRule.upsert({
    where: { id: 'pr-tn-eco-000000000001' },
    create: {
      id: 'pr-tn-eco-000000000001',
      vehicleTypeId: economique.id,
      countryCode: '+216',
      baseFare: 2.5,
      perKmRate: 0.8,
      perMinuteRate: 0.1,
      minFare: 3.5,
      platformCommissionPct: 0.15,
      surgeEnabled: false,
      surgeMultiplierMax: 2.0,
      cancellationFee: 1.5,
      cancellationGraceMinutes: 3,
      effectiveFrom: new Date('2024-01-01'),
    },
    update: {},
  });

  // Algérie — DZD
  await prisma.pricingRule.upsert({
    where: { id: 'pr-dz-eco-000000000001' },
    create: {
      id: 'pr-dz-eco-000000000001',
      vehicleTypeId: economique.id,
      countryCode: '+213',
      baseFare: 200,
      perKmRate: 70,
      perMinuteRate: 8,
      minFare: 300,
      platformCommissionPct: 0.15,
      surgeEnabled: false,
      surgeMultiplierMax: 2.0,
      cancellationFee: 100,
      cancellationGraceMinutes: 3,
      effectiveFrom: new Date('2024-01-01'),
    },
    update: {},
  });

  // Maroc — MAD
  await prisma.pricingRule.upsert({
    where: { id: 'pr-ma-eco-000000000001' },
    create: {
      id: 'pr-ma-eco-000000000001',
      vehicleTypeId: economique.id,
      countryCode: '+212',
      baseFare: 8,
      perKmRate: 3,
      perMinuteRate: 0.5,
      minFare: 15,
      platformCommissionPct: 0.15,
      surgeEnabled: false,
      surgeMultiplierMax: 2.0,
      cancellationFee: 5,
      cancellationGraceMinutes: 3,
      effectiveFrom: new Date('2024-01-01'),
    },
    update: {},
  });

  console.log('✅ Règles tarifaires créées (TN, DZ, MA)');

  // ─── Super Admin ────────────────────────────────────────────────────────
  const superAdminHash = await argon2.hash('Admin@2024!');
  const superAdmin = await prisma.user.upsert({
    where: { id: adminUserId },
    create: {
      id: adminUserId,
      phone: '+21698000001',
      email: 'admin@logisticapp.com',
      passwordHash: superAdminHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      countryCode: '+216',
      language: Language.fr,
      isVerifiedPhone: true,
      isVerifiedEmail: true,
    },
    update: {},
  });

  await prisma.adminRole.upsert({
    where: { userId: superAdmin.id },
    create: {
      userId: superAdmin.id,
      subRole: 'SUPER_ADMIN',
      permissions: {
        users: true,
        drivers: true,
        rides: true,
        pricing: true,
        payments: true,
        finance: true,
        notifications: true,
        support: true,
        settings: true,
        admins: true,
      },
      countryScope: [],
    },
    update: {},
  });

  // ─── Client demo ────────────────────────────────────────────────────────
  const clientHash = await argon2.hash('Client@2024!');
  const client = await prisma.user.upsert({
    where: { phone: '+21650000001' },
    create: {
      phone: '+21650000001',
      email: 'client@demo.com',
      passwordHash: clientHash,
      firstName: 'Ahmed',
      lastName: 'Ben Salah',
      role: UserRole.CLIENT,
      countryCode: '+216',
      language: Language.fr,
      isVerifiedPhone: true,
      isVerifiedEmail: true,
    },
    update: {},
  });

  await prisma.clientProfile.upsert({
    where: { userId: client.id },
    create: {
      userId: client.id,
      homeAddress: {
        formatted: 'Rue de la Liberté, Tunis',
        lat: 36.8065,
        lng: 10.1815,
      },
    },
    update: {},
  });

  await prisma.wallet.upsert({
    where: { userId: client.id },
    create: {
      userId: client.id,
      balance: 50.0,
      currency: 'TND',
    },
    update: {},
  });

  // ─── Chauffeur demo ─────────────────────────────────────────────────────
  const driverHash = await argon2.hash('Driver@2024!');
  const driverUser = await prisma.user.upsert({
    where: { phone: '+21655000001' },
    create: {
      phone: '+21655000001',
      email: 'driver@demo.com',
      passwordHash: driverHash,
      firstName: 'Karim',
      lastName: 'Trabelsi',
      role: UserRole.CHAUFFEUR,
      countryCode: '+216',
      language: Language.fr,
      isVerifiedPhone: true,
      isVerifiedEmail: true,
    },
    update: {},
  });

  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    create: {
      userId: driverUser.id,
      licenseNumber: 'TN-123456',
      licenseExpiry: new Date('2026-12-31'),
      status: DriverStatus.APPROVED,
      ratingAvg: 4.8,
      totalRides: 245,
      isOnline: false,
      earningsTotal: 12500.5,
    },
    update: {},
  });

  await prisma.vehicle.upsert({
    where: { driverId: driver.id },
    create: {
      driverId: driver.id,
      typeId: economique.id,
      make: 'Volkswagen',
      model: 'Polo',
      year: 2020,
      plateNumber: '123 TN 4567',
      color: 'Blanc',
      isActive: true,
    },
    update: {},
  });

  // Documents approuvés
  const docTypes = ['LICENSE', 'REGISTRATION', 'INSURANCE', 'NATIONAL_ID', 'PHOTO'];
  for (const type of docTypes) {
    const existing = await prisma.driverDocument.findFirst({
      where: { driverId: driver.id, type: type as any },
    });
    if (!existing) {
      await prisma.driverDocument.create({
        data: {
          driverId: driver.id,
          type: type as any,
          cloudinaryUrl: `https://res.cloudinary.com/demo/image/upload/sample.jpg`,
          status: DocumentStatus.APPROVED,
          verifiedBy: adminUserId,
          verifiedAt: new Date(),
        },
      });
    }
  }

  await prisma.wallet.upsert({
    where: { userId: driverUser.id },
    create: {
      userId: driverUser.id,
      balance: 350.0,
      currency: 'TND',
    },
    update: {},
  });

  console.log('✅ Utilisateurs demo créés (admin, client, chauffeur)');

  // ─── Code promo demo ────────────────────────────────────────────────────
  await prisma.promoCode.upsert({
    where: { code: 'WELCOME20' },
    create: {
      code: 'WELCOME20',
      type: 'PERCENTAGE',
      value: 20,
      maxDiscount: 5.0,
      currency: 'TND',
      usageLimit: 1000,
      userLimitPerCode: 1,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 jours
      countryCodes: ['+216', '+213', '+212'],
      isActive: true,
      createdBy: adminUserId,
    },
    update: {},
  });

  // ─── Paramètres généraux ────────────────────────────────────────────────
  const settings = [
    { key: 'app.maintenance_mode', value: false, category: 'system', description: 'Mode maintenance' },
    { key: 'app.max_cancellation_rate', value: 0.3, category: 'rides', description: 'Taux d\'annulation max avant suspension' },
    { key: 'app.min_driver_rating', value: 3.5, category: 'drivers', description: 'Note minimale chauffeur' },
    { key: 'tn.surge.enabled', value: false, category: 'pricing', description: 'Surge pricing Tunisie', countryCode: '+216' },
    { key: 'dz.surge.enabled', value: false, category: 'pricing', description: 'Surge pricing Algérie', countryCode: '+213' },
    { key: 'ma.surge.enabled', value: false, category: 'pricing', description: 'Surge pricing Maroc', countryCode: '+212' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: setting.value as any,
        description: setting.description,
        category: setting.category,
        countryCode: setting.countryCode,
        updatedBy: adminUserId,
      },
      update: {},
    });
  }

  console.log('✅ Paramètres système créés');
  console.log('');
  console.log('🎉 Seed terminé avec succès !');
  console.log('');
  console.log('Comptes de démonstration :');
  console.log('  Admin:    admin@logisticapp.com / Admin@2024!');
  console.log('  Client:   +21650000001 / Client@2024!');
  console.log('  Chauffeur: +21655000001 / Driver@2024!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
