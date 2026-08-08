import { PublicAuth } from '@/decorators/auth/public-auth.decorator';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { EntraWebhookEventDto } from './dto/entra-webhook.dto';
import { EntraWebhookService } from './entra-webhook.service';
import {
  ENTRA_WEBHOOK_SECRET_HEADER,
  EntraWebhookGuard,
} from './guards/entra-webhook.guard';

/**
 * Server-to-server endpoint — authenticated by the `x-entra-webhook-secret`
 * header (see `EntraWebhookGuard`), never a Better Auth session.
 */
@ApiTags('webhooks')
@ApiSecurity(ENTRA_WEBHOOK_SECRET_HEADER)
@Controller({ path: 'webhooks/entra', version: '1' })
@PublicAuth()
@UseGuards(EntraWebhookGuard)
export class EntraWebhookController {
  constructor(private readonly entraWebhookService: EntraWebhookService) {}

  @Post()
  @ApiOperation({
    summary: 'Entra Graph lifecycle webhook (user disabled/deleted/enabled)',
  })
  async handle(@Body() dto: EntraWebhookEventDto) {
    return this.entraWebhookService.handleEvent(dto);
  }
}
