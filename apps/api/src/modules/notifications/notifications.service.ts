import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@logistic/shared';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Envoyer une notification push à plusieurs tokens FCM
   */
  async sendPushToTokens(tokens: string[], payload: PushPayload): Promise<void> {
    if (!tokens.length) return;

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'rides',
          priority: 'max',
          defaultSound: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.debug(
        `FCM: ${response.successCount} ok, ${response.failureCount} erreurs pour ${tokens.length} tokens`,
      );

      // Nettoyer les tokens invalides
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          (resp.error?.code === 'messaging/registration-token-not-registered' ||
            resp.error?.code === 'messaging/invalid-registration-token')
        ) {
          invalidTokens.push(tokens[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        await this.prisma.device.updateMany({
          where: { fcmToken: { in: invalidTokens } },
          data: { isActive: false },
        });
      }
    } catch (err) {
      this.logger.error(`FCM multicast error: ${err.message}`);
    }
  }

  /**
   * Envoyer à tous les appareils d'un utilisateur
   */
  async sendToUser(userId: string, payload: PushPayload, type?: NotificationType): Promise<void> {
    const devices = await this.prisma.device.findMany({
      where: { userId, isActive: true },
    });

    const tokens = devices.map((d) => d.fcmToken);
    await this.sendPushToTokens(tokens, payload);

    // Sauvegarder en base pour l'historique
    if (type) {
      await this.prisma.notification.create({
        data: {
          userId,
          title: payload.title,
          body: payload.body,
          type,
          data: payload.data as any,
          sentVia: tokens.length > 0 ? 'BOTH' : 'SOCKET',
        },
      });
    }
  }

  /**
   * Broadcast à tous les admins
   */
  async sendToAdmins(payload: PushPayload): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      include: { devices: { where: { isActive: true } } },
    });

    const tokens = admins.flatMap((a) => a.devices.map((d) => d.fcmToken));
    await this.sendPushToTokens(tokens, payload);
  }

  /**
   * Email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<void> {
    // TODO: Intégrer SendGrid
    const resetUrl = `${process.env.APP_URL || 'https://logisticapp.com'}/reset-password?token=${token}`;
    this.logger.log(`Password reset email pour ${email}: ${resetUrl}`);

    // Exemple SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({ to: email, from: 'noreply@logisticapp.com', ... });
  }

  /**
   * Notification in-app (DB uniquement, envoyée via WebSocket)
   */
  async createInAppNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, unknown>,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        data: data as any,
        sentVia: 'SOCKET',
      },
    });
  }
}
