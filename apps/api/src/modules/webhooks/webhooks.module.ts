import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';

// Module pour les webhooks entrants (ex: callback paiement Stripe/Flouci)
@Module({
  controllers: [WebhooksController],
})
export class WebhooksModule {}
