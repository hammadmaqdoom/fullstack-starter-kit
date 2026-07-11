import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssignTicketDto,
  CreateHelpDeskTicketDto,
  CreateTicketCommentDto,
  QueryHelpDeskTicketsDto,
  ResolveTicketDto,
  UpdateHelpDeskTicketDto,
  UpsertHelpDeskSlaPolicyDto,
} from './dto/help-desk.dto';
import { HelpDeskSlaPolicyEntity } from './entities/help-desk-sla-policy.entity';
import { HelpDeskTicketEntity } from './entities/help-desk-ticket.entity';
import { TicketCommentEntity } from './entities/ticket-comment.entity';
import {
  HelpDeskPriority,
  HelpDeskQueue,
  HelpDeskStatus,
} from './enums/help-desk.enum';

const QUEUE_STAFF_ROLE: Record<HelpDeskQueue, PolarisRoleCode> = {
  [HelpDeskQueue.HR]: PolarisRoleCode.PEOPLE_OPS,
  [HelpDeskQueue.IT]: PolarisRoleCode.IT_ADMIN,
  [HelpDeskQueue.ADMIN]: PolarisRoleCode.PEOPLE_OPS,
  [HelpDeskQueue.FINANCE]: PolarisRoleCode.FINANCE,
};

/**
 * FLW-OPS-003 — help desk ticketing (PRD §6.18).
 * Open → In progress → Waiting on employee → Resolved → Closed. Queue
 * routing and SLA targets resolve from `help_desk_sla_policies`
 * (never hard-coded); resolution requires mandatory notes captured as a
 * ticket comment.
 */
