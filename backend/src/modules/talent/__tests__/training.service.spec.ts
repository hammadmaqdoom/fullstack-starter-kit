import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingAssignmentEntity } from '../entities/training-assignment.entity';
import { TrainingCompletionEntity } from '../entities/training-completion.entity';
import { TrainingCourseEntity } from '../entities/training-course.entity';
import {
  TrainingAssignmentStatus,
  TrainingVerificationMethod,
} from '../enums/training.enum';
import { TrainingService } from '../training.service';

describe('TrainingService', () => {
  let service: TrainingService;
  let courseRepository: jest.Mocked<
    Pick<Repository<TrainingCourseEntity>, 'create' | 'save' | 'findOne'>
  >;
  let assignmentRepository: jest.Mocked<
    Pick<Repository<TrainingAssignmentEntity>, 'create' | 'save' | 'findOne'>
  >;
  let completionRepository: jest.Mocked<
    Pick<Repository<TrainingCompletionEntity>, 'create' | 'save' | 'findOne'>
  >;
  let workerRepository: jest.Mocked<
    Pick<Repository<WorkerEntity>, 'find' | 'findOne'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let getAuthContext: jest.Mock;

  const tenantId = DIGITARO_TENANT_ID;
  const employeeAuth = {
    tenantId,
    userId: 'employee-1',
    roleCodes: [PolarisRoleCode.EMPLOYEE],
    assignments: [],
    broadestScope: ScopeType.OWN,
  };

  beforeEach(async () => {
    courseRepository = {
      create: jest.fn((entity) => entity as TrainingCourseEntity),
      save: jest.fn(
        async (entity) =>
          ({ ...entity, id: 'course-1' }) as TrainingCourseEntity,
      ),
      findOne: jest.fn(),
    } as unknown as typeof courseRepository;
    assignmentRepository = {
      create: jest.fn((entity) => entity as TrainingAssignmentEntity),
      save: jest.fn(
        async (entity) =>
          ({
            ...entity,
            id: entity.id ?? 'assign-1',
          }) as TrainingAssignmentEntity,
      ),
      findOne: jest.fn(),
    } as unknown as typeof assignmentRepository;
    completionRepository = {
      create: jest.fn((entity) => entity as TrainingCompletionEntity),
      save: jest.fn(
        async (entity) =>
          ({ ...entity, id: 'completion-1' }) as TrainingCompletionEntity,
      ),
      findOne: jest.fn(),
    } as unknown as typeof completionRepository;
    workerRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    } as unknown as typeof workerRepository;
    auditLogService = { append: jest.fn() };
    getAuthContext = jest.fn().mockResolvedValue(employeeAuth);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        {
          provide: getRepositoryToken(TrainingCourseEntity),
          useValue: courseRepository,
        },
        {
          provide: getRepositoryToken(TrainingAssignmentEntity),
          useValue: assignmentRepository,
        },
        {
          provide: getRepositoryToken(TrainingCompletionEntity),
          useValue: completionRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: { getAuthContext } },
      ],
    }).compile();

    service = module.get(TrainingService);
  });

  it('creates a training course and writes an audit log entry', async () => {
    const course = await service.createCourse(
      { title: 'Data Protection 101', courseType: 'mandatory' } as any,
      { userId: 'ops-user', tenantId },
    );

    expect(course.id).toBe('course-1');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'training_course.create' }),
    );
  });

  it('skips assignments that already exist for a worker/course pair', async () => {
    courseRepository.findOne.mockResolvedValue({
      id: 'course-1',
      tenantId,
    } as TrainingCourseEntity);
    workerRepository.find.mockResolvedValue([
      { id: 'worker-1' } as WorkerEntity,
    ]);
    assignmentRepository.findOne.mockResolvedValue({
      id: 'existing',
    } as TrainingAssignmentEntity);

    const created = await service.assignTraining(
      { courseId: 'course-1', workerIds: ['worker-1'] } as any,
      { userId: 'ops-user', tenantId },
    );

    expect(created).toHaveLength(0);
    expect(assignmentRepository.save).not.toHaveBeenCalled();
  });

  it('denies self-attestation completion for anyone other than the assigned worker', async () => {
    assignmentRepository.findOne.mockResolvedValue({
      id: 'assign-1',
      tenantId,
      workerId: 'worker-1',
      status: TrainingAssignmentStatus.ASSIGNED,
    } as TrainingAssignmentEntity);
    workerRepository.findOne.mockResolvedValue({
      id: 'worker-2',
    } as WorkerEntity);

    await expect(
      service.completeAssignment(
        'assign-1',
        { verificationMethod: TrainingVerificationMethod.SELF_ATTEST } as any,
        { userId: 'other-user', tenantId },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires manager or People Ops role for manager-verified completion', async () => {
    assignmentRepository.findOne.mockResolvedValue({
      id: 'assign-1',
      tenantId,
      workerId: 'worker-1',
      status: TrainingAssignmentStatus.ASSIGNED,
    } as TrainingAssignmentEntity);
    workerRepository.findOne.mockResolvedValue({
      id: 'worker-1',
    } as WorkerEntity);
    getAuthContext.mockResolvedValue({
      ...employeeAuth,
      roleCodes: [PolarisRoleCode.EMPLOYEE],
    });

    await expect(
      service.completeAssignment(
        'assign-1',
        {
          verificationMethod: TrainingVerificationMethod.MANAGER_VERIFIED,
        } as any,
        { userId: 'worker-1', tenantId },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('marks the assignment completed and records a completion for a valid self-attestation', async () => {
    assignmentRepository.findOne.mockResolvedValue({
      id: 'assign-1',
      tenantId,
      workerId: 'worker-1',
      status: TrainingAssignmentStatus.ASSIGNED,
    } as TrainingAssignmentEntity);
    workerRepository.findOne.mockResolvedValue({
      id: 'worker-1',
    } as WorkerEntity);
    completionRepository.findOne.mockResolvedValue(null);

    const completion = await service.completeAssignment(
      'assign-1',
      { verificationMethod: TrainingVerificationMethod.SELF_ATTEST } as any,
      { userId: 'worker-1', tenantId },
    );

    expect(completion.id).toBe('completion-1');
    expect(assignmentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: TrainingAssignmentStatus.COMPLETED }),
    );
  });

  it('rejects completing an assignment that already has a completion record', async () => {
    assignmentRepository.findOne.mockResolvedValue({
      id: 'assign-1',
      tenantId,
      workerId: 'worker-1',
      status: TrainingAssignmentStatus.COMPLETED,
    } as TrainingAssignmentEntity);
    workerRepository.findOne.mockResolvedValue({
      id: 'worker-1',
    } as WorkerEntity);
    completionRepository.findOne.mockResolvedValue({
      id: 'completion-1',
    } as TrainingCompletionEntity);

    await expect(
      service.completeAssignment(
        'assign-1',
        { verificationMethod: TrainingVerificationMethod.SELF_ATTEST } as any,
        { userId: 'worker-1', tenantId },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
