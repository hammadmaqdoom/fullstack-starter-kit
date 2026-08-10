import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { PayoutBatchLineEntity } from '../entities/payout-batch-line.entity';
import { PayoutBatchEntity } from '../entities/payout-batch.entity';
import { PayoutBatchStatus, PayoutLineStatus } from '../enums/payout.enum';

@ApiExcludeController()
@Controller({ path: 'webhooks', version: '1' })
export class PayoutWebhookController {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PayoutBatchLineEntity)
    private readonly lineRepository: Repository<PayoutBatchLineEntity>,
    @InjectRepository(PayoutBatchEntity)
    private readonly batchRepository: Repository<PayoutBatchEntity>,
  ) {}

  @Post('aspire/payouts')
  @HttpCode(200)
  async aspirePayout(
    @Headers('x-aspire-signature') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    this.verifySignature(
      'ASPIRE_WEBHOOK_SECRET',
      signature,
      JSON.stringify(body),
    );
    const externalId = String(body.id ?? body.transfer_id ?? '');
    const status = String(body.status ?? '').toLowerCase();
    if (!externalId) {
      throw new BadRequestException('Missing transfer id');
    }
    await this.applyLineStatus(externalId, status);
    return { ok: true };
  }

  @Post('wise/transfers')
  @HttpCode(200)
  async wiseTransfer(
    @Headers('x-signature-sha256') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    this.verifySignature(
      'WISE_WEBHOOK_SECRET',
      signature,
      JSON.stringify(body),
    );
    const data = (body.data as Record<string, unknown>) ?? body;
    const resource = (data.resource as Record<string, unknown>) ?? data;
    const externalId = String(resource.id ?? data.id ?? '');
    const status = String(
      resource.current_state ?? data.current_state ?? data.status ?? '',
    ).toLowerCase();
    if (!externalId) {
      throw new BadRequestException('Missing transfer id');
    }
    await this.applyLineStatus(externalId, status);
    return { ok: true };
  }

  private verifySignature(
    secretEnv: string,
    signature: string | undefined,
    payload: string,
  ): void {
    const secret = this.configService.get<string>(secretEnv);
    if (!secret) {
      // Dev: allow unsigned when secret unset
      return;
    }
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature.replace(/^sha256=/i, ''));
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  private async applyLineStatus(
    providerTransferId: string,
    rawStatus: string,
  ): Promise<void> {
    const line = await this.lineRepository.findOne({
      where: { providerTransferId },
    });
    if (!line) {
      return;
    }
    if (line.status === PayoutLineStatus.PAID) {
      return;
    }

    const paidStates = [
      'paid',
      'completed',
      'outgoing_payment_sent',
      'funds_converted',
    ];
    const failedStates = ['failed', 'cancelled', 'bounced_back'];

    if (paidStates.some((s) => rawStatus.includes(s))) {
      line.status = PayoutLineStatus.PAID;
    } else if (failedStates.some((s) => rawStatus.includes(s))) {
      line.status = PayoutLineStatus.FAILED;
    } else {
      line.status = PayoutLineStatus.SUBMITTED;
    }
    await this.lineRepository.save(line);

    const siblings = await this.lineRepository.find({
      where: { batchId: line.batchId, tenantId: line.tenantId },
    });
    const batch = await this.batchRepository.findOne({
      where: { id: line.batchId, tenantId: line.tenantId },
    });
    if (!batch || batch.status === PayoutBatchStatus.PAID) {
      return;
    }
    const anyPending = siblings.some(
      (l) =>
        l.status === PayoutLineStatus.PENDING ||
        l.status === PayoutLineStatus.SUBMITTED,
    );
    const anyFailed = siblings.some((l) => l.status === PayoutLineStatus.FAILED);
    const allPaid = siblings.every(
      (l) =>
        l.status === PayoutLineStatus.PAID ||
        l.status === PayoutLineStatus.SKIPPED,
    );
    if (allPaid) {
      batch.status = PayoutBatchStatus.PAID;
    } else if (anyFailed && !anyPending) {
      batch.status = PayoutBatchStatus.PARTIALLY_PAID;
    } else {
      batch.status = PayoutBatchStatus.PROCESSING;
    }
    await this.batchRepository.save(batch);
  }
}
