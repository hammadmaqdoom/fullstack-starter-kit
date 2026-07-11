import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { DIGITARO_TENANT_ID } from './constants/tenant.constants';
import { OpenAccessReviewCycleDto } from './dto/access-review.dto';
import { AccessReviewCycleEntity } from './entities/access-review-cycle.entity';
import { AccessReviewItemEntity } from './entities/access-review-item.entity';
import { UserRoleAssignmentEntity } from './entities/user-role-assignment.entity';
import {
  AccessReviewCycleStatus,
  AccessReviewItemStatus,
} from './enums/access-review.enum';
import { PolarisRoleCode } from './enums/polaris-role-code.enum';
import { RbacService } from './rbac.service';
import { CsvRow, rowsToCsv } from './utils/csv.util';

const ADMIN_REVIEW_ROLES = [
  PolarisRoleCode.IT_ADMIN,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

interface WorkerLookupRow {
  id: string;
  userId: string | null;
  managerId: string | null;
}

@Injectable()
export class AccessReviewService {
  constructor(
    @InjectRepository(AccessReviewCycleEntity)
    private readonly cycleRepository: Repository<AccessReviewCycleEntity>,
    @InjectRepository(AccessReviewItemEntity)
    private readonly itemRepository: Repository<AccessReviewItemEntity>,
    @InjectRepository(UserRoleAssignmentEntity)
    private readonly assignmentRepository: Repository<UserRoleAssignmentEntity>,
    private readonly rbacService: RbacService,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * FLW-SEC-005 step 1 — export role assignments into a point-in-time review
   * pack. Snapshots every currently-active assignment as a `pending` item.
   */
  async openCycle(
    dto: OpenAccessReviewCycleDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<AccessReviewCycleEntity> {
    const today = new Date().toISOString().slice(0, 10);
    const activeAssignments = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.role', 'role')
      .innerJoinAndSelect('assignment.user', 'user')
      .where('assignment.tenantId = :tenantId', { tenantId })
      .andWhere(
        '(assignment.effectiveFrom IS NULL OR assignment.effectiveFrom <= :today)',
        { today },
      )
      .andWhere(
        '(assignment.effectiveTo IS NULL OR assignment.effectiveTo > :today)',
        { today },
      )
      .getMany();

    const workerLookup = await this.dataSource.query<WorkerLookupRow[]>(
      `SELECT id, "userId", "managerId" FROM workers WHERE "tenantId" = $1 AND "userId" IS NOT NULL`,
      [tenantId],
    );
    const workerByUserId = new Map(
      workerLookup.map((row) => [row.userId as string, row]),
    );

    const cycle = await this.cycleRepository.save(
      this.cycleRepository.create({
        tenantId,
        periodLabel: dto.periodLabel,
        dueDate: dto.dueDate ?? null,
        createdByUserId: actorId,
        status: AccessReviewCycleStatus.OPEN,
      }),
    );

    const items = activeAssignments.map((assignment) => {
      const worker = workerByUserId.get(assignment.userId);
      return this.itemRepository.create({
        tenantId,
        cycleId: cycle.id,
        assignmentId: assignment.id,
        userId: assignment.userId,
        userEmail: assignment.user?.email ?? '',
        workerId: worker?.id ?? null,
        managerWorkerId: worker?.managerId ?? null,
        roleCode: assignment.role!.code,
        scopeType: assignment.scopeType,
        scopeLabel: assignment.scopeCountryCode ?? assignment.scopeId ?? null,
        status: AccessReviewItemStatus.PENDING,
      });
    });
    await this.itemRepository.save(items);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'access_review_cycle.open',
      entityType: 'access_review_cycle',
      entityId: cycle.id,
      changes: {
        periodLabel: { old: null, new: cycle.periodLabel },
        itemCount: { old: null, new: items.length },
      },
    });

    return cycle;
  }

  async listCycles(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<AccessReviewCycleEntity[]> {
    return this.cycleRepository.find({
      where: { tenantId },
      order: { openedAt: 'DESC' },
    });
  }

  async getCycle(
    id: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<AccessReviewCycleEntity> {
    const cycle = await this.cycleRepository.findOne({
      where: { id, tenantId },
    });
    if (!cycle) {
      throw new NotFoundException('Access review cycle not found');
    }
    return cycle;
  }

  /**
   * FLW-SEC-005 step 2-3 — IT Admin / People Ops / Super Admin see the full
   * pack; a Manager sees only items for their direct reports (team
   * certification).
   */
  async listItems(
    cycleId: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<AccessReviewItemEntity[]> {
    await this.getCycle(cycleId, tenantId);
    const authContext = await this.rbacService.getAuthContext(
      actorId,
      tenantId,
    );
    const isAdminReviewer = authContext.roleCodes.some((code) =>
      ADMIN_REVIEW_ROLES.includes(code as PolarisRoleCode),
    );

    const qb = this.itemRepository
      .createQueryBuilder('item')
      .where('item.tenantId = :tenantId', { tenantId })
      .andWhere('item.cycleId = :cycleId', { cycleId });

    if (!isAdminReviewer) {
      const actingWorkerId = await this.resolveWorkerId(actorId, tenantId);
      if (!actingWorkerId) {
        return [];
      }
      qb.andWhere('item.managerWorkerId = :actingWorkerId', {
        actingWorkerId,
      });
    }

    return qb.orderBy('item.createdAt', 'ASC').getMany();
  }

  async certifyItem(
    itemId: string,
    actorId: string,
    notes: string | undefined,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<AccessReviewItemEntity> {
    const item = await this.getItemForReview(itemId, actorId, tenantId);

    item.status = AccessReviewItemStatus.CERTIFIED;
    item.reviewedByUserId = actorId;
    item.reviewedAt = new Date();
    item.notes = notes ?? null;
    const saved = await this.itemRepository.save(item);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'access_review_item.certify',
      entityType: 'access_review_item',
      entityId: item.id,
      changes: {
        status: { old: AccessReviewItemStatus.PENDING, new: item.status },
      },
    });

    return saved;
  }

  /**
   * FLW-SEC-005 step 4 — revoking a review item also revokes the underlying
   * role assignment (sets `effectiveTo`) so unjustified access is actually
   * removed, not just flagged.
   */
  async revokeItem(
    itemId: string,
    actorId: string,
    notes: string | undefined,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<AccessReviewItemEntity> {
    const item = await this.getItemForReview(itemId, actorId, tenantId);

    item.status = AccessReviewItemStatus.REVOKED;
    item.reviewedByUserId = actorId;
    item.reviewedAt = new Date();
    item.notes = notes ?? null;
    const saved = await this.itemRepository.save(item);

    const today = new Date().toISOString().slice(0, 10);
    if (item.assignmentId) {
      const assignment = await this.assignmentRepository.findOne({
        where: { id: item.assignmentId, tenantId },
      });
      if (assignment && !assignment.effectiveTo) {
        assignment.effectiveTo = today;
        await this.assignmentRepository.save(assignment);

        await this.auditLogService.append({
          tenantId,
          actorId,
          action: 'user_role_assignment.revoke',
          entityType: 'user_role_assignment',
          entityId: assignment.id,
          changes: {
            effectiveTo: { old: null, new: today },
            reason: { old: null, new: 'access_review_revocation' },
          },
        });
      }
    }

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'access_review_item.revoke',
      entityType: 'access_review_item',
      entityId: item.id,
      changes: {
        status: { old: AccessReviewItemStatus.PENDING, new: item.status },
      },
    });

    return saved;
  }

  async completeCycle(
    id: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<AccessReviewCycleEntity> {
    const cycle = await this.getCycle(id, tenantId);
    if (cycle.status === AccessReviewCycleStatus.COMPLETED) {
      return cycle;
    }

    cycle.status = AccessReviewCycleStatus.COMPLETED;
    cycle.completedAt = new Date();
    const saved = await this.cycleRepository.save(cycle);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'access_review_cycle.complete',
      entityType: 'access_review_cycle',
      entityId: cycle.id,
      changes: {
        status: { old: AccessReviewCycleStatus.OPEN, new: cycle.status },
      },
    });

    return saved;
  }

  /** GET /api/v1/compliance/evidence/access-review — ISO 9001 9.2 review record export. */
  async exportEvidenceCsv(
    cycleId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<{ fileName: string; csv: string }> {
    const cycle = await this.getCycle(cycleId, tenantId);
    const items = await this.itemRepository.find({
      where: { tenantId, cycleId },
      order: { createdAt: 'ASC' },
    });

    const rows: CsvRow[] = items.map((item) => ({
      period: cycle.periodLabel,
      userEmail: item.userEmail,
      roleCode: item.roleCode,
      scopeType: item.scopeType,
      scopeLabel: item.scopeLabel,
      status: item.status,
      reviewedByUserId: item.reviewedByUserId,
      reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
      notes: item.notes,
    }));

    return {
      fileName: `access-review-${cycle.periodLabel}.csv`,
      csv: rowsToCsv(rows),
    };
  }

  private async getItemForReview(
    itemId: string,
    actorId: string,
    tenantId: string,
  ): Promise<AccessReviewItemEntity> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Access review item not found');
    }
    if (item.status !== AccessReviewItemStatus.PENDING) {
      return item;
    }

    const authContext = await this.rbacService.getAuthContext(
      actorId,
      tenantId,
    );
    const isAdminReviewer = authContext.roleCodes.some((code) =>
      ADMIN_REVIEW_ROLES.includes(code as PolarisRoleCode),
    );
    if (isAdminReviewer) {
      return item;
    }

    const actingWorkerId = await this.resolveWorkerId(actorId, tenantId);
    if (!actingWorkerId || item.managerWorkerId !== actingWorkerId) {
      throw new ForbiddenException(
        'You are not the reviewer for this access review item',
      );
    }

    return item;
  }

  private async resolveWorkerId(
    userId: string,
    tenantId: string,
  ): Promise<string | null> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM workers WHERE "tenantId" = $1 AND "userId" = $2 LIMIT 1`,
      [tenantId, userId],
    );
    return rows[0]?.id ?? null;
  }
}
