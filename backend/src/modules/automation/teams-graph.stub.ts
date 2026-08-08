import { Injectable, Logger } from '@nestjs/common';
import {
  ITeamsGraphClient,
  SendAdaptiveCardRequest,
  SendAdaptiveCardResult,
} from './interfaces/teams-graph-client.interface';

@Injectable()
export class StubTeamsGraphClient implements ITeamsGraphClient {
  private readonly logger = new Logger(StubTeamsGraphClient.name);

  isConfigured(): boolean {
    return false;
  }

  async sendAdaptiveCard(
    request: SendAdaptiveCardRequest,
  ): Promise<SendAdaptiveCardResult> {
    this.logger.warn(
      `Microsoft Graph not configured — skip Teams card for entraObjectId ${request.entraObjectId}`,
    );
    return {
      success: false,
      reason: 'not_configured',
      chatId: null,
      messageId: null,
    };
  }
}
