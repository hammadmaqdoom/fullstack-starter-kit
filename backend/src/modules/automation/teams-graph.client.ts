import { GlobalConfig } from '@/config/config.type';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientSecretCredential } from '@azure/identity';
import {
  ITeamsGraphClient,
  SendAdaptiveCardRequest,
  SendAdaptiveCardResult,
} from './interfaces/teams-graph-client.interface';

const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';

/**
 * Sends Teams adaptive card chat messages via Microsoft Graph, application-only.
 *
 * Requires:
 *  - App registration with Application permissions `Chat.Create` + `ChatMessage.Send`
 *  - A Cloud Communications "Application Access Policy" granting the app access
 *    to the target users (tenant admin action — not configurable from this code)
 *
 * Flow per send: create (or resolve existing) 1:1 chat with the target user as
 * the sole named member — Graph implicitly adds the calling application as the
 * other participant — then post a chatMessage with the adaptive card attachment.
 * Ref: https://learn.microsoft.com/graph/api/chat-post
 */
@Injectable()
export class TeamsGraphClient implements ITeamsGraphClient {
  private readonly logger = new Logger(TeamsGraphClient.name);
  private client: Client | null = null;

  constructor(private readonly configService: ConfigService<GlobalConfig>) {}

  isConfigured(): boolean {
    const graph = this.configService.get('graph', { infer: true });
    return Boolean(graph?.tenantId && graph?.clientId && graph?.clientSecret);
  }

  async sendAdaptiveCard(
    request: SendAdaptiveCardRequest,
  ): Promise<SendAdaptiveCardResult> {
    if (!this.isConfigured()) {
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

    try {
      const client = this.getClient();
      const chatId = await this.resolveOneOnOneChat(
        client,
        request.entraObjectId,
      );

      const message = await client.api(`/chats/${chatId}/messages`).post({
        body: {
          contentType: 'html',
          content: '<attachment id="card1"></attachment>',
        },
        attachments: [
          {
            id: 'card1',
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: JSON.stringify(request.card),
          },
        ],
      });

      return {
        success: true,
        reason: 'sent',
        chatId,
        messageId: (message?.id as string) ?? null,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'graph_error';
      this.logger.error(
        `Teams adaptive card send failed for entraObjectId ${request.entraObjectId}: ${reason}`,
      );
      return { success: false, reason, chatId: null, messageId: null };
    }
  }

  private async resolveOneOnOneChat(
    client: Client,
    entraObjectId: string,
  ): Promise<string> {
    const chat = await client.api('/chats').post({
      chatType: 'oneOnOne',
      members: [
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${entraObjectId}')`,
        },
      ],
    });
    return chat.id as string;
  }

  private getClient(): Client {
    if (this.client) {
      return this.client;
    }

    const graph = this.configService.getOrThrow('graph', { infer: true });
    const credential = new ClientSecretCredential(
      graph.tenantId as string,
      graph.clientId as string,
      graph.clientSecret as string,
    );
    const authProvider = new TokenCredentialAuthenticationProvider(
      credential,
      { scopes: [GRAPH_SCOPE] },
    );

    this.client = Client.initWithMiddleware({ authProvider });
    return this.client;
  }
}
