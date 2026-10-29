import { z } from 'zod';
import { CurrencyCode, DocumentType, Language, PaymentMethod, ServiceType, UserRole } from '../types';

// ─── Auth Schemas ───────────────────────────────────────────────────────────

export const registerSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Numéro de téléphone invalide (format E.164)'),
  email: z.string().email('Email invalide').optional(),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  firstName: z.string().min(2).max(50).trim(),
  lastName: z.string().min(2).max(50).trim(),
  role: z.enum([UserRole.CLIENT, UserRole.CHAUFFEUR]),
  countryCode: z.string().regex(/^\+\d{1,4}$/),
  language: z.nativeEnum(Language).default(Language.FR),
});

export const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/).optional(),
  password: z.string().min(1),
}).refine((data) => data.email || data.phone, {
  message: 'Email ou numéro de téléphone requis',
});

export const otpSendSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
  code: z.string().length(6).regex(/^\d{6}$/),
  idToken: z.string().min(1), // Firebase ID token
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

// ─── User Schemas ───────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).trim().optional(),
  lastName: z.string().min(2).max(50).trim().optional(),
  language: z.nativeEnum(Language).optional(),
  avatarUrl: z.string().url().optional(),
});

export const addFavoriteAddressSchema = z.object({
  label: z.enum(['home', 'work', 'other']),
  formatted: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  placeId: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

// ─── Ride Schemas ───────────────────────────────────────────────────────────

export const fareEstimateSchema = z.object({
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  dropoffLat: z.number().min(-90).max(90),
  dropoffLng: z.number().min(-180).max(180),
  vehicleTypeId: z.string().uuid(),
  countryCode: z.string().min(2).max(4),
  promoCode: z.string().optional(),
});

export const createRideSchema = z.object({
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  pickupAddress: z.string().min(1).max(500),
  dropoffLat: z.number().min(-90).max(90),
  dropoffLng: z.number().min(-180).max(180),
  dropoffAddress: z.string().min(1).max(500),
  vehicleTypeId: z.string().uuid(),
  serviceType: z.nativeEnum(ServiceType),
  paymentMethod: z.nativeEnum(PaymentMethod),
  promoCode: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  countryCode: z.string().min(2).max(4),
  currencyCode: z.nativeEnum(CurrencyCode),
  notes: z.string().max(500).optional(),
});

export const cancelRideSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const rateRideSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// ─── Driver Schemas ─────────────────────────────────────────────────────────

export const driverRegisterSchema = z.object({
  licenseNumber: z.string().min(1).max(50).trim(),
  licenseExpiry: z.string().datetime(),
  vehicleMake: z.string().min(1).max(50),
  vehicleModel: z.string().min(1).max(50),
  vehicleYear: z.number().int().min(2000).max(new Date().getFullYear() + 1),
  vehiclePlate: z.string().min(1).max(20).trim().toUpperCase(),
  vehicleColor: z.string().min(1).max(30),
  vehicleTypeId: z.string().uuid(),
});

export const uploadDocumentSchema = z.object({
  type: z.nativeEnum(DocumentType),
  cloudinaryUrl: z.string().url(),
  cloudinaryPublicId: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
});

export const driverLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
});

// ─── Payment Schemas ────────────────────────────────────────────────────────

export const validatePromoSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  vehicleTypeId: z.string().uuid(),
  countryCode: z.string(),
  estimatedFare: z.number().positive(),
  currencyCode: z.nativeEnum(CurrencyCode),
});

export const walletTopupSchema = z.object({
  amount: z.number().positive().min(1),
  currencyCode: z.nativeEnum(CurrencyCode),
  paymentMethodId: z.string().min(1),
});

// ─── Admin Schemas ──────────────────────────────────────────────────────────

export const createVehicleTypeSchema = z.object({
  name: z.string().min(1).max(50),
  iconUrl: z.string().url().optional(),
  baseFare: z.number().positive(),
  perKmRate: z.number().positive(),
  perMinuteRate: z.number().nonnegative(),
  minFare: z.number().positive(),
  maxPassengers: z.number().int().positive().max(20),
  serviceType: z.nativeEnum(ServiceType),
});

export const createPricingRuleSchema = z.object({
  vehicleTypeId: z.string().uuid(),
  countryCode: z.string().min(2).max(4),
  zoneId: z.string().uuid().optional(),
  baseFare: z.number().positive(),
  perKmRate: z.number().positive(),
  perMinuteRate: z.number().nonnegative(),
  minFare: z.number().positive(),
  platformCommissionPct: z.number().min(0).max(1),
  surgeEnabled: z.boolean().default(false),
  surgeMultiplierMax: z.number().min(1).max(5).default(2),
  cancellationFee: z.number().nonnegative().default(0),
  cancellationGraceMinutes: z.number().int().nonnegative().default(3),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
});

export const createPromoCodeSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive(),
  minFare: z.number().positive().optional(),
  maxDiscount: z.number().positive().optional(),
  currency: z.nativeEnum(CurrencyCode).optional(),
  usageLimit: z.number().int().positive().optional(),
  userLimitPerCode: z.number().int().positive().default(1),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
  countryCodes: z.array(z.string()).min(1),
  vehicleTypeIds: z.array(z.string().uuid()).optional(),
});

export const sendNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  targetType: z.enum(['ALL', 'CLIENTS', 'DRIVERS', 'SPECIFIC_USERS']),
  userIds: z.array(z.string().uuid()).optional(),
  data: z.record(z.string()).optional(),
});

export const createZoneSchema = z.object({
  name: z.string().min(1).max(100),
  countryCode: z.string().min(2).max(4),
  boundary: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1),
  }),
  surgeActive: z.boolean().default(false),
  surgeMultiplier: z.number().min(1).max(5).default(1),
});

// ─── Device Schema ──────────────────────────────────────────────────────────

export const registerDeviceSchema = z.object({
  fcmToken: z.string().min(1),
  platform: z.enum(['IOS', 'ANDROID']),
  deviceId: z.string().min(1),
  appVersion: z.string().min(1),
});

// ─── Support Schema ─────────────────────────────────────────────────────────

export const createTicketSchema = z.object({
  rideId: z.string().uuid().optional(),
  type: z.enum(['DISPUTE', 'REPORT', 'GENERAL', 'PAYMENT']),
  subject: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
});

// ─── Inferred Types (pour réutiliser dans le code sans redéfinir) ──────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type FareEstimateInput = z.infer<typeof fareEstimateSchema>;
export type CreateRideInput = z.infer<typeof createRideSchema>;
export type DriverRegisterInput = z.infer<typeof driverRegisterSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type DriverLocationInput = z.infer<typeof driverLocationSchema>;
export type CreateVehicleTypeInput = z.infer<typeof createVehicleTypeSchema>;
export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;
export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
