import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { PrismaService } from '../../../src/modules/prisma/prisma.service';
import { RedisService } from '../../../src/modules/redis/redis.service';
import { NotificationsService } from '../../../src/modules/notifications/notifications.service';
import * as argon2 from 'argon2';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  clientProfile: { create: jest.fn() },
  wallet: { create: jest.fn() },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  device: { updateMany: jest.fn() },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockNotifications = {
  sendPasswordResetEmail: jest.fn(),
};

const mockJwt = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verify: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, def?: string) => {
    const values: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '30d',
    };
    return values[key] ?? def;
  }),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('devrait créer un utilisateur CLIENT avec succès', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const mockUser = {
        id: 'user-1', phone: '+21650000001', email: 'test@test.com',
        firstName: 'Ahmed', lastName: 'Test', role: 'CLIENT',
        passwordHash: 'hash', isActive: true, createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.clientProfile.create.mockResolvedValue({});
      mockPrisma.wallet.create.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        phone: '+21650000001',
        email: 'test@test.com',
        password: 'Password@123',
        firstName: 'Ahmed',
        lastName: 'Test',
        role: 'CLIENT',
        countryCode: '+216',
        language: 'fr',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.passwordHash).toBeUndefined();
      expect(mockPrisma.clientProfile.create).toHaveBeenCalled();
      expect(mockPrisma.wallet.create).toHaveBeenCalled();
    });

    it('devrait lever ConflictException si le téléphone existe déjà', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing', phone: '+21650000001',
      });

      await expect(
        service.register({
          phone: '+21650000001',
          password: 'Password@123',
          firstName: 'Test',
          lastName: 'User',
          role: 'CLIENT',
          countryCode: '+216',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('ne devrait pas exposer le hash du mot de passe', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1', phone: '+21650000001', firstName: 'Test',
        lastName: 'U', role: 'CLIENT', passwordHash: 'secret-hash',
      });
      mockPrisma.clientProfile.create.mockResolvedValue({});
      mockPrisma.wallet.create.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        phone: '+21650000001', password: 'Password@123',
        firstName: 'Test', lastName: 'U',
        role: 'CLIENT', countryCode: '+216',
      });

      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('devrait retourner des tokens si les identifiants sont corrects', async () => {
      const hash = await argon2.hash('Password@123');
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1', email: 'test@test.com', passwordHash: hash,
        role: 'CLIENT', isActive: true, driver: null,
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'test@test.com', password: 'Password@123' });

      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('devrait lever UnauthorizedException si le mot de passe est incorrect', async () => {
      const hash = await argon2.hash('CorrectPassword@123');
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1', email: 'test@test.com', passwordHash: hash,
        role: 'CLIENT', isActive: true,
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'WrongPassword@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait lever UnauthorizedException si l\'utilisateur n\'existe pas', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'notexist@test.com', password: 'Pass@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('devrait révoquer le refresh token', async () => {
      mockJwt.verify.mockReturnValue({ jti: 'token-id-123', sub: 'u1' });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('u1', 'valid-refresh-token');
      expect(result.success).toBe(true);
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'token-id-123', userId: 'u1' },
        data: { isRevoked: true },
      });
    });

    it('devrait retourner succès même si le token est invalide', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('Invalid'); });

      const result = await service.logout('u1', 'bad-token');
      expect(result.success).toBe(true);
    });
  });

  // ─── refreshTokens ─────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('devrait émettre de nouveaux tokens et révoquer l\'ancien', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'u1', jti: 'old-token-id' });
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'old-token-id', userId: 'u1', isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', role: 'CLIENT', isActive: true,
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('old-refresh-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'old-token-id' },
        data: { isRevoked: true },
      });
    });
  });

  // ─── requestPasswordReset ──────────────────────────────────────────────────

  describe('requestPasswordReset', () => {
    it('devrait toujours retourner succès (anti-énumération)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.requestPasswordReset('unknown@test.com');
      expect(result.success).toBe(true);
      expect(mockNotifications.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('devrait envoyer un email si l\'utilisateur existe', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1', email: 'user@test.com', firstName: 'Ahmed', isActive: true,
      });
      mockRedis.set.mockResolvedValue(undefined);
      mockNotifications.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.requestPasswordReset('user@test.com');
      expect(result.success).toBe(true);
      expect(mockNotifications.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@test.com', 'Ahmed', expect.any(String),
      );
    });
  });
});
