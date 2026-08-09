import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessReviewCycleStatus } from '../enums/access-review.enum';
import { AccessReviewCycleEntity } from '../entities/access-review-cycle.entity';
import {
  AdapterRunResult,
  ControlTestAdapter,
} from './control-test-adapter.types';

@Injectable()
export class AccessReviewQuarterlyAdapter implements ControlTestAdapter {
  readonly key = 'access_review_quarterly';

  constructor(
    @InjectRepository(AccessReviewCycleEntity)
    private readonly cycleRepository: Repository<AccessReviewCycleEntity>,
  ) {}

  async run(tenantId: string): Promise<AdapterRunResult> {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setUTCDate(windowStart.getUTCDate() - 92);

    const completed = await this.cycleRepository
      .createQueryBuilder('cycle')
      .where('cycle.tenantId = :tenantId', { tenantId })
      .andWhere('cycle.status = :status', {
        status: AccessReviewCycleStatus.COMPLETED,
      })
      .andWhere('cycle.completedAt IS NOT NULL')
      .andWhere('cycle.completedAt >= :windowStart', { windowStart })
      .orderBy('cycle.completedAt', 'DESC')
      .getOne();

    if (!completed) {
      return {
        result: 'fail',
        summary: {
          reason: 'No completed access review cycle within 92 days',
        },
        evidenceRefs: [
          {
            kind: 'path',
            path: '/people-ops/compliance',
            label: 'Access reviews',
          },
        ],
      };
    }

    return {
      result: 'pass',
      summary: {
        cycleId: completed.id,
        periodLabel: completed.periodLabel,
        completedAt: completed.completedAt?.toISOString() ?? null,
      },
      evidenceRefs: [
        {
          kind: 'access_review_cycle',
          id: completed.id,
          path: `/api/v1/compliance/evidence/access-review?cycleId=${completed.id}`,
          label: completed.periodLabel,
        },
      ],
    };
  }
}
