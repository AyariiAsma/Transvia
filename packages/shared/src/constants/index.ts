import { RideStatus } from '../types';

// ─── Ride State Machine ─────────────────────────────────────────────────────

export const VALID_RIDE_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  [RideStatus.CREATED]: [RideStatus.SEARCHING],
  [RideStatus.SEARCHING]: [RideStatus.ACCEPTED, RideStatus.NO_DRIVER, RideStatus.CANCELLED],
  [RideStatus.ACCEPTED]: [RideStatus.DRIVER_EN_ROUTE, RideStatus.CANCELLED],
  [RideStatus.DRIVER_EN_ROUTE]: [RideStatus.DRIVER_ARRIVED, RideStatus.CANCELLED],
  [RideStatus.DRIVER_ARRIVED]: [RideStatus.RIDE_STARTED, RideStatus.CANCELLED],
  [RideStatus.RIDE_STARTED]: [RideStatus.COMPLETED, RideStatus.DISPUTED],
  [RideStatus.COMPLETED]: [RideStatus.PAYMENT_CONFIRMED],
  [RideStatus.PAYMENT_CONFIRMED]: [],
  [RideStatus.CANCELLED]: [],
  [RideStatus.NO_DRIVER]: [],
  [RideStatus.DISPUTED]: [RideStatus.COMPLETED, RideStatus.CANCELLED],
};

// Statuts terminaux (immuables)
export const TERMINAL_RIDE_STATUSES: RideStatus[] = [
  RideStatus.PAYMENT_CONFIRMED,
  RideStatus.CANCELLED,
  RideStatus.NO_DRIVER,
];

// Statuts actifs (course en cours)
export const ACTIVE_RIDE_STATUSES: RideStatus[] = [
  RideStatus.SEARCHING,
  RideStatus.ACCEPTED,
  RideStatus.DRIVER_EN_ROUTE,
  RideStatus.DRIVER_ARRIVED,
  RideStatus.RIDE_STARTED,
];

// ─── Dispatch Config ────────────────────────────────────────────────────────

export const DISPATCH_CONFIG = {
  INITIAL_RADIUS_M: 1000,
  MAX_RADIUS_M: 5000,
  RADIUS_STEP_M: 1000,
  DRIVER_TIMEOUT_S: 30,
  MAX_RETRIES: 4,
  MAX_DRIVERS_PER_ATTEMPT: 5,
  LOCATION_UPDATE_INTERVAL_S: 5,
} as const;

// ─── Countries Config ───────────────────────────────────────────────────────

export const COUNTRY_CONFIG = {
  TN: {
    name: 'Tunisie',
    dialCode: '+216',
    currency: 'TND',
    phoneRegex: /^\+216[2-9]\d{7}$/,
    locale: 'fr-TN',
    rtl: false,
  },
  DZ: {
    name: 'Algérie',
    dialCode: '+213',
    currency: 'DZD',
    phoneRegex: /^\+213[5-7]\d{8}$/,
    locale: 'fr-DZ',
    rtl: false,
  },
  MA: {
    name: 'Maroc',
    dialCode: '+212',
    currency: 'MAD',
    phoneRegex: /^\+212[5-7]\d{8}$/,
    locale: 'fr-MA',
    rtl: false,
  },
} as const;

// ─── Socket Events ──────────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  // Client → Server
  CLIENT_TRACKING_START: 'client:tracking_start',
  CLIENT_TRACKING_STOP: 'client:tracking_stop',
  DRIVER_LOCATION_UPDATE: 'driver:location_update',
  DRIVER_PING: 'driver:ping',
  CHAT_SEND: 'chat:send',

  // Server → Client
  RIDE_NEW_REQUEST: 'ride:new_request',
  RIDE_REQUEST_TIMEOUT: 'ride:request_timeout',
  RIDE_ACCEPTED: 'ride:accepted',
  RIDE_DRIVER_LOCATION: 'ride:driver_location',
  RIDE_DRIVER_ARRIVED: 'ride:driver_arrived',
  RIDE_STARTED: 'ride:started',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_CANCELLED: 'ride:cancelled',
  RIDE_NO_DRIVER: 'ride:no_driver',
  RIDE_REASSIGNED: 'ride:reassigned',
  NOTIFICATION_NEW: 'notification:new',
  CHAT_MESSAGE: 'chat:message',

  // Admin
  DASHBOARD_STATS_UPDATE: 'dashboard:stats_update',
  DASHBOARD_DRIVER_LOCATION: 'dashboard:driver_location',
  DASHBOARD_RIDE_UPDATE: 'dashboard:ride_update',
  DASHBOARD_NEW_DRIVER_DOC: 'dashboard:new_driver_doc',
} as const;

// ─── BullMQ Queue Names ─────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  DISPATCH: 'dispatch',
  NOTIFICATIONS: 'notifications',
  PAYMENTS: 'payments',
  EMAIL: 'email',
  SMS: 'sms',
  PAYOUTS: 'payouts',
} as const;

// ─── Redis Keys ─────────────────────────────────────────────────────────────

export const REDIS_KEYS = {
  DRIVERS_ONLINE: 'drivers:online', // Redis GEO set
  DRIVER_LOCATION: (id: string) => `driver:location:${id}`,
  RIDE_DISPATCH: (id: string) => `ride:dispatch:${id}`,
  OTP_CODE: (phone: string) => `otp:${phone}`,
  RATE_LIMIT: (key: string) => `rate_limit:${key}`,
  REFRESH_TOKEN: (userId: string, tokenId: string) => `refresh:${userId}:${tokenId}`,
  SESSION: (userId: string) => `sessions:${userId}`,
} as const;

// ─── Pagination Defaults ────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ─── App Config ─────────────────────────────────────────────────────────────

export const APP_CONFIG = {
  CANCELLATION_GRACE_MINUTES: 3,
  MAX_PROMO_USAGE_PER_USER: 1,
  MIN_RATING: 1,
  MAX_RATING: 5,
  FCM_TOKEN_MAX_PER_USER: 5,
  DRIVER_REQUIRED_DOCUMENTS: [
    'LICENSE',
    'REGISTRATION',
    'INSURANCE',
    'NATIONAL_ID',
    'PHOTO',
  ],
  SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_FILE_SIZE_MB: 10,
} as const;

// ─── Queue Names ─────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  DISPATCH: 'dispatch',
  NOTIFICATIONS: 'notifications',
  PAYOUTS: 'payouts',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Shared Types pour les réponses Login ────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: Record<string, unknown>;
  tokens: AuthTokens;
}

// ─── Input OTP ───────────────────────────────────────────────────────────────

export interface OtpVerifyInput {
  phone: string;
  code: string;
  idToken?: string;
}
