import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '@prisma/client';
import { AuthTokens, LoginResponse } from '@logistic/shared';
import { REDIS_KEYS } from '@logistic/shared';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Inscription ─────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<LoginResponse> {
    // Vérifier unicité téléphone et email
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: dto.phone },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        existing.phone === dto.phone
          ? 'Ce numéro de téléphone est déjà utilisé'
          : 'Cet email est déjà utilisé',
      );
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phone: dto.phone,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role as UserRole,
          countryCode: dto.countryCode,
          language: dto.language as any,
        },
      });

      // Créer profil selon le rôle
      if (dto.role === 'CLIENT') {
        await tx.clientProfile.create({ data: { userId: newUser.id } });
        await tx.wallet.create({ data: { userId: newUser.id, currency: this.getCurrencyForCountry(dto.countryCode) } });
      }

      return newUser;
    });

    this.logger.log(`Nouvel utilisateur inscrit: ${user.id} (${user.role})`);
    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), tokens, ...(user.role === 'CHAUFFEUR' ? { driver: null } : {}) };
  }

  // ─── Connexion Email/Password ─────────────────────────────────────────────

  async login(dto: LoginDto, deviceId?: string): Promise<LoginResponse> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(dto.phone ? [{ phone: dto.phone }] : []),
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
        deletedAt: null,
        isActive: true,
      },
      include: { driver: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const tokens = await this.generateTokens(user, deviceId);
    return {
      user: this.sanitizeUser(user),
      tokens,
      driver: user.driver || undefined,
    };
  }

  // ─── OTP ─────────────────────────────────────────────────────────────────

  async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
    // Firebase Phone Auth: le SDK mobile gère l'envoi OTP côté client
    // Côté backend, on peut aussi déclencher un envoi via Admin SDK
    // Pour cette version, l'OTP est géré côté client Firebase
    this.logger.log(`OTP demandé pour: ${phone}`);
    return { success: true, message: 'OTP envoyé via Firebase Phone Auth' };
  }

  async verifyOtp(dto: OtpVerifyDto, deviceId?: string): Promise<LoginResponse> {
    // Vérifier le Firebase ID token (généré après OTP côté client)
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(dto.idToken);
    } catch (err) {
      throw new UnauthorizedException('Token Firebase invalide');
    }

    // Vérifier que le phone correspond
    const firebasePhone = decodedToken.phone_number;
    if (!firebasePhone || firebasePhone !== dto.phone) {
      throw new UnauthorizedException('Numéro de téléphone non vérifié');
    }

    // Chercher ou créer l'utilisateur
    let user = await this.prisma.user.findFirst({
      where: { phone: dto.phone, deletedAt: null },
      include: { driver: true },
    });

    if (!user) {
      // Auto-création pour les nouveaux utilisateurs OTP
      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            phone: dto.phone,
            firstName: 'Utilisateur',
            lastName: '',
            role: UserRole.CLIENT,
            countryCode: this.getDialCodeFromPhone(dto.phone),
            isVerifiedPhone: true,
          },
        });
        await tx.clientProfile.create({ data: { userId: newUser.id } });
        await tx.wallet.create({
          data: { userId: newUser.id, currency: this.getCurrencyForCountry(this.getDialCodeFromPhone(dto.phone)) },
        });
        return { ...newUser, driver: null };
      });
    } else if (!user.isVerifiedPhone) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerifiedPhone: true },
      });
    }

    const tokens = await this.generateTokens(user, deviceId);
    return { user: this.sanitizeUser(user), tokens };
  }

  // ─── Refresh Tokens ───────────────────────────────────────────────────────

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; jti: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { id: payload.jti, userId: payload.sub, isRevoked: false },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Rotation attack: révoquer toute la famille de tokens
      await this.logoutAll(payload.sub);
      throw new UnauthorizedException('Token révoqué — reconnectez-vous');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, isActive: true, deletedAt: null },
    });

    if (!user) throw new UnauthorizedException('Utilisateur introuvable');

    // Rotation: révoquer l'ancien, émettre un nouveau
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    return this.generateTokens(user);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken: string): Promise<{ success: boolean }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.jti, userId },
        data: { isRevoked: true },
      });
    } catch {
      // Ignorer les erreurs de vérification lors du logout
    }
    return { success: true };
  }

  async logoutAll(userId: string): Promise<{ success: boolean }> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    // Désactiver tous les devices FCM
    await this.prisma.device.updateMany({
      where: { userId },
      data: { isActive: false },
    });
    return { success: true };
  }

  // ─── Password Reset ───────────────────────────────────────────────────────

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null, isActive: true },
    });

    // Toujours retourner succès pour éviter l'énumération d'emails
    if (!user) {
      return { success: true, message: 'Si cet email existe, un lien a été envoyé' };
    }

    const token = uuidv4();
    const ttlSeconds = 3600; // 1 heure

    await this.redis.set(`reset:${token}`, user.id, ttlSeconds);

    // Envoyer email
    await this.notifications.sendPasswordResetEmail(user.email!, user.firstName, token);

    return { success: true, message: 'Si cet email existe, un lien a été envoyé' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    const userId = await this.redis.get<string>(`reset:${token}`);
    if (!userId) throw new BadRequestException('Token invalide ou expiré');

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalider le token et déconnecter toutes les sessions
    await this.redis.del(`reset:${token}`);
    await this.logoutAll(userId);

    return { success: true };
  }

  // ─── Helpers privés ───────────────────────────────────────────────────────

  private async generateTokens(user: { id: string; role: UserRole }, deviceId?: string): Promise<AuthTokens> {
    const tokenId = uuidv4();
    const accessExpiresIn = this.config.get('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '30d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, role: user.role, jti: uuidv4() },
        {
          secret: this.config.get('JWT_ACCESS_SECRET'),
          expiresIn: accessExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        { sub: user.id, jti: tokenId },
        {
          secret: this.config.get('JWT_REFRESH_SECRET'),
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    // Stocker le refresh token en base (pour rotation)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        tokenHash: await argon2.hash(refreshToken),
        deviceId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes en secondes
    };
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  private getCurrencyForCountry(dialCode: string): string {
    const map: Record<string, string> = {
      '+216': 'TND',
      '+213': 'DZD',
      '+212': 'MAD',
    };
    return map[dialCode] || 'TND';
  }

  private getDialCodeFromPhone(phone: string): string {
    if (phone.startsWith('+216')) return '+216';
    if (phone.startsWith('+213')) return '+213';
    if (phone.startsWith('+212')) return '+212';
    return '+216';
  }
}
