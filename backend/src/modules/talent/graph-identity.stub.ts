import { Injectable, Logger } from '@nestjs/common';
import {
  GraphDisableRequest,
  GraphDisableResult,
  GraphProvisionRequest,
  GraphProvisionResult,
  IMicrosoftGraphIdentityService,
} from './interfaces/microsoft-graph-identity.interface';

@Injectable()
export class StubMicrosoftGraphIdentityService
  implements IMicrosoftGraphIdentityService
{
  private readonly logger = new Logger(StubMicrosoftGraphIdentityService.name);

  isConfigured(): boolean {
    return false;
  }

  async createOrEnableUser(
    request: GraphProvisionRequest,
  ): Promise<GraphProvisionResult> {
    this.logger.warn(
      `Microsoft Graph not configured — skip provision for worker ${request.workerId} (${request.workEmail})`,
    );
    return {
      success: false,
      entraObjectId: null,
      reason: 'not_configured',
    };
  }

  async disableUser(request: GraphDisableRequest): Promise<GraphDisableResult> {
    this.logger.warn(
      `Microsoft Graph not configured — skip disable for worker ${request.workerId}`,
    );
    return { success: false, reason: 'not_configured' };
  }
}
