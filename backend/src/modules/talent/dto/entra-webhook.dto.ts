import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum EntraWebhookEventType {
  USER_DISABLED = 'user.disabled',
  USER_DELETED = 'user.deleted',
  USER_ENABLED = 'user.enabled',
}

/**
 * Payload contract for `POST /api/v1/webhooks/entra`. Deliberately narrow —
 * a relaying Azure Function normalizes raw Microsoft Graph change
 * notifications down to `{ entraObjectId, eventType }` before calling this
 * endpoint, so Polaris never has to parse Graph's subscription envelope.
 */
export class EntraWebhookEventDto {
  @ApiProperty({ description: 'Microsoft Graph object id (Entra user)' })
  @IsUUID()
  entraObjectId: string;

  @ApiProperty({ enum: EntraWebhookEventType })
  @IsEnum(EntraWebhookEventType)
  eventType: EntraWebhookEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
