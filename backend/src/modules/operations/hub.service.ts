import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { ProfileChangeRequestEntity } from '@/modules/core-hr/entities/profile-change-request.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ApprovalStatus } from '@/modules/core-hr/enums/org.enum';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import { PolicyService } from '@/modules/documents/policy.service';
import {
  EsignEnvelopeStatus,
  EsignSignatoryStatus,
} from '@/modules/esign/enums/esign.enum';
import {
  DevelopmentActionStatus,
  OneOnOneStatus,
  ReviewStatus,
} from '@/modules/talent/enums/performance.enum';
import { PunchCorrectionStatus } from '@/modules/time-leave/enums/attendance.enum';
import { LeaveRequestStatus } from '@/modules/time-leave/enums/leave.enum';
import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateHubSavedViewDto, QueryHubDto } from './dto/hub.dto';
import { HubSavedViewEntity } from './entities/hub-saved-view.entity';

export type HubItemType =
  | 'profile_change_request'
  | 'leave_request'
  | 'punch_correction'
  | 'policy_acknowledgement'
  | 'esign_envelope'
  | 'performance_review'
  | 'one_on_one'
  | 'development_plan_action';

export type HubItem = {
  id: string;
  type: HubItemType;
  title: string;
  status: string;
  createdAt: Date;
  href: string;
  entityId: string;
};

export type HubInbox = {
  mine: HubItem[];
  forMe: HubItem[];
};

@Injectable()
export class HubService {
  constructor(
    @InjectRepository(HubSavedViewEntity)
    private readonly savedViewRepository: Repository<HubSavedViewEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(ProfileChangeRequestEntity)
    private readonly profileChangeRepository: Repository<ProfileChangeRequestEntity>,
    private readonly rbacService: RbacService,
    private readonly dataSource: DataSource,
    @Optional() private readonly policyService?: PolicyService,
  ) {}

  async getInbox(
    userId: string,
    query: QueryHubDto,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<{
    data: HubInbox;
    meta: { page: number; limit: number; total: number };
    errors: [];
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      userId,
      tenantId,
    );
    const auth = await this.rbacService.getAuthContext(userId, tenantId);

    const [
      profileMine,
      profileForMe,
      esignMine,
      esignForMe,
      leaveMine,
      leaveForMe,
      punchMine,
      punchForMe,
      policyMine,
      performanceReviewMine,
      performanceReviewForMe,
      oneOnOneMine,
      oneOnOneForMe,
      developmentPlanActionMine,
      developmentPlanActionForMe,
    ] = await Promise.all([
      this.safeProfileMine(actingWorkerId, tenantId),
      this.safeProfileForMe(actingWorkerId, auth.roleCodes, tenantId),
      this.safeEsignMine(userId, actingWorkerId, tenantId),
      this.safeEsignForMe(actingWorkerId, tenantId),
      this.safeLeaveMine(actingWorkerId, tenantId),
      this.safeLeaveForMe(actingWorkerId, tenantId),
      this.safePunchMine(actingWorkerId, tenantId),
      this.safePunchForMe(actingWorkerId, tenantId),
      this.safePolicyMine(userId, tenantId),
      this.safePerformanceReviewMine(actingWorkerId, tenantId),
      this.safePerformanceReviewForMe(actingWorkerId, tenantId),
      this.safeOneOnOneMine(actingWorkerId, tenantId),
      this.safeOneOnOneForMe(actingWorkerId, tenantId),
      this.safeDevelopmentPlanActionMine(actingWorkerId, tenantId),
      this.safeDevelopmentPlanActionForMe(actingWorkerId, tenantId),
    ]);

    const policyForMe: HubItem[] = [];

    let mine = this.sortItems([
      ...profileMine,
      ...esignMine,
      ...leaveMine,
      ...punchMine,
      ...policyMine,
      ...performanceReviewMine,
      ...oneOnOneMine,
      ...developmentPlanActionMine,
    ]);
    let forMe = this.sortItems([
      ...profileForMe,
      ...esignForMe,
      ...leaveForMe,
      ...punchForMe,
      ...policyForMe,
      ...performanceReviewForMe,
      ...oneOnOneForMe,
      ...developmentPlanActionForMe,
    ]);

    if (query.tab === 'mine') {
      forMe = [];
    } else if (query.tab === 'for_me') {
      mine = [];
    }

    const total = mine.length + forMe.length;
    const start = (page - 1) * limit;

    if (query.tab === 'mine') {
      mine = mine.slice(start, start + limit);
    } else if (query.tab === 'for_me') {
      forMe = forMe.slice(start, start + limit);
    } else {
      const combined = this.sortItems([...mine, ...forMe]).slice(
        start,
        start + limit,
      );
      const combinedIds = new Set(
        combined.map((i) => `${i.type}:${i.entityId}`),
      );
      mine = mine.filter((i) => combinedIds.has(`${i.type}:${i.entityId}`));
      forMe = forMe.filter((i) => combinedIds.has(`${i.type}:${i.entityId}`));
    }

    return {
      data: { mine, forMe },
      meta: { page, limit, total },
      errors: [],
    };
  }

