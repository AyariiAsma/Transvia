import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getFullProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        driver: {
          include: {
            vehicle: { include: { vehicleType: true } },
            documents: true,
          },
        },
        clientProfile: true,
        wallet: true,
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const { passwordHash, ...safe } = user;
    return { success: true, data: safe };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.email && { email: dto.email }),
        ...(dto.avatarUrl && { avatarUrl: dto.avatarUrl }),
        ...(dto.language && { language: dto.language as any }),
      },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        avatarUrl: true, language: true, phone: true, role: true,
      },
    });
    return { success: true, data: updated };
  }

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    const device = await this.prisma.device.upsert({
      where: { userId_platform: { userId, platform: dto.platform as any } },
      create: {
        userId,
        fcmToken: dto.fcmToken,
        platform: dto.platform as any,
        deviceModel: dto.deviceModel,
        appVersion: dto.appVersion,
        isActive: true,
      },
      update: {
        fcmToken: dto.fcmToken,
        isActive: true,
        updatedAt: new Date(),
      },
    });
    return { success: true, data: device };
  }

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!wallet) throw new NotFoundException('Wallet introuvable');
    return { success: true, data: wallet };
  }

  async getTransactions(userId: string, page: number, limit: number) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException();

    const skip = (page - 1) * limit;
    const [txs, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      success: true,
      data: txs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getNotifications(userId: string, unreadOnly = false) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });

    return { success: true, data: notifications, meta: { unreadCount } };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}
