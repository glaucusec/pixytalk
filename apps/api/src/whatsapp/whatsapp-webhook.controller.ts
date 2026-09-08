import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import { WhatsAppSignatureService } from './whatsapp-signature.service.js';
import { WhatsAppWebhookService } from './whatsapp-webhook.service.js';

@Controller('webhooks/whatsapp')
@AllowAnonymous()
export class WhatsAppWebhookController {
  constructor(
    private readonly signatureService: WhatsAppSignatureService,
    private readonly webhookService: WhatsAppWebhookService,
  ) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() response: Response,
  ) {
    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && expectedToken && token === expectedToken) {
      return response.status(200).type('text/plain').send(challenge);
    }

    return response.status(403).send('Webhook verification failed');
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() payload: unknown,
  ) {
    if (
      !request.rawBody ||
      !this.signatureService.verify(request.rawBody, signature)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const result = await this.webhookService.process(payload);

    return { received: true, ...result };
  }
}