  async listViews(
    userId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<HubSavedViewEntity[]> {
    try {
      return await this.savedViewRepository.find({
        where: { tenantId, userId },
        order: { createdAt: 'DESC' },
      });
    } catch {
      return [];
    }
  }

  async createView(
    userId: string,
    dto: CreateHubSavedViewDto,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<HubSavedViewEntity> {
    const view = this.savedViewRepository.create({
      tenantId,
      userId,
      name: dto.name,
      filters: dto.filters ?? {},
    });
    return this.savedViewRepository.save(view);
  }

  private sortItems(items: HubItem[]): HubItem[] {
    return [...items].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  private async safeProfileMine(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows = await this.profileChangeRepository.find({
        where: { tenantId, workerId: actingWorkerId },
        order: { createdAt: 'DESC' },
      });
      return rows.map((r) => this.toProfileItem(r));
    } catch {
      return [];
    }
  }

  private async safeProfileForMe(
    actingWorkerId: string | null,
    roleCodes: string[],
    tenantId: string,
  ): Promise<HubItem[]> {
    const canApprove = roleCodes.some((code) =>
      [
        PolarisRoleCode.PEOPLE_OPS,
        PolarisRoleCode.SUPER_ADMIN,
        PolarisRoleCode.MANAGER,
        PolarisRoleCode.DIVISION_HEAD,
      ].includes(code as PolarisRoleCode),
    );
    if (!canApprove) {
      return [];
    }

    try {
      const isPeopleOps = roleCodes.some((code) =>
        [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
          code as PolarisRoleCode,
        ),
      );

      if (isPeopleOps) {
        const rows = await this.profileChangeRepository.find({
          where: { tenantId, status: ApprovalStatus.SUBMITTED },
          order: { createdAt: 'DESC' },
        });
        return rows
          .filter((r) => !actingWorkerId || r.workerId !== actingWorkerId)
          .map((r) => this.toProfileItem(r));
      }

      if (!actingWorkerId) {
        return [];
      }
      const rows: Array<{
        id: string;
        status: string;
        createdAt: Date;
        workerId: string;
      }> = await this.dataSource.query(
        `
        SELECT p.id, p.status, p."createdAt", p."workerId"
        FROM profile_change_requests p
        INNER JOIN workers w ON w.id = p."workerId"
        WHERE p."tenantId" = $1
          AND p.status = $2
          AND w."managerId" = $3
        ORDER BY p."createdAt" DESC
        LIMIT 100
        `,
        [tenantId, ApprovalStatus.SUBMITTED, actingWorkerId],
      );
      return rows.map((r) =>
        this.toProfileItem({
          id: r.id,
          status: r.status as ApprovalStatus,
          createdAt: new Date(r.createdAt),
          workerId: r.workerId,
        } as ProfileChangeRequestEntity),
      );
    } catch {
      return [];
    }
  }

  private toProfileItem(r: ProfileChangeRequestEntity): HubItem {
    return {
      id: `profile_change_request:${r.id}`,
      type: 'profile_change_request',
      title: 'Profile change request',
      status: r.status,
      createdAt: r.createdAt,
      href: `/people-ops/workers?profileChangeRequestId=${r.id}`,
      entityId: r.id,
    };
  }

  private async safeLeaveMine(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        status: string;
        createdAt: Date;
        startDate: string;
        endDate: string;
      }> = await this.dataSource.query(
        `
        SELECT id, status, "createdAt", "startDate", "endDate"
        FROM leave_requests
        WHERE "tenantId" = $1
          AND "workerId" = $2
          AND status IN ($3, $4, $5)
        ORDER BY "createdAt" DESC
        LIMIT 100
        `,
        [
          tenantId,
          actingWorkerId,
          LeaveRequestStatus.SUBMITTED,
          LeaveRequestStatus.APPROVED,
          LeaveRequestStatus.REJECTED,
        ],
      );
      return rows.map((r) => ({
        id: `leave_request:${r.id}`,
        type: 'leave_request' as const,
        title: `Leave ${r.startDate} → ${r.endDate}`,
        status: r.status,
        createdAt: new Date(r.createdAt),
        href: `/employee/leave?requestId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safeLeaveForMe(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        status: string;
        createdAt: Date;
        startDate: string;
        endDate: string;
      }> = await this.dataSource.query(
        `
        SELECT id, status, "createdAt", "startDate", "endDate"
        FROM leave_requests
        WHERE "tenantId" = $1
          AND status = $2
          AND (
            "approverId" = $3
            OR "managerId" = $3
          )
        ORDER BY "createdAt" DESC
        LIMIT 100
        `,
        [tenantId, LeaveRequestStatus.SUBMITTED, actingWorkerId],
      );
      return rows.map((r) => ({
        id: `leave_request:${r.id}`,
        type: 'leave_request' as const,
        title: `Leave approval ${r.startDate} → ${r.endDate}`,
        status: r.status,
        createdAt: new Date(r.createdAt),
        href: `/manager/cockpit?leaveRequestId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safePunchMine(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        status: string;
        createdAt: Date;
      }> = await this.dataSource.query(
        `
        SELECT id, status, "createdAt"
        FROM punch_correction_requests
        WHERE "tenantId" = $1
          AND "workerId" = $2
        ORDER BY "createdAt" DESC
        LIMIT 100
        `,
        [tenantId, actingWorkerId],
      );
      return rows.map((r) => ({
        id: `punch_correction:${r.id}`,
        type: 'punch_correction' as const,
        title: 'Punch correction',
        status: r.status,
        createdAt: new Date(r.createdAt),
        href: `/employee/home?punchCorrectionId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safePunchForMe(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        status: string;
        createdAt: Date;
      }> = await this.dataSource.query(
        `
        SELECT c.id, c.status, c."createdAt"
        FROM punch_correction_requests c
        INNER JOIN workers w ON w.id = c."workerId"
        WHERE c."tenantId" = $1
          AND c.status = $2
          AND (
            c."approverId" = $3
            OR w."managerId" = $3
          )
        ORDER BY c."createdAt" DESC
        LIMIT 100
        `,
        [tenantId, PunchCorrectionStatus.SUBMITTED, actingWorkerId],
      );
      return rows.map((r) => ({
        id: `punch_correction:${r.id}`,
        type: 'punch_correction' as const,
        title: 'Punch correction approval',
        status: r.status,
        createdAt: new Date(r.createdAt),
        href: `/manager/cockpit?punchCorrectionId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safePolicyMine(
    userId: string,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!this.policyService) {
      return [];
    }
    try {
      const pending = await this.policyService.getPendingAcknowledgements(
        userId,
        tenantId,
      );
      return pending.map((p) => ({
        id: `policy_acknowledgement:${p.policyVersionId}`,
        type: 'policy_acknowledgement' as const,
        title: p.policyTitle,
        status: 'pending',
        createdAt: new Date(p.effectiveFrom),
        href: `/employee/policies?versionId=${p.policyVersionId}`,
        entityId: p.policyVersionId,
      }));
    } catch {
      return [];
    }
  }

  private async safeEsignMine(
    userId: string,
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    try {
      const rows: Array<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
      }> = await this.dataSource.query(
        `
        SELECT e.id, e.title, e.status, e."createdAt"
        FROM esign_envelopes e
        WHERE e."tenantId" = $1
          AND (
            e."createdBy" = $2
            OR EXISTS (
              SELECT 1 FROM esign_signatories s
              WHERE s."envelopeId" = e.id
                AND s."workerId" = $3
            )
          )
        ORDER BY e."createdAt" DESC
        LIMIT 100
        `,
        [tenantId, userId, actingWorkerId],
      );
      return rows.map((r) => this.toEsignItem(r));
    } catch {
      return [];
    }
  }

  private async safeEsignForMe(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
      }> = await this.dataSource.query(
        `
        SELECT e.id, e.title, e.status, e."createdAt"
        FROM esign_envelopes e
        INNER JOIN esign_signatories s ON s."envelopeId" = e.id
        WHERE e."tenantId" = $1
          AND s."workerId" = $2
          AND s.status = $3
          AND e.status IN ($4, $5)
        ORDER BY e."createdAt" DESC
        LIMIT 100
        `,
        [
          tenantId,
          actingWorkerId,
          EsignSignatoryStatus.PENDING,
          EsignEnvelopeStatus.SENT,
          EsignEnvelopeStatus.PARTIALLY_SIGNED,
        ],
      );
      return rows.map((r) => this.toEsignItem(r));
    } catch {
      return [];
    }
  }

  private toEsignItem(r: {
    id: string;
    title: string;
    status: string;
    createdAt: Date;
  }): HubItem {
    return {
      id: `esign_envelope:${r.id}`,
      type: 'esign_envelope',
      title: r.title,
      status: r.status,
      createdAt: new Date(r.createdAt),
      href: `/hub?esignEnvelopeId=${r.id}`,
      entityId: r.id,
    };
  }

  private async safePerformanceReviewMine(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        status: string;
        createdAt: Date;
      }> = await this.dataSource.query(
        `
        SELECT id, status, "createdAt"
        FROM performance_reviews
        WHERE "tenantId" = $1
          AND "workerId" = $2
          AND status = $3
        ORDER BY "createdAt" DESC
        LIMIT 100
        `,
        [tenantId, actingWorkerId, ReviewStatus.PENDING_SELF],
      );
      return rows.map((r) => ({
        id: `performance_review:${r.id}`,
        type: 'performance_review' as const,
        title: 'Self-assessment due',
        status: r.status,
        createdAt: new Date(r.createdAt),
        href: `/employee/performance?reviewId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safePerformanceReviewForMe(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        status: string;
        createdAt: Date;
      }> = await this.dataSource.query(
        `
        SELECT id, status, "createdAt"
        FROM performance_reviews
        WHERE "tenantId" = $1
          AND "managerWorkerId" = $2
          AND status = $3
        ORDER BY "createdAt" DESC
        LIMIT 100
        `,
        [tenantId, actingWorkerId, ReviewStatus.PENDING_MANAGER],
      );
      return rows.map((r) => ({
        id: `performance_review:${r.id}`,
        type: 'performance_review' as const,
        title: 'Manager review due',
        status: r.status,
        createdAt: new Date(r.createdAt),
        href: `/manager/performance?reviewId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safeOneOnOneMine(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        status: string;
        scheduledAt: Date;
        managerFirstName: string;
        managerLastName: string;
      }> = await this.dataSource.query(
        `
        SELECT m.id, m.status, m."scheduledAt",
               w."firstName" AS "managerFirstName", w."lastName" AS "managerLastName"
        FROM one_on_one_meetings m
        INNER JOIN workers w ON w.id = m."managerWorkerId"
        WHERE m."tenantId" = $1
          AND m."employeeWorkerId" = $2
          AND m.status = $3
          AND m."scheduledAt" >= now()
        ORDER BY m."scheduledAt" ASC
        LIMIT 100
        `,
        [tenantId, actingWorkerId, OneOnOneStatus.SCHEDULED],
      );
      return rows.map((r) => ({
        id: `one_on_one:${r.id}`,
        type: 'one_on_one' as const,
        title: `Upcoming 1:1 with ${r.managerFirstName} ${r.managerLastName}`,
        status: r.status,
        createdAt: new Date(r.scheduledAt),
        href: `/employee/performance?meetingId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safeOneOnOneForMe(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        status: string;
        scheduledAt: Date;
        employeeFirstName: string;
        employeeLastName: string;
      }> = await this.dataSource.query(
        `
        SELECT m.id, m.status, m."scheduledAt",
               w."firstName" AS "employeeFirstName", w."lastName" AS "employeeLastName"
        FROM one_on_one_meetings m
        INNER JOIN workers w ON w.id = m."employeeWorkerId"
        WHERE m."tenantId" = $1
          AND m."managerWorkerId" = $2
          AND m.status = $3
          AND m."scheduledAt" >= now()
        ORDER BY m."scheduledAt" ASC
        LIMIT 100
        `,
        [tenantId, actingWorkerId, OneOnOneStatus.SCHEDULED],
      );
      return rows.map((r) => ({
        id: `one_on_one:${r.id}`,
        type: 'one_on_one' as const,
        title: `Upcoming 1:1 with ${r.employeeFirstName} ${r.employeeLastName}`,
        status: r.status,
        createdAt: new Date(r.scheduledAt),
        href: `/manager/performance?meetingId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safeDevelopmentPlanActionMine(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
      }> = await this.dataSource.query(
        `
        SELECT a.id, a.title, a.status, a."createdAt"
        FROM development_plan_actions a
        INNER JOIN development_plans p ON p.id = a."planId"
        WHERE a."tenantId" = $1
          AND p."workerId" = $2
          AND a.status IN ($3, $4)
        ORDER BY a."createdAt" DESC
        LIMIT 100
        `,
        [
          tenantId,
          actingWorkerId,
          DevelopmentActionStatus.PENDING,
          DevelopmentActionStatus.IN_PROGRESS,
        ],
      );
      return rows.map((r) => ({
        id: `development_plan_action:${r.id}`,
        type: 'development_plan_action' as const,
        title: r.title,
        status: r.status,
        createdAt: new Date(r.createdAt),
        href: `/employee/performance?developmentActionId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safeDevelopmentPlanActionForMe(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        workerFirstName: string;
        workerLastName: string;
      }> = await this.dataSource.query(
        `
        SELECT a.id, a.title, a.status, a."createdAt",
               w."firstName" AS "workerFirstName", w."lastName" AS "workerLastName"
        FROM development_plan_actions a
        INNER JOIN development_plans p ON p.id = a."planId"
        INNER JOIN workers w ON w.id = p."workerId"
        WHERE a."tenantId" = $1
          AND w."managerId" = $2
          AND a.status = $3
        ORDER BY a."createdAt" DESC
        LIMIT 100
        `,
        [tenantId, actingWorkerId, DevelopmentActionStatus.PENDING],
      );
      return rows.map((r) => ({
        id: `development_plan_action:${r.id}`,
        type: 'development_plan_action' as const,
        title: `${r.title} (${r.workerFirstName} ${r.workerLastName})`,
        status: r.status,
        createdAt: new Date(r.createdAt),
        href: `/manager/performance?developmentActionId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }
}