@Injectable()
export class HelpDeskService {
  constructor(
    @InjectRepository(HelpDeskTicketEntity)
    private readonly ticketRepository: Repository<HelpDeskTicketEntity>,
    @InjectRepository(TicketCommentEntity)
    private readonly commentRepository: Repository<TicketCommentEntity>,
    @InjectRepository(HelpDeskSlaPolicyEntity)
    private readonly slaPolicyRepository: Repository<HelpDeskSlaPolicyEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async list(
    query: QueryHelpDeskTicketsDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<HelpDeskTicketEntity>> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isSuperAdmin = auth.roleCodes.includes(PolarisRoleCode.SUPER_ADMIN);
    const staffQueues = this.staffQueuesFor(auth.roleCodes);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.tenantId = :tenantId', { tenantId })
      .orderBy('ticket.createdAt', 'DESC');

    if (!isSuperAdmin && staffQueues.length === 0) {
      const actingWorkerId = await resolveActingWorkerId(
        this.workerRepository,
        actorId,
        tenantId,
      );
      if (!actingWorkerId) {
        return { items: [], meta: { page, limit, total: 0, totalPages: 0 } };
      }
      qb.andWhere('ticket.requesterId = :actingWorkerId', { actingWorkerId });
    } else if (!isSuperAdmin) {
      qb.andWhere('ticket.queue IN (:...staffQueues)', { staffQueues });
    }

    if (query.queue) {
      qb.andWhere('ticket.queue = :queue', { queue: query.queue });
    }
    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }
    if (query.requesterId) {
      qb.andWhere('ticket.requesterId = :requesterId', {
        requesterId: query.requesterId,
      });
    }
    if (query.unassigned) {
      qb.andWhere('ticket.assigneeId IS NULL');
    }

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(
    id: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<HelpDeskTicketEntity> {
    const ticket = await this.getTicketOrThrow(id, tenantId, ['comments']);
    const isStaff = await this.assertCanView(ticket, actorId, tenantId);

    if (!isStaff && ticket.comments) {
      ticket.comments = ticket.comments.filter((c) => !c.isInternal);
    }

    return ticket;
  }

  async create(
    dto: CreateHelpDeskTicketDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<HelpDeskTicketEntity> {
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );
    if (!actingWorkerId) {
      throw new ForbiddenException({
        code: 'HELP_DESK_ACCESS_DENIED',
        message: 'No worker profile linked to this account',
      });
    }

    const priority = dto.priority ?? HelpDeskPriority.P3;
    const slaPolicy = await this.slaPolicyRepository.findOne({
      where: { tenantId, queue: dto.queue, priority },
    });

    const now = new Date();
    const ticket = this.ticketRepository.create({
      tenantId,
      requesterId: actingWorkerId,
      queue: dto.queue,
      subject: dto.subject,
      description: dto.description,
      priority,
      status: HelpDeskStatus.OPEN,
      attachments: dto.attachments ?? [],
      slaTargetHours: slaPolicy?.slaTargetHours ?? null,
      slaDueAt: slaPolicy
        ? new Date(now.getTime() + slaPolicy.slaTargetHours * 60 * 60 * 1000)
        : null,
    });
    const saved = await this.ticketRepository.save(ticket);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'help_desk_ticket.create',
      entityType: 'help_desk_ticket',
      entityId: saved.id,
      changes: {
        queue: { old: null, new: saved.queue },
        priority: { old: null, new: saved.priority },
        status: { old: null, new: saved.status },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateHelpDeskTicketDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<HelpDeskTicketEntity> {
    const ticket = await this.getTicketOrThrow(id, tenantId);
    await this.assertStaffOrRequester(ticket, actorId, tenantId);

    if (dto.priority !== undefined) {
      ticket.priority = dto.priority;
    }
    if (dto.attachments !== undefined) {
      ticket.attachments = dto.attachments;
    }

    return this.ticketRepository.save(ticket);
  }

  async assign(
    id: string,
    dto: AssignTicketDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<HelpDeskTicketEntity> {
    const ticket = await this.getTicketOrThrow(id, tenantId);
    await this.assertQueueStaff(ticket.queue, actorId, tenantId);
    this.assertStatus(
      ticket,
      [HelpDeskStatus.OPEN, HelpDeskStatus.WAITING_ON_EMPLOYEE],
      'assign',
    );

    const before = ticket.status;
    ticket.assigneeId = dto.assigneeId;
    ticket.status = HelpDeskStatus.IN_PROGRESS;
    const saved = await this.ticketRepository.save(ticket);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'help_desk_ticket.assign',
      entityType: 'help_desk_ticket',
      entityId: saved.id,
      changes: {
        assigneeId: { old: null, new: saved.assigneeId },
        status: { old: before, new: saved.status },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async requestInfo(
    id: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<HelpDeskTicketEntity> {
    const ticket = await this.getTicketOrThrow(id, tenantId);
    await this.assertQueueStaff(ticket.queue, actorId, tenantId);
    this.assertStatus(ticket, [HelpDeskStatus.IN_PROGRESS], 'request-info');

    ticket.status = HelpDeskStatus.WAITING_ON_EMPLOYEE;
    return this.ticketRepository.save(ticket);
  }

  async addComment(
    id: string,
    dto: CreateTicketCommentDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TicketCommentEntity> {
    const ticket = await this.getTicketOrThrow(id, tenantId);
    const isStaff = await this.assertCanView(ticket, actorId, tenantId);

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );
    if (dto.isInternal && !isStaff) {
      throw new ForbiddenException({
        code: 'HELP_DESK_ACCESS_DENIED',
        message: 'Only staff can post internal notes',
      });
    }

    const comment = this.commentRepository.create({
      tenantId,
      ticketId: ticket.id,
      authorId: actingWorkerId ?? actorId,
      body: dto.body,
      isInternal: dto.isInternal ?? false,
    });

    if (
      isStaff &&
      ticket.status === HelpDeskStatus.WAITING_ON_EMPLOYEE &&
      !dto.isInternal
    ) {
      ticket.status = HelpDeskStatus.IN_PROGRESS;
      await this.ticketRepository.save(ticket);
    }

    return this.commentRepository.save(comment);
  }

  async resolve(
    id: string,
    dto: ResolveTicketDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<HelpDeskTicketEntity> {
    const ticket = await this.getTicketOrThrow(id, tenantId);
    await this.assertQueueStaff(ticket.queue, actorId, tenantId);
    this.assertStatus(
      ticket,
      [HelpDeskStatus.IN_PROGRESS, HelpDeskStatus.WAITING_ON_EMPLOYEE],
      'resolve',
    );

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );

    const before = ticket.status;
    ticket.status = HelpDeskStatus.RESOLVED;
    ticket.resolvedAt = new Date();
    ticket.slaBreached = this.isPastDue(ticket);
    const saved = await this.ticketRepository.save(ticket);

    await this.commentRepository.save(
      this.commentRepository.create({
        tenantId,
        ticketId: saved.id,
        authorId: actingWorkerId ?? actorId,
        body: dto.resolutionNotes,
        isInternal: false,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'help_desk_ticket.resolve',
      entityType: 'help_desk_ticket',
      entityId: saved.id,
      changes: {
        status: { old: before, new: saved.status },
        resolutionNotes: { old: null, new: dto.resolutionNotes },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async close(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<HelpDeskTicketEntity> {
    const ticket = await this.getTicketOrThrow(id, tenantId);
    await this.assertStaffOrRequester(ticket, actorId, tenantId);
    this.assertStatus(ticket, [HelpDeskStatus.RESOLVED], 'close');

    const before = ticket.status;
    ticket.status = HelpDeskStatus.CLOSED;
    ticket.closedAt = new Date();
    const saved = await this.ticketRepository.save(ticket);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'help_desk_ticket.close',
      entityType: 'help_desk_ticket',
      entityId: saved.id,
      changes: { status: { old: before, new: saved.status } },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async listSlaPolicies(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<HelpDeskSlaPolicyEntity[]> {
    return this.slaPolicyRepository.find({
      where: { tenantId },
      order: { queue: 'ASC', priority: 'ASC' },
    });
  }

  async upsertSlaPolicy(
    dto: UpsertHelpDeskSlaPolicyDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<HelpDeskSlaPolicyEntity> {
    const existing = await this.slaPolicyRepository.findOne({
      where: { tenantId, queue: dto.queue, priority: dto.priority },
    });

    const policy = this.slaPolicyRepository.create({
      ...existing,
      tenantId,
      queue: dto.queue,
      priority: dto.priority,
      slaTargetHours: dto.slaTargetHours,
    });
    const saved = await this.slaPolicyRepository.save(policy);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: existing
        ? 'help_desk_sla_policy.update'
        : 'help_desk_sla_policy.create',
      entityType: 'help_desk_sla_policy',
      entityId: saved.id,
      changes: {
        slaTargetHours: {
          old: existing?.slaTargetHours ?? null,
          new: saved.slaTargetHours,
        },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  private isPastDue(ticket: HelpDeskTicketEntity): boolean {
    return !!ticket.slaDueAt && ticket.slaDueAt.getTime() < Date.now();
  }

  private staffQueuesFor(roleCodes: string[]): HelpDeskQueue[] {
    return (Object.keys(QUEUE_STAFF_ROLE) as HelpDeskQueue[]).filter((queue) =>
      roleCodes.includes(QUEUE_STAFF_ROLE[queue]),
    );
  }

  private async assertQueueStaff(
    queue: HelpDeskQueue,
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isSuperAdmin = auth.roleCodes.includes(PolarisRoleCode.SUPER_ADMIN);
    const isQueueStaff = auth.roleCodes.includes(QUEUE_STAFF_ROLE[queue]);
    if (!isSuperAdmin && !isQueueStaff) {
      throw new ForbiddenException({
        code: 'HELP_DESK_ACCESS_DENIED',
        message: `${queue.toUpperCase()} queue staff access required`,
      });
    }
  }

  private async assertStaffOrRequester(
    ticket: HelpDeskTicketEntity,
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const isStaff = await this.assertCanView(ticket, actorId, tenantId);
    if (isStaff) {
      return;
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );
    if (actingWorkerId !== ticket.requesterId) {
      throw new ForbiddenException({
        code: 'HELP_DESK_ACCESS_DENIED',
        message: 'Only the requester or queue staff may manage this ticket',
      });
    }
  }

  /** Returns true when the actor is queue staff or a super admin. */
  private async assertCanView(
    ticket: HelpDeskTicketEntity,
    actorId: string,
    tenantId: string,
  ): Promise<boolean> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isSuperAdmin = auth.roleCodes.includes(PolarisRoleCode.SUPER_ADMIN);
    const isQueueStaff = auth.roleCodes.includes(
      QUEUE_STAFF_ROLE[ticket.queue],
    );
    if (isSuperAdmin || isQueueStaff) {
      return true;
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );
    if (actingWorkerId && actingWorkerId === ticket.requesterId) {
      return false;
    }

    throw new ForbiddenException({
      code: 'HELP_DESK_ACCESS_DENIED',
      message: 'Insufficient permissions for this ticket',
    });
  }

  private assertStatus(
    ticket: HelpDeskTicketEntity,
    allowed: HelpDeskStatus[],
    action: string,
  ): void {
    if (!allowed.includes(ticket.status)) {
      throw new BadRequestException({
        code: 'HELP_DESK_TICKET_INVALID_STATUS',
        message: `Cannot ${action} a ticket in status ${ticket.status}`,
      });
    }
  }

  private async getTicketOrThrow(
    id: string,
    tenantId: string,
    relations: string[] = [],
  ): Promise<HelpDeskTicketEntity> {
    const ticket = await this.ticketRepository.findOne({
      where: { id, tenantId },
      relations,
    });

    if (!ticket) {
      throw new NotFoundException({
        code: 'HELP_DESK_TICKET_NOT_FOUND',
        message: 'Help desk ticket not found',
      });
    }

    return ticket;
  }
}
