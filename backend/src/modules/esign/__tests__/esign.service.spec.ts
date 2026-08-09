import { Queue as QueueEnum } from '@/constants/job.constant';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MailService } from '@/shared/mail/mail.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EsignAuditEventEntity } from '../entities/esign-audit-event.entity';
import { EsignEnvelopeEntity } from '../entities/esign-envelope.entity';
import { EsignFieldEntity } from '../entities/esign-field.entity';
import { EsignSignatoryEntity } from '../entities/esign-signatory.entity';
import {
  EsignEnvelopeStatus,
  EsignFieldType,
  EsignSignatoryStatus,
} from '../enums/esign.enum';
import { EsignBlobStorageService } from '../esign-blob-storage.service';
import { EsignService } from '../esign.service';
import { PADES_SEALING_SERVICE } from '../interfaces/pades-sealing.interface';

describe('EsignService', () => {
  let service: EsignService;
  let envelopeRepository: jest.Mocked<
    Pick<
      Repository<EsignEnvelopeEntity>,
      'findOne' | 'save' | 'create' | 'find'
    >
  >;
  let signatoryRepository: jest.Mocked<
    Pick<
      Repository<EsignSignatoryEntity>,
      'find' | 'save' | 'create' | 'findOne'
    >
  >;
  let fieldRepository: jest.Mocked<
    Pick<Repository<EsignFieldEntity>, 'save' | 'create'>
  >;
  let esignAuditRepository: jest.Mocked<
    Pick<Repository<EsignAuditEventEntity>, 'save' | 'create' | 'find'>
  >;
  let workerRepository: jest.Mocked<Pick<Repository<WorkerEntity>, 'findOne'>>;
  let rbacService: jest.Mocked<Pick<RbacService, 'getAuthContext'>>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let dataSource: { transaction: jest.Mock };
  let esignQueue: { add: jest.Mock };
  let blobStorage: jest.Mocked<
    Pick<EsignBlobStorageService, 'upload' | 'download'>
  >;
  let padesSealing: { isConfigured: jest.Mock; seal: jest.Mock };
  let mailService: {
    sendEsignSigningInviteMail: jest.Mock;
    sendEsignReminderMail: jest.Mock;
  };

  const actor = {
    userId: 'user-ops',
    tenantId: DIGITARO_TENANT_ID,
    correlationId: 'corr-1',
  };

  const signatoryA: EsignSignatoryEntity = {
    id: 'sig-a',
    tenantId: DIGITARO_TENANT_ID,
    envelopeId: 'env-1',
    workerId: 'worker-1',
    email: 'a@example.com',
    name: 'Alice',
    signingOrder: 1,
    status: EsignSignatoryStatus.PENDING,
    signedAt: null,
    signatureBlobUrl: null,
    signatureMethod: null,
    signingTokenHash: null,
    signingTokenExpiresAt: null,
    signingTokenUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const signatoryB: EsignSignatoryEntity = {
    ...signatoryA,
    id: 'sig-b',
    email: 'b@example.com',
    name: 'Bob',
    signingOrder: 2,
  };

  const draftEnvelope: EsignEnvelopeEntity = {
    id: 'env-1',
    tenantId: DIGITARO_TENANT_ID,
    title: 'Offer letter',
    status: EsignEnvelopeStatus.DRAFT,
    documentBlobUrl: 'blob://doc',
    createdBy: actor.userId,
    completedAt: null,
    voidedReason: null,
    expiresAt: null,
    sealedBlobUrl: null,
    certificateBlobUrl: null,
    signedCopyBlobUrl: null,
    lastReminderAt: null,
    signatories: [signatoryA, signatoryB],
    fields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    envelopeRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (e) => e as EsignEnvelopeEntity),
      create: jest.fn((e) => e as EsignEnvelopeEntity),
      find: jest.fn().mockResolvedValue([]),
    } as unknown as typeof envelopeRepository;
    signatoryRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(async (e) => e as EsignSignatoryEntity),
      create: jest.fn((e) => e as EsignSignatoryEntity),
    } as unknown as typeof signatoryRepository;
    fieldRepository = {
      save: jest.fn(),
      create: jest.fn((e) => e as EsignFieldEntity),
    } as unknown as typeof fieldRepository;
    esignAuditRepository = {
      save: jest.fn(async (e) => e as EsignAuditEventEntity),
      create: jest.fn((e) => e as EsignAuditEventEntity),
      find: jest.fn().mockResolvedValue([]),
    } as unknown as typeof esignAuditRepository;
    workerRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'worker-1' }),
    } as unknown as typeof workerRepository;
    rbacService = {
      getAuthContext: jest.fn().mockResolvedValue({
        roleCodes: [PolarisRoleCode.PEOPLE_OPS],
        assignments: [],
        broadestScope: null,
      }),
    };
    auditLogService = { append: jest.fn() };
    esignQueue = { add: jest.fn().mockResolvedValue({}) };
    blobStorage = {
      upload: jest
        .fn()
        .mockResolvedValue(
          'https://example-bucket.s3.amazonaws.com/esign/certificates/env-1-certificate.pdf',
        ),
      download: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 stub')),
    };
    padesSealing = {
      isConfigured: jest.fn().mockReturnValue(false),
      seal: jest.fn().mockResolvedValue({
        sealed: false,
        sealedBlobUrl: null,
        reason: 'not_configured',
      }),
    };
    mailService = {
      sendEsignSigningInviteMail: jest.fn().mockResolvedValue(undefined),
      sendEsignReminderMail: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      transaction: jest.fn(async (cb) => {
        const manager = {
          create: (_Entity: unknown, data: unknown) => data,
          save: jest.fn(async (_Entity: unknown, data: unknown) => {
            if (Array.isArray(data)) {
              return data.map((row, i) => ({
                ...(row as object),
                id: `sig-${i}`,
              }));
            }
            return { ...(data as object), id: 'env-1' };
          }),
          getRepository: () => esignAuditRepository,
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EsignService,
        {
          provide: getRepositoryToken(EsignEnvelopeEntity),
          useValue: envelopeRepository,
        },
        {
          provide: getRepositoryToken(EsignSignatoryEntity),
          useValue: signatoryRepository,
        },
        {
          provide: getRepositoryToken(EsignFieldEntity),
          useValue: fieldRepository,
        },
        {
          provide: getRepositoryToken(EsignAuditEventEntity),
          useValue: esignAuditRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: rbacService },
        { provide: DataSource, useValue: dataSource },
        { provide: PADES_SEALING_SERVICE, useValue: padesSealing },
        { provide: getQueueToken(QueueEnum.Esign), useValue: esignQueue },
        { provide: EsignBlobStorageService, useValue: blobStorage },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(EsignService);
  });

  it('send transitions draft → sent and writes audit', async () => {
    envelopeRepository.findOne!.mockResolvedValue({ ...draftEnvelope });

    const result = await service.send('env-1', actor);

    expect(result.status).toBe(EsignEnvelopeStatus.SENT);
    expect(esignAuditRepository.save).toHaveBeenCalled();
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'esign.envelope.send' }),
    );
  });

  it('send rejects non-draft envelopes', async () => {
    envelopeRepository.findOne!.mockResolvedValue({
      ...draftEnvelope,
      status: EsignEnvelopeStatus.SENT,
    });

    await expect(service.send('env-1', actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('sign marks signatory and completes when all signed', async () => {
    const sent = {
      ...draftEnvelope,
      status: EsignEnvelopeStatus.SENT,
      signatories: [{ ...signatoryA }, { ...signatoryB }],
    };
    const completed = {
      ...sent,
      status: EsignEnvelopeStatus.COMPLETED,
      completedAt: new Date(),
    };
    envelopeRepository
      .findOne!.mockResolvedValueOnce(sent)
      .mockResolvedValue(completed);

    signatoryRepository.find!.mockResolvedValue([
      { ...signatoryA, status: EsignSignatoryStatus.SIGNED },
      { ...signatoryB, status: EsignSignatoryStatus.SIGNED },
    ]);

    const result = await service.sign(
      'env-1',
      { signatoryId: 'sig-a', signatureBlobUrl: 'blob://signatures/sig-a.png' },
      actor,
    );

    expect(signatoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sig-a',
        status: EsignSignatoryStatus.SIGNED,
      }),
    );
    expect(result.status).toBe(EsignEnvelopeStatus.COMPLETED);
    expect(esignQueue.add).toHaveBeenCalled();
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'esign.certificate.generate' }),
    );
  });

  it('sign sets partially_signed when others remain', async () => {
    const sent = {
      ...draftEnvelope,
      status: EsignEnvelopeStatus.SENT,
      signatories: [{ ...signatoryA }, { ...signatoryB }],
    };
    envelopeRepository
      .findOne!.mockResolvedValueOnce(sent)
      .mockResolvedValueOnce({
        ...sent,
        status: EsignEnvelopeStatus.PARTIALLY_SIGNED,
      });

    signatoryRepository.find!.mockResolvedValue([
      { ...signatoryA, status: EsignSignatoryStatus.SIGNED },
      { ...signatoryB, status: EsignSignatoryStatus.PENDING },
    ]);

    const result = await service.sign(
      'env-1',
      { signatoryId: 'sig-a', signatureBlobUrl: 'blob://signatures/sig-a.png' },
      actor,
    );

    expect(envelopeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: EsignEnvelopeStatus.PARTIALLY_SIGNED,
      }),
    );
    expect(result.status).toBe(EsignEnvelopeStatus.PARTIALLY_SIGNED);
  });

  it('rejects unauthorized sign for a different worker', async () => {
    workerRepository.findOne!.mockResolvedValue({
      id: 'worker-other',
    } as WorkerEntity);
    envelopeRepository.findOne!.mockResolvedValue({
      ...draftEnvelope,
      status: EsignEnvelopeStatus.SENT,
      signatories: [{ ...signatoryA }, { ...signatoryB }],
    });

    await expect(
      service.sign(
        'env-1',
        {
          signatoryId: 'sig-a',
          signatureBlobUrl: 'blob://signatures/sig-a.png',
        },
        {
          userId: 'user-other',
          tenantId: DIGITARO_TENANT_ID,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unauthorized findOne for non-signatory', async () => {
    rbacService.getAuthContext!.mockResolvedValue({
      roleCodes: [PolarisRoleCode.EMPLOYEE],
      assignments: [],
      broadestScope: null,
    } as never);
    workerRepository.findOne!.mockResolvedValue({
      id: 'worker-other',
    } as WorkerEntity);
    envelopeRepository.findOne!.mockResolvedValue({
      ...draftEnvelope,
      status: EsignEnvelopeStatus.SENT,
    });

    await expect(
      service.findOne('env-1', {
        userId: 'user-other',
        tenantId: DIGITARO_TENANT_ID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows People Ops findOne for any envelope', async () => {
    rbacService.getAuthContext!.mockResolvedValue({
      roleCodes: [PolarisRoleCode.PEOPLE_OPS],
      assignments: [],
      broadestScope: null,
    } as never);
    envelopeRepository.findOne!.mockResolvedValue({
      ...draftEnvelope,
      status: EsignEnvelopeStatus.SENT,
    });

    const result = await service.findOne('env-1', actor);

    expect(result.id).toBe('env-1');
  });

  describe('listPending', () => {
    it('returns pending envelopes for the acting worker with signatories', async () => {
      workerRepository.findOne!.mockResolvedValue({
        id: 'worker-1',
      } as WorkerEntity);
      signatoryRepository.find!.mockResolvedValue([signatoryA]);
      envelopeRepository.find!.mockResolvedValue([
        {
          ...draftEnvelope,
          status: EsignEnvelopeStatus.SENT,
          signatories: [signatoryA, signatoryB],
        },
      ]);

      const result = await service.listPending({
        userId: 'user-employee',
        tenantId: DIGITARO_TENANT_ID,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('env-1');
      expect(result[0].signatories).toHaveLength(2);
      expect(signatoryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workerId: 'worker-1',
            status: EsignSignatoryStatus.PENDING,
          }),
        }),
      );
    });

    it('returns empty when the user has no worker profile', async () => {
      workerRepository.findOne!.mockResolvedValue(null);

      const result = await service.listPending({
        userId: 'user-orphan',
        tenantId: DIGITARO_TENANT_ID,
      });

      expect(result).toEqual([]);
      expect(signatoryRepository.find).not.toHaveBeenCalled();
    });
  });

  it('create persists envelope via transaction', async () => {
    envelopeRepository.findOne!.mockResolvedValue({
      ...draftEnvelope,
      fields: [
        {
          id: 'field-1',
          tenantId: DIGITARO_TENANT_ID,
          envelopeId: 'env-1',
          signatoryId: 'sig-0',
          fieldType: EsignFieldType.SIGNATURE,
          page: 1,
          x: 10,
          y: 20,
          width: 100,
          height: 40,
          createdAt: new Date(),
        },
      ],
    });

    const result = await service.create(
      {
        title: 'Offer letter',
        documentBlobUrl: 'blob://doc',
        signatories: [
          {
            email: 'a@example.com',
            name: 'Alice',
            signingOrder: 1,
            workerId: 'worker-1',
          },
        ],
        fields: [
          {
            signatoryIndex: 0,
            fieldType: EsignFieldType.SIGNATURE,
            page: 1,
            x: 10,
            y: 20,
            width: 100,
            height: 40,
          },
        ],
      },
      actor,
    );

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(result.id).toBe('env-1');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'esign.envelope.create' }),
    );
  });

  it('exportPdf writes audit and returns document URL', async () => {
    envelopeRepository.findOne!.mockResolvedValue({
      ...draftEnvelope,
      status: EsignEnvelopeStatus.SENT,
    });

    const result = await service.exportPdf('env-1', actor);

    expect(result.documentBlobUrl).toBe('blob://doc');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'esign.envelope.export_pdf' }),
    );
  });

  it('manualUpload completes envelope and queues seal', async () => {
    envelopeRepository.findOne!.mockResolvedValue({
      ...draftEnvelope,
      status: EsignEnvelopeStatus.SENT,
      signatories: [{ ...signatoryA }],
    });

    const result = await service.manualUpload(
      'env-1',
      { signedCopyBlobUrl: 'blob://signed.pdf' },
      actor,
    );

    expect(result.status).toBe(EsignEnvelopeStatus.COMPLETED);
    expect(esignQueue.add).toHaveBeenCalled();
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'esign.envelope.manual_upload' }),
    );
  });

  it('issueSigningToken returns opaque token and stores hash', async () => {
    envelopeRepository.findOne!.mockResolvedValue({
      ...draftEnvelope,
      status: EsignEnvelopeStatus.SENT,
      signatories: [{ ...signatoryA }],
    });

    const result = await service.issueSigningToken(
      'env-1',
      { signatoryId: 'sig-a' },
      actor,
    );

    expect(result.token).toBeTruthy();
    expect(result.signatoryId).toBe('sig-a');
    expect(signatoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        signingTokenHash: expect.any(String),
        signingTokenExpiresAt: expect.any(Date),
      }),
    );
  });

  it('processReminderAndExpiryScan expires past-due envelopes', async () => {
    const past = new Date(Date.now() - 86_400_000);
    envelopeRepository.find!.mockResolvedValue([
      {
        ...draftEnvelope,
        status: EsignEnvelopeStatus.SENT,
        expiresAt: past,
        signatories: [{ ...signatoryA }],
      },
    ]);

    const result = await service.processReminderAndExpiryScan();

    expect(result.expired).toBe(1);
    expect(envelopeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: EsignEnvelopeStatus.EXPIRED }),
    );
  });

  describe('processSealJob', () => {
    it('persists sealedBlobUrl and writes audit log when sealing succeeds', async () => {
      envelopeRepository.findOne!.mockResolvedValue({
        ...draftEnvelope,
        status: EsignEnvelopeStatus.COMPLETED,
      });
      padesSealing.seal.mockResolvedValue({
        sealed: true,
        sealedBlobUrl:
          'https://bucket.s3.amazonaws.com/esign/sealed/env-1-sealed.pdf',
        reason: 'sealed_pades_b_t',
      });

      const result = await service.processSealJob('env-1', DIGITARO_TENANT_ID);

      expect(result.sealed).toBe(true);
      expect(envelopeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sealedBlobUrl:
            'https://bucket.s3.amazonaws.com/esign/sealed/env-1-sealed.pdf',
        }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'esign.envelope.seal' }),
      );
    });

    it('leaves envelope untouched when sealing is not configured', async () => {
      envelopeRepository.findOne!.mockResolvedValue({
        ...draftEnvelope,
        status: EsignEnvelopeStatus.COMPLETED,
      });
      padesSealing.seal.mockResolvedValue({
        sealed: false,
        sealedBlobUrl: null,
        reason: 'not_configured',
      });
      envelopeRepository.save!.mockClear();

      const result = await service.processSealJob('env-1', DIGITARO_TENANT_ID);

      expect(result.sealed).toBe(false);
      expect(result.reason).toBe('not_configured');
      expect(envelopeRepository.save).not.toHaveBeenCalled();
    });
  });
});
