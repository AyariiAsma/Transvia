// ============================================================
// LogisticApp — Shared Types
// Utilisés par le backend, le mobile et l'admin-web
// ============================================================

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum UserRole {
  CLIENT = 'CLIENT',
  CHAUFFEUR = 'CHAUFFEUR',
  ADMIN = 'ADMIN',
}

export enum AdminSubRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SUPPORT = 'SUPPORT',
  FINANCE = 'FINANCE',
}

export enum DriverStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export enum DocumentType {
  LICENSE = 'LICENSE',
  REGISTRATION = 'REGISTRATION',
  INSURANCE = 'INSURANCE',
  NATIONAL_ID = 'NATIONAL_ID',
  PHOTO = 'PHOTO',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum RideStatus {
  CREATED = 'CREATED',
  SEARCHING = 'SEARCHING',
  ACCEPTED = 'ACCEPTED',
  DRIVER_EN_ROUTE = 'DRIVER_EN_ROUTE',
  DRIVER_ARRIVED = 'DRIVER_ARRIVED',
  RIDE_STARTED = 'RIDE_STARTED',
  COMPLETED = 'COMPLETED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  CANCELLED = 'CANCELLED',
  NO_DRIVER = 'NO_DRIVER',
  DISPUTED = 'DISPUTED',
}

export enum ServiceType {
  RIDE = 'RIDE',
  DELIVERY = 'DELIVERY',
}

export enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
  WALLET = 'WALLET',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  REFUND = 'REFUND',
  PAYOUT = 'PAYOUT',
  TOPUP = 'TOPUP',
  COMMISSION = 'COMMISSION',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum NotificationType {
  RIDE_REQUEST = 'RIDE_REQUEST',
  RIDE_ACCEPTED = 'RIDE_ACCEPTED',
  RIDE_CANCELLED = 'RIDE_CANCELLED',
  RIDE_COMPLETED = 'RIDE_COMPLETED',
  DRIVER_ARRIVED = 'DRIVER_ARRIVED',
  PAYMENT = 'PAYMENT',
  PROMO = 'PROMO',
  SYSTEM = 'SYSTEM',
  SOS = 'SOS',
  DOCUMENT_STATUS = 'DOCUMENT_STATUS',
}

export enum SupportTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum SupportTicketType {
  DISPUTE = 'DISPUTE',
  REPORT = 'REPORT',
  GENERAL = 'GENERAL',
  PAYMENT = 'PAYMENT',
}

export enum PromoType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum CountryCode {
  TN = '+216', // Tunisie
  DZ = '+213', // Algérie
  MA = '+212', // Maroc
}

export enum CurrencyCode {
  TND = 'TND', // Dinar tunisien
  DZD = 'DZD', // Dinar algérien
  MAD = 'MAD', // Dirham marocain
}

export enum Language {
  FR = 'fr',
  AR = 'ar',
  EN = 'en',
}

export enum Platform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

// ─── Interfaces Core ────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address {
  formatted: string;
  lat: number;
  lng: number;
  placeId?: string;
  city?: string;
  country?: string;
}

export interface User {
  id: string;
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  countryCode: string;
  language: Language;
  isVerifiedPhone: boolean;
  isVerifiedEmail: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  id: string;
  userId: string;
  user?: User;
  licenseNumber: string;
  licenseExpiry: Date;
  status: DriverStatus;
  ratingAvg: number;
  totalRides: number;
  isOnline: boolean;
  currentLocation?: Coordinates;
  lastSeenAt?: Date;
  vehicle?: Vehicle;
  documents?: DriverDocument[];
  earningsTotal: number;
}

export interface Vehicle {
  id: string;
  driverId: string;
  typeId: string;
  type?: VehicleType;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  isActive: boolean;
}

export interface VehicleType {
  id: string;
  name: string;
  iconUrl?: string;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minFare: number;
  maxPassengers: number;
  serviceType: ServiceType;
  isActive: boolean;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  type: DocumentType;
  cloudinaryUrl: string;
  status: DocumentStatus;
  expiresAt?: Date;
  rejectionReason?: string;
}

export interface Ride {
  id: string;
  clientId: string;
  driverId?: string;
  vehicleTypeId: string;
  serviceType: ServiceType;
  status: RideStatus;
  pickup: Address;
  dropoff: Address;
  routePolyline?: string;
  distanceKm?: number;
  durationMinutes?: number;
  estimatedFare?: number;
  finalFare?: number;
  surgeMultiplier: number;
  promoCodeId?: string;
  paymentMethod: PaymentMethod;
  scheduledAt?: Date;
  cancelledBy?: string;
  cancelReason?: string;
  cancellationFee?: number;
  currencyCode: CurrencyCode;
  countryCode: string;
  requestedAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  client?: User;
  driver?: Driver;
  vehicle?: Vehicle;
  payment?: Payment;
  rating?: Rating;
}

export interface FareBreakdown {
  base: number;
  distanceCost: number;
  timeCost: number;
  subtotal: number;
  surgeMultiplier: number;
  surgeAmount: number;
  discount: number;
  total: number;
  platformCommission: number;
  driverEarnings: number;
  currency: CurrencyCode;
}

export interface Payment {
  id: string;
  rideId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: CurrencyCode;
  method: PaymentMethod;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  idempotencyKey: string;
  platformCommission: number;
  driverEarnings: number;
  createdAt: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: CurrencyCode;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  createdAt: Date;
}

export interface Payout {
  id: string;
  driverId: string;
  amount: number;
  currency: CurrencyCode;
  status: PayoutStatus;
  requestedAt: Date;
  processedAt?: Date;
}

export interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  minFare?: number;
  maxDiscount?: number;
  currency?: CurrencyCode;
  usageLimit?: number;
  usedCount: number;
  userLimitPerCode: number;
  validFrom: Date;
  validUntil?: Date;
  countryCodes: string[];
  vehicleTypeIds: string[];
  isActive: boolean;
}

export interface Rating {
  id: string;
  rideId: string;
  raterId: string;
  rateeId: string;
  score: number; // 1-5
  comment?: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

export interface SupportTicket {
  id: string;
  userId: string;
  rideId?: string;
  type: SupportTicketType;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  driver?: Driver;
}

// ─── WebSocket Event Types ──────────────────────────────────────────────────

export interface DriverLocationUpdate {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  eta?: number; // minutes
  timestamp: number;
}

export interface RideRequestEvent {
  ride: Ride;
  client: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  pickupDistanceKm: number;
  estimatedPickupMinutes: number;
  timeoutSeconds: number;
}

export interface RideAcceptedEvent {
  ride: Ride;
  driver: Pick<Driver, 'id' | 'ratingAvg'> & {
    user: Pick<User, 'firstName' | 'lastName' | 'avatarUrl' | 'phone'>;
    vehicle: Vehicle;
  };
  eta: number; // minutes
}

// ─── Fare Estimation Request ────────────────────────────────────────────────

export interface FareEstimateRequest {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  vehicleTypeId: string;
  countryCode: string;
  promoCode?: string;
}

export interface FareEstimateResponse {
  vehicleTypeId: string;
  distanceKm: number;
  durationMinutes: number;
  fare: FareBreakdown;
  surgeActive: boolean;
  currency: CurrencyCode;
}

// ─── Dashboard Types (Admin) ────────────────────────────────────────────────

export interface DashboardStats {
  ridesInProgress: number;
  driversOnline: number;
  revenueToday: number;
  ridesToday: number;
  cancellationRateToday: number;
  pendingDriverApprovals: number;
  openSupportTickets: number;
  currency: CurrencyCode;
}
