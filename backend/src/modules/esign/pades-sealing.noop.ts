import { Injectable, Logger } from '@nestjs/common';
import {
  IPadesSealingService,
  PadesSealRequest,
  PadesSealResult,
} from './interfaces/pades-sealing.interface';

/**
 * Explicit env-gated no-op — used only when Azure Key Vault / cert env vars
 * are absent. Never fakes crypto; always reports `sealed:false`. The real
 * sealer is `PadesSealingService` (pades-sealing.service.ts).
 */
@Injectable()
export class NoopPadesSealingService implements IPadesSealingService {
  private readonly logger = new Logger(NoopPadesSealingService.name);

  isConfigured(): boolean {
    return false;
  }

  async seal(request: PadesSealRequest): Promise<PadesSealResult> {
    this.logger.warn(
      `PAdES sealing not configured for envelope ${request.envelopeId} (Key Vault / TSA missing)`,
    );
    return {
      sealed: false,
      sealedBlobUrl: null,
      reason: 'not_configured',
    };
  }
}
