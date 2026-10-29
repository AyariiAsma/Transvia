import { Controller, Post, Body, Headers, RawBodyRequest, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Webhook Flouci (Tunisie) — confirmation de paiement
   */
  @Post('flouci')
  @Public()
  @ApiOperation({ summary: 'Webhook Flouci' })
  async flouciWebhook(@Body() body: any, @Headers() headers: any) {
    this.logger.log(`Flouci webhook reçu: ${JSON.stringify(body)}`);

    const { payment_id, status } = body;
    if (!payment_id) return { received: true };

    try {
      await this.prisma.payment.updateMany({
        where: { externalRef: payment_id },
        data: {
          status: status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
          completedAt: status === 'COMPLETED' ? new Date() : undefined,
        },
      });
    } catch (err) {
      this.logger.error(`Flouci webhook error: ${err.message}`);
    }

    return { received: true };
  }

  /**
   * Webhook Firebase Auth — événements lifecycle utilisateur
   */
  @Post('firebase-auth')
  @Public()
  @ApiOperation({ summary: 'Webhook Firebase Auth lifecycle' })
  async firebaseAuthWebhook(@Body() body: any) {
    this.logger.debug(`Firebase Auth event: ${body?.type}`);
    // À implémenter selon les besoins (compte supprimé, etc.)
    return { received: true };
  }
}
