import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { HelpDeskSlaPolicyEntity } from '@/modules/operations/entities/help-desk-sla-policy.entity';
import { HelpDeskTicketEntity } from '@/modules/operations/entities/help-desk-ticket.entity';
import { TicketCommentEntity } from '@/modules/operations/entities/ticket-comment.entity';
import {
  HelpDeskPriority,
  HelpDeskQueue,
  HelpDeskStatus,
} from '@/modules/operations/enums/help-desk.enum';
import { HelpDeskService } from '@/modules/operations/help-desk.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

describe('HelpDeskService', () => {
  let service: HelpDeskService;
  let ticketRepository: jest.Mocked<
    Pick<
      Repository<HelpDeskTicketEntity>,
      'create' | 'save' | 'findOne' | 'createQueryBuilder'
    >
  >;
  let commentRepository: jest.Mocked<
    Pick<Repository<TicketCommentEntity>, 'create' | 'save'>
  >;
  let slaPolicyRepository: jest.Mocked<
    Pick<
      Repository<HelpDeskSlaPolicyEntity>,
      'findOne' | 'find' | 'create' | 'save'
    >
  >;
  let workerRepository: jest.Mocked<Pick<Repository<WorkerEntity>, 'findOne'>>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let getAuthContext: jest.Mock;

  const employeeWorkerId = 'w0000000-0000-4000-8000-000000000030';
  const itAdminWorkerId = 'w0000000-0000-4000-8000-000000000031';

  const employeeAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'employee-user',
    roleCodes: [PolarisRoleCode.EMPLOYEE],
    assignments: [],
    broadestScope: ScopeType.OWN,
  };
  const itAdminAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'it-admin-user',
    roleCodes: [PolarisRoleCode.IT_ADMIN],
    assignments: [],
    broadestScope: ScopeType.ALL,
  };

  const buildTicket = (
    overrides: Partial<HelpDeskTicketEntity> = {},
  ): HelpDeskTicketEntity =>
    ({
      id: 'ticket-1',
      tenantId: DIGITARO_TENANT_ID,
      requesterId: employeeWorkerId,
      assigneeId: null,
      queue: HelpDeskQueue.IT,
      subject: 'Laptop will not power on',
      description: 'Screen stays black on power button press',
      priority: HelpDeskPriority.P2,
      status: HelpDeskStatus.OPEN,
      attachments: [],
      slaTargetHours: 8,
      slaDueAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      slaBreached: false,
      resolvedAt: null,
      closedAt: null,
      comments: [],
      ...overrides,
    }) as HelpDeskTicketEntity;

  beforeEach(async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    } as unknown as SelectQueryBuilder<HelpDeskTicketEntity>;

    ticketRepository = {
      create: jest.fn((entity) => entity as HelpDeskTicketEntity),
      save: jest.fn(async (entity) => entity as HelpDeskTicketEntity),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as typeof ticketRepository;

    commentRepository = {
      create: jest.fn((entity) => entity as TicketCommentEntity),
      save: jest.fn(
        async (entity) =>
          ({ ...(entity as object), id: 'comment-1' }) as TicketCommentEntity,
      ),
    } as unknown as typeof commentRepository;

    slaPolicyRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sla-1',
        tenantId: DIGITARO_TENANT_ID,
        queue: HelpDeskQueue.IT,
        priority: HelpDeskPriority.P1,
        slaTargetHours: 4,
      } as HelpDeskSlaPolicyEntity),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((e) => e as HelpDeskSlaPolicyEntity),
      save: jest.fn(
        async (e) => ({ ...e, id: 'sla-1' }) as HelpDeskSlaPolicyEntity,
      ),
    } as unknown as typeof slaPolicyRepository;

    workerRepository = {
      findOne: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) => {
          if ('userId' in where) {
            const userId = where.userId as string;
            if (userId === 'employee-user')
              return { id: employeeWorkerId } as WorkerEntity;
            if (userId === 'it-admin-user')
              return { id: itAdminWorkerId } as WorkerEntity;
            return null;
          }
          return { id: where.id } as WorkerEntity;
        },
      ),
    };

    auditLogService = { append: jest.fn() };
    getAuthContext = jest.fn().mockResolvedValue(employeeAuth);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelpDeskService,
        {
          provide: getRepositoryToken(HelpDeskTicketEntity),
          useValue: ticketRepository,
        },
        {
          provide: getRepositoryToken(TicketCommentEntity),
          useValue: commentRepository,
        },
        {
          provide: getRepositoryToken(HelpDeskSlaPolicyEntity),
          useValue: slaPolicyRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: { getAuthContext } },
      ],
    }).compile();

    service = module.get(HelpDeskService);
  });

  describe('create', () => {
    it('auto-routes to the queue and resolves the SLA due date from policy', async () => {
      const result = await service.create(
        {
          queue: HelpDeskQueue.IT,
          subject: 'Broken laptop',
          description: 'Details',
          priority: HelpDeskPriority.P1,
        },
        'employee-user',
        'corr-1',
      );

      expect(result.requesterId).toBe(employeeWorkerId);
      expect(result.status).toBe(HelpDeskStatus.OPEN);
      expect(result.slaTargetHours).toBe(4);
      expect(result.slaDueAt).toBeInstanceOf(Date);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'help_desk_ticket.create' }),
      );
    });

    it('defaults to P3 priority when omitted', async () => {
      slaPolicyRepository.findOne.mockResolvedValue(null);
      const result = await service.create(
        {
          queue: HelpDeskQueue.HR,
          subject: 'Payslip question',
          description: 'Details',
        },
        'employee-user',
      );

      expect(result.priority).toBe(HelpDeskPriority.P3);
      expect(result.slaDueAt).toBeNull();
    });
  });

  describe('assign', () => {
    it('lets IT queue staff pick up an open IT ticket', async () => {
      getAuthContext.mockResolvedValue(itAdminAuth);
      ticketRepository.findOne.mockResolvedValue(buildTicket());

      const result = await service.assign(
        'ticket-1',
        { assigneeId: itAdminWorkerId },
        'it-admin-user',
        'corr-2',
      );

      expect(result.status).toBe(HelpDeskStatus.IN_PROGRESS);
      expect(result.assigneeId).toBe(itAdminWorkerId);
    });

    it('blocks staff from other queues from assigning', async () => {
      getAuthContext.mockResolvedValue({
        ...employeeAuth,
        roleCodes: [PolarisRoleCode.FINANCE],
      });
      ticketRepository.findOne.mockResolvedValue(buildTicket());

      await expect(
        service.assign(
          'ticket-1',
          { assigneeId: itAdminWorkerId },
          'finance-user',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('resolve', () => {
    it('requires mandatory resolution notes and records them as a comment', async () => {
      getAuthContext.mockResolvedValue(itAdminAuth);
      ticketRepository.findOne.mockResolvedValue(
        buildTicket({
          status: HelpDeskStatus.IN_PROGRESS,
          assigneeId: itAdminWorkerId,
        }),
      );

      const result = await service.resolve(
        'ticket-1',
        { resolutionNotes: 'Replaced charger. Confirmed working.' },
        'it-admin-user',
        'corr-3',
      );

      expect(result.status).toBe(HelpDeskStatus.RESOLVED);
      expect(result.resolvedAt).toBeInstanceOf(Date);
      expect(commentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Replaced charger. Confirmed working.',
        }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'help_desk_ticket.resolve' }),
      );
    });

    it('rejects resolving an open (unpicked) ticket', async () => {
      getAuthContext.mockResolvedValue(itAdminAuth);
      ticketRepository.findOne.mockResolvedValue(
        buildTicket({ status: HelpDeskStatus.OPEN }),
      );

      await expect(
        service.resolve(
          'ticket-1',
          { resolutionNotes: 'Fixed' },
          'it-admin-user',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('close', () => {
    it('lets the requester confirm close of a resolved ticket', async () => {
      ticketRepository.findOne.mockResolvedValue(
        buildTicket({ status: HelpDeskStatus.RESOLVED }),
      );

      const result = await service.close('ticket-1', 'employee-user');

      expect(result.status).toBe(HelpDeskStatus.CLOSED);
      expect(result.closedAt).toBeInstanceOf(Date);
    });

    it("blocks another employee from closing someone else's ticket", async () => {
      ticketRepository.findOne.mockResolvedValue(
        buildTicket({
          status: HelpDeskStatus.RESOLVED,
          requesterId: itAdminWorkerId,
        }),
      );

      await expect(
        service.close('ticket-1', 'employee-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('addComment', () => {
    it('redacts internal comments from the requester in findOne', async () => {
      ticketRepository.findOne.mockResolvedValue(
        buildTicket({
          comments: [
            {
              id: 'c1',
              body: 'Internal note',
              isInternal: true,
            } as TicketCommentEntity,
            {
              id: 'c2',
              body: 'Public update',
              isInternal: false,
            } as TicketCommentEntity,
          ],
        }),
      );

      const result = await service.findOne('ticket-1', 'employee-user');

      expect(result.comments).toHaveLength(1);
      expect(result.comments?.[0].body).toBe('Public update');
    });

    it('blocks a requester from posting an internal note', async () => {
      ticketRepository.findOne.mockResolvedValue(buildTicket());

      await expect(
        service.addComment(
          'ticket-1',
          { body: 'trying to be sneaky', isInternal: true },
          'employee-user',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
