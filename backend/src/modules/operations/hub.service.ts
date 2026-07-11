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
import { ContractorInvoiceStatus } from './enums/contractor-invoice.enum';
import { ExpenseClaimStatus } from './enums/expense.enum';
import { HelpDeskStatus } from './enums/help-desk.enum';
import { TravelRequestStatus } from './enums/travel.enum';

export type HubItemType =
  | 'profile_change_request'
  | 'leave_request'
  | 'punch_correction'
  | 'policy_acknowledgement'
  | 'esign_envelope'
  | 'performance_review'
  | 'one_on_one'
  | 'development_plan_action'
  | 'contractor_invoice'
  | 'expense_claim'
  | 'travel_request'
  | 'help_desk_ticket';

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
      contractorInvoiceMine,
      contractorInvoiceForMe,
      expenseClaimMine,
      expenseClaimForMe,
      travelRequestMine,
      travelRequestForMe,
      helpDeskTicketMine,
      helpDeskTicketForMe,
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
      this.safeContractorInvoiceMine(actingWorkerId, tenantId),
      this.safeContractorInvoiceForMe(actingWorkerId, auth.roleCodes, tenantId),
      this.safeExpenseClaimMine(actingWorkerId, tenantId),
      this.safeExpenseClaimForMe(actingWorkerId, auth.roleCodes, tenantId),
      this.safeTravelRequestMine(actingWorkerId, tenantId),
      this.safeTravelRequestForMe(actingWorkerId, auth.roleCodes, tenantId),
      this.safeHelpDeskTicketMine(actingWorkerId, tenantId),
      this.safeHelpDeskTicketForMe(actingWorkerId, auth.roleCodes, tenantId),
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
      ...contractorInvoiceMine,
      ...expenseClaimMine,
      ...travelRequestMine,
      ...helpDeskTicketMine,
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
      ...contractorInvoiceForMe,
      ...expenseClaimForMe,
      ...travelRequestForMe,
      ...helpDeskTicketForMe,
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

  private async safeContractorInvoiceMine(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        invoiceNumber: string;
        status: string;
        createdAt: Date;
      }> = await this.dataSource.query(
        `
        SELECT id, "invoiceNumber", status, "createdAt"
        FROM contractor_invoices
        WHERE "tenantId" = $1
          AND "workerId" = $2
          AND status IN ($3, $4, $5, $6, $7, $8)
        ORDER BY "createdAt" DESC
        LIMIT 100
        `,
        [
          tenantId,
          actingWorkerId,
          ContractorInvoiceStatus.SUBMITTED,
          ContractorInvoiceStatus.MANAGER_APPROVED,
          ContractorInvoiceStatus.FINANCE_APPROVED,
          ContractorInvoiceStatus.QUEUED,
          ContractorInvoiceStatus.PAID,
          ContractorInvoiceStatus.REJECTED,
        ],
      );
      return rows.map((r) => this.toContractorInvoiceItem(r, 'mine'));
    } catch {
      return [];
    }
  }

  private async safeContractorInvoiceForMe(
    actingWorkerId: string | null,
    roleCodes: string[],
    tenantId: string,
  ): Promise<HubItem[]> {
    const isManager = roleCodes.includes(PolarisRoleCode.MANAGER);
    const isFinancePrivileged = roleCodes.some((code) =>
      [
        PolarisRoleCode.FINANCE,
        PolarisRoleCode.PEOPLE_OPS,
        PolarisRoleCode.SUPER_ADMIN,
      ].includes(code as PolarisRoleCode),
    );

    if (!isManager && !isFinancePrivileged) {
      return [];
    }

    try {
      const items: HubItem[] = [];

      if (isManager && actingWorkerId) {
        const managerRows: Array<{
          id: string;
          invoiceNumber: string;
          status: string;
          createdAt: Date;
          workerFirstName: string;
          workerLastName: string;
        }> = await this.dataSource.query(
          `
          SELECT i.id, i."invoiceNumber", i.status, i."createdAt",
                 w."firstName" AS "workerFirstName", w."lastName" AS "workerLastName"
          FROM contractor_invoices i
          INNER JOIN workers w ON w.id = i."workerId"
          WHERE i."tenantId" = $1
            AND i.status = $2
            AND w."managerId" = $3
          ORDER BY i."createdAt" DESC
          LIMIT 100
          `,
          [tenantId, ContractorInvoiceStatus.SUBMITTED, actingWorkerId],
        );
        items.push(
          ...managerRows.map((r) =>
            this.toContractorInvoiceItem(r, 'manager', r),
          ),
        );
      }

      if (isFinancePrivileged) {
        const financeRows: Array<{
          id: string;
          invoiceNumber: string;
          status: string;
          createdAt: Date;
          workerFirstName: string;
          workerLastName: string;
        }> = await this.dataSource.query(
          `
          SELECT i.id, i."invoiceNumber", i.status, i."createdAt",
                 w."firstName" AS "workerFirstName", w."lastName" AS "workerLastName"
          FROM contractor_invoices i
          INNER JOIN workers w ON w.id = i."workerId"
          WHERE i."tenantId" = $1
            AND i.status = $2
          ORDER BY i."createdAt" DESC
          LIMIT 100
          `,
          [tenantId, ContractorInvoiceStatus.MANAGER_APPROVED],
        );
        items.push(
          ...financeRows.map((r) =>
            this.toContractorInvoiceItem(r, 'finance', r),
          ),
        );
      }

      return items;
    } catch {
      return [];
    }
  }

  private toContractorInvoiceItem(
    r: {
      id: string;
      invoiceNumber: string;
      status: string;
      createdAt: Date;
    },
    bucket: 'mine' | 'manager' | 'finance',
    worker?: { workerFirstName: string; workerLastName: string },
  ): HubItem {
    const contractorName = worker
      ? `${worker.workerFirstName} ${worker.workerLastName}`
      : null;

    let title = `Invoice ${r.invoiceNumber}`;
    let href = `/contractor/invoices?invoiceId=${r.id}`;

    if (bucket === 'manager') {
      title = contractorName
        ? `Invoice approval ${r.invoiceNumber} (${contractorName})`
        : `Invoice approval ${r.invoiceNumber}`;
      href = `/manager/cockpit?contractorInvoiceId=${r.id}`;
    } else if (bucket === 'finance') {
      title = contractorName
        ? `Finance approval ${r.invoiceNumber} (${contractorName})`
        : `Finance approval ${r.invoiceNumber}`;
      href = `/finance/contractor-invoices?invoiceId=${r.id}`;
    }

    return {
      id: `contractor_invoice:${r.id}`,
      type: 'contractor_invoice',
      title,
      status: r.status,
      createdAt: new Date(r.createdAt),
      href,
      entityId: r.id,
    };
  }

  private async safeExpenseClaimMine(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        category: string;
        amount: string;
        status: string;
        createdAt: Date;
      }> = await this.dataSource.query(
        `
        SELECT id, category, amount, status, "createdAt"
        FROM expense_claims
        WHERE "tenantId" = $1
          AND "workerId" = $2
          AND status IN ($3, $4, $5, $6)
        ORDER BY "createdAt" DESC
        LIMIT 100
        `,
        [
          tenantId,
          actingWorkerId,
          ExpenseClaimStatus.SUBMITTED,
          ExpenseClaimStatus.APPROVED,
          ExpenseClaimStatus.REJECTED,
          ExpenseClaimStatus.PAID,
        ],
      );
      return rows.map((r) => ({
        id: `expense_claim:${r.id}`,
        type: 'expense_claim' as const,
        title: `Expense claim — ${r.category} (${r.amount})`,
        status: r.status,
        createdAt: new Date(r.createdAt),
        href: `/employee/expenses?claimId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safeExpenseClaimForMe(
    actingWorkerId: string | null,
    roleCodes: string[],
    tenantId: string,
  ): Promise<HubItem[]> {
    const isManager = roleCodes.includes(PolarisRoleCode.MANAGER);
    const isFinancePrivileged = roleCodes.some((code) =>
      [
        PolarisRoleCode.FINANCE,
        PolarisRoleCode.PEOPLE_OPS,
        PolarisRoleCode.SUPER_ADMIN,
      ].includes(code as PolarisRoleCode),
    );
    if (!isManager && !isFinancePrivileged) {
      return [];
    }

    try {
      const items: HubItem[] = [];

      if (isManager && actingWorkerId) {
        const managerRows: Array<{
          id: string;
          category: string;
          amount: string;
          status: string;
          createdAt: Date;
        }> = await this.dataSource.query(
          `
          SELECT c.id, c.category, c.amount, c.status, c."createdAt"
          FROM expense_claims c
          INNER JOIN workers w ON w.id = c."workerId"
          WHERE c."tenantId" = $1
            AND c.status = $2
            AND w."managerId" = $3
          ORDER BY c."createdAt" DESC
          LIMIT 100
          `,
          [tenantId, ExpenseClaimStatus.SUBMITTED, actingWorkerId],
        );
        items.push(
          ...managerRows.map((r) => this.toExpenseClaimItem(r, 'manager')),
        );
      }

      if (isFinancePrivileged) {
        const financeRows: Array<{
          id: string;
          category: string;
          amount: string;
          status: string;
          createdAt: Date;
        }> = await this.dataSource.query(
          `
          SELECT id, category, amount, status, "createdAt"
          FROM expense_claims
          WHERE "tenantId" = $1
            AND status = $2
            AND "financeApprovedAt" IS NULL
          ORDER BY "createdAt" DESC
          LIMIT 100
          `,
          [tenantId, ExpenseClaimStatus.APPROVED],
        );
        items.push(
          ...financeRows.map((r) => this.toExpenseClaimItem(r, 'finance')),
        );
      }

      return items;
    } catch {
      return [];
    }
  }

  private toExpenseClaimItem(
    r: {
      id: string;
      category: string;
      amount: string;
      status: string;
      createdAt: Date;
    },
    bucket: 'manager' | 'finance',
  ): HubItem {
    return {
      id: `expense_claim:${r.id}`,
      type: 'expense_claim',
      title: `Expense approval — ${r.category} (${r.amount})`,
      status: r.status,
      createdAt: new Date(r.createdAt),
      href:
        bucket === 'manager'
          ? `/manager/cockpit?expenseClaimId=${r.id}`
          : `/finance/expenses?expenseClaimId=${r.id}`,
      entityId: r.id,
    };
  }

  private async safeTravelRequestMine(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        startDate: string;
        endDate: string;
        status: string;
        createdAt: Date;
      }> = await this.dataSource.query(
        `
        SELECT id, "startDate", "endDate", status, "createdAt"
        FROM travel_requests
        WHERE "tenantId" = $1
          AND "workerId" = $2
          AND status != $3
        ORDER BY "createdAt" DESC
        LIMIT 100
        `,
        [tenantId, actingWorkerId, TravelRequestStatus.DRAFT],
      );
      return rows.map((r) => ({
        id: `travel_request:${r.id}`,
        type: 'travel_request' as const,
        title: `Travel ${r.startDate} → ${r.endDate}`,
        status: r.status,
        createdAt: new Date(r.createdAt),
        href: `/employee/travel?requestId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safeTravelRequestForMe(
    actingWorkerId: string | null,
    roleCodes: string[],
    tenantId: string,
  ): Promise<HubItem[]> {
    const isManager = roleCodes.includes(PolarisRoleCode.MANAGER);
    const isFinance = roleCodes.some((code) =>
      [PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN].includes(
        code as PolarisRoleCode,
      ),
    );
    const isPeopleOps = roleCodes.some((code) =>
      [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
        code as PolarisRoleCode,
      ),
    );
    if (!isManager && !isFinance && !isPeopleOps) {
      return [];
    }

    try {
      const items: HubItem[] = [];

      if (isManager && actingWorkerId) {
        const managerRows: Array<{
          id: string;
          startDate: string;
          endDate: string;
          status: string;
          createdAt: Date;
        }> = await this.dataSource.query(
          `
          SELECT t.id, t."startDate", t."endDate", t.status, t."createdAt"
          FROM travel_requests t
          INNER JOIN workers w ON w.id = t."workerId"
          WHERE t."tenantId" = $1
            AND t.status = $2
            AND t."managerApprovedAt" IS NULL
            AND w."managerId" = $3
          ORDER BY t."createdAt" DESC
          LIMIT 100
          `,
          [tenantId, TravelRequestStatus.SUBMITTED, actingWorkerId],
        );
        items.push(
          ...managerRows.map((r) => this.toTravelRequestItem(r, 'manager')),
        );
      }

      if (isFinance) {
        const financeRows: Array<{
          id: string;
          startDate: string;
          endDate: string;
          status: string;
          createdAt: Date;
        }> = await this.dataSource.query(
          `
          SELECT id, "startDate", "endDate", status, "createdAt"
          FROM travel_requests
          WHERE "tenantId" = $1
            AND status = $2
            AND "managerApprovedAt" IS NOT NULL
            AND "financeApprovedAt" IS NULL
          ORDER BY "createdAt" DESC
          LIMIT 100
          `,
          [tenantId, TravelRequestStatus.SUBMITTED],
        );
        items.push(
          ...financeRows.map((r) => this.toTravelRequestItem(r, 'finance')),
        );
      }

      if (isPeopleOps) {
        const peopleOpsRows: Array<{
          id: string;
          startDate: string;
          endDate: string;
          status: string;
          createdAt: Date;
        }> = await this.dataSource.query(
          `
          SELECT id, "startDate", "endDate", status, "createdAt"
          FROM travel_requests
          WHERE "tenantId" = $1
            AND status = $2
            AND "managerApprovedAt" IS NOT NULL
            AND "peopleOpsApprovedAt" IS NULL
          ORDER BY "createdAt" DESC
          LIMIT 100
          `,
          [tenantId, TravelRequestStatus.SUBMITTED],
        );
        items.push(
          ...peopleOpsRows.map((r) =>
            this.toTravelRequestItem(r, 'people_ops'),
          ),
        );
      }

      return items;
    } catch {
      return [];
    }
  }

  private toTravelRequestItem(
    r: {
      id: string;
      startDate: string;
      endDate: string;
      status: string;
      createdAt: Date;
    },
    bucket: 'manager' | 'finance' | 'people_ops',
  ): HubItem {
    const hrefByBucket: Record<typeof bucket, string> = {
      manager: `/manager/cockpit?travelRequestId=${r.id}`,
      finance: `/finance/travel-requests?travelRequestId=${r.id}`,
      people_ops: `/people-ops/travel-requests?travelRequestId=${r.id}`,
    };
    return {
      id: `travel_request:${r.id}`,
      type: 'travel_request',
      title: `Travel approval ${r.startDate} → ${r.endDate}`,
      status: r.status,
      createdAt: new Date(r.createdAt),
      href: hrefByBucket[bucket],
      entityId: r.id,
    };
  }

  private async safeHelpDeskTicketMine(
    actingWorkerId: string | null,
    tenantId: string,
  ): Promise<HubItem[]> {
    if (!actingWorkerId) {
      return [];
    }
    try {
      const rows: Array<{
        id: string;
        subject: string;
        status: string;
        createdAt: Date;
      }> = await this.dataSource.query(
        `
        SELECT id, subject, status, "createdAt"
        FROM help_desk_tickets
        WHERE "tenantId" = $1
          AND "requesterId" = $2
          AND status != $3
        ORDER BY "createdAt" DESC
        LIMIT 100
        `,
        [tenantId, actingWorkerId, HelpDeskStatus.CLOSED],
      );
      return rows.map((r) => ({
        id: `help_desk_ticket:${r.id}`,
        type: 'help_desk_ticket' as const,
        title: r.subject,
        status: r.status,
        createdAt: new Date(r.createdAt),
        href: `/employee/help?ticketId=${r.id}`,
        entityId: r.id,
      }));
    } catch {
      return [];
    }
  }

  private async safeHelpDeskTicketForMe(
    actingWorkerId: string | null,
    roleCodes: string[],
    tenantId: string,
  ): Promise<HubItem[]> {
    const staffQueues: Array<[string, string]> = [
      ['it', PolarisRoleCode.IT_ADMIN],
      ['hr', PolarisRoleCode.PEOPLE_OPS],
      ['admin', PolarisRoleCode.PEOPLE_OPS],
      ['finance', PolarisRoleCode.FINANCE],
    ].filter(([, role]) => roleCodes.includes(role)) as Array<[string, string]>;
    const isSuperAdmin = roleCodes.includes(PolarisRoleCode.SUPER_ADMIN);
    if (staffQueues.length === 0 && !isSuperAdmin) {
      return [];
    }

    try {
      const items: HubItem[] = [];

      if (actingWorkerId) {
        const assignedRows: Array<{
          id: string;
          subject: string;
          status: string;
          createdAt: Date;
        }> = await this.dataSource.query(
          `
          SELECT id, subject, status, "createdAt"
          FROM help_desk_tickets
          WHERE "tenantId" = $1
            AND "assigneeId" = $2
            AND status IN ($3, $4)
          ORDER BY "createdAt" DESC
          LIMIT 100
          `,
          [
            tenantId,
            actingWorkerId,
            HelpDeskStatus.IN_PROGRESS,
            HelpDeskStatus.WAITING_ON_EMPLOYEE,
          ],
        );
        items.push(
          ...assignedRows.map((r) => this.toHelpDeskTicketItem(r, 'assigned')),
        );
      }

      const queues = isSuperAdmin
        ? ['hr', 'it', 'admin', 'finance']
        : staffQueues.map(([queue]) => queue);

      if (queues.length > 0) {
        const unassignedRows: Array<{
          id: string;
          subject: string;
          status: string;
          createdAt: Date;
        }> = await this.dataSource.query(
          `
          SELECT id, subject, status, "createdAt"
          FROM help_desk_tickets
          WHERE "tenantId" = $1
            AND status = $2
            AND "assigneeId" IS NULL
            AND queue = ANY($3)
          ORDER BY "createdAt" DESC
          LIMIT 100
          `,
          [tenantId, HelpDeskStatus.OPEN, queues],
        );
        items.push(
          ...unassignedRows.map((r) =>
            this.toHelpDeskTicketItem(r, 'unassigned'),
          ),
        );
      }

      return items;
    } catch {
      return [];
    }
  }

  private toHelpDeskTicketItem(
    r: { id: string; subject: string; status: string; createdAt: Date },
    bucket: 'assigned' | 'unassigned',
  ): HubItem {
    return {
      id: `help_desk_ticket:${r.id}`,
      type: 'help_desk_ticket',
      title: bucket === 'unassigned' ? `Unassigned: ${r.subject}` : r.subject,
      status: r.status,
      createdAt: new Date(r.createdAt),
      href: `/hub?helpDeskTicketId=${r.id}`,
      entityId: r.id,
    };
  }
}
