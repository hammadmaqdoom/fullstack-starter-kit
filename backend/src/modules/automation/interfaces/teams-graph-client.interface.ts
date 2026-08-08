/**
 * Microsoft Graph Teams chat messaging for adaptive card notifications.
 * Distinct from talent's MICROSOFT_GRAPH_IDENTITY (Entra user provisioning) —
 * this client sends application-only chat messages via Graph's Cloud
 * Communications "Application Access Policy" feature.
 * Stub implementations must not invent Graph success without credentials.
 */
export const TEAMS_GRAPH_CLIENT = Symbol('TEAMS_GRAPH_CLIENT');

export type AdaptiveCard = Record<string, unknown>;

export type SendAdaptiveCardRequest = {
  entraObjectId: string;
  card: AdaptiveCard;
};

export type SendAdaptiveCardResult = {
  success: boolean;
  reason: string;
  chatId: string | null;
  messageId: string | null;
};

export interface ITeamsGraphClient {
  isConfigured(): boolean;
  sendAdaptiveCard(
    request: SendAdaptiveCardRequest,
  ): Promise<SendAdaptiveCardResult>;
}
