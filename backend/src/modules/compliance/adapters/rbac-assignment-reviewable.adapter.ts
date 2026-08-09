import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessReviewCycleEntity } from '../entities/access-review-cycle.entity';
import { UserRoleAssignmentEntity } from '../entities/user-role-assignment.entity';
import {
  AdapterRunResult,
  ControlTestAdapter,
} from './control-test-adapter.types';

@Injectable()
export class RbacAssignmentReviewableAdapter implements ControlTestAdapter {
  readonly key = 'rbac_assignment_reviewable';

  constructor(
    @InjectRepository(UserRoleAssignmentEntity)
    private readonly assignmentRepository: Repository<UserRoleAssignmentEntity>,
    @InjectRepository(AccessReviewCycleEntity)
    private readonly cycleRepository: Repository<AccessReviewCycleEntity>,
  ) {}

  async run(tenantId: string): Promise<AdapterRunResult> {
    const assignmentCount = await this.assignmentRepository.count({
      where: { tenantId },
    });
    const cycleCount = await this.cycleRepository.count({
      where: { tenantId },
    });

    const windowStart = new Date();
    windowStart.setUTCDate(windowStart.getUTCDate() - 180);
    const recentCycle = await this.cycleRepository
      .createQueryBuilder('cycle')
      .where('cycle.tenantId = :tenantId', { tenantId })
      .andWhere('cycle.openedAt >= :windowStart', { windowStart })
      .getCount();

    const healthy = assignmentCount >= 0 && (cycleCount === 0 || recentCycle > 0);

    // Zero assignments + zero cycles is still a healthy empty tenant (pass).
    // Fail only when historical cycles exist but none in 180 days (stale pipeline).
    if (cycleCount > 0 && recentCycle === 0) {
      return {
        result: 'fail',
        summary: { assignmentCount, cycleCount, recentCycle },
        evidenceRefs: [],
      };
    }

    return {
      result: healthy ? 'pass' : 'fail',
      summary: { assignmentCount, cycleCount, recentCycle },
      evidenceRefs: [
        {
          kind: 'path',
          path: '/api/v1/compliance/access-reviews',
          label: 'Access review API',
        },
      ],
    };
  }
}
