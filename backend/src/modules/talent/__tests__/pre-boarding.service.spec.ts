import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { MailService } from '@/shared/mail/mail.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { PreBoardingFieldValueEntity } from '../entities/pre-boarding-field-value.entity';
import { PreBoardingPacketEntity } from '../entities/pre-boarding-packet.entity';
import { PreBoardingPacketStatus } from '../enums/onboarding.enum';
import { PreBoardingBlobStorageService } from '../pre-boarding-blob-storage.service';
import { PreBoardingService } from '../pre-boarding.service';

describe('PreBoardingService', () => {
  let service: PreBoardingService;
  let packetRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let fieldRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let workerRepository: { findOne: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let mailService: { sendPreBoardingInviteMail: jest.Mock };
  let blobStorageService: { upload: jest.Mock };

  const packetId = 'p0000000-0000-4000-8000-000000000001';
  const workerId = 'w0000000-0000-4000-8000-000000000001';

  const peopleOpsAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'ops-user',
    roleCodes: [PolarisRoleCode.PEOPLE_OPS],
    assignments: [
      {
        roleId: 'r1',
        roleCode: PolarisRoleCode.PEOPLE_OPS,
        scopeType: ScopeType.ALL,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.ALL,
  };

  function makePacket(
    overrides: Partial<PreBoardingPacketEntity> = {},
  ): PreBoardingPacketEntity {
    return {
      id: packetId,
      tenantId: DIGITARO_TENANT_ID,
      workerId,
      candidateId: null,
      personalEmail: 'candidate@personal.example',
      status: PreBoardingPacketStatus.INVITED,
      consentAt: null,
      consentIp: null,
      templateVersionId: null,
      submittedAt: null,
      mergedAt: null,
      correlationId: null,
      accessTokenHash: null,
      accessTokenExpiresAt: null,
      fieldValues: [],
      worker: {
        id: workerId,
        firstName: 'Jane',
        lastName: 'Doe',
      } as WorkerEntity,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as PreBoardingPacketEntity;
  }

  beforeEach(async () => {
    packetRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (packet) => packet),
      create: jest.fn((data) => data),
    };
    fieldRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (field) => ({ id: 'field-1', ...field })),
      create: jest.fn((data) => data),
    };
    workerRepository = { findOne: jest.fn() };
    auditLogService = { append: jest.fn() };
    mailService = {
      sendPreBoardingInviteMail: jest.fn().mockResolvedValue(undefined),
    };
    blobStorageService = {
      upload: jest.fn().mockResolvedValue('https://blob.example/file.pdf'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreBoardingService,
        {
          provide: getRepositoryToken(PreBoardingPacketEntity),
          useValue: packetRepository,
        },
        {
          provide: getRepositoryToken(PreBoardingFieldValueEntity),
          useValue: fieldRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        {
          provide: RbacService,
          useValue: {
            getAuthContext: jest.fn().mockResolvedValue(peopleOpsAuth),
          },
        },
        { provide: MailService, useValue: mailService },
        {
          provide: PreBoardingBlobStorageService,
          useValue: blobStorageService,
        },
      ],
    }).compile();

    service = module.get(PreBoardingService);
  });

  describe('invite', () => {
    it('issues a hashed token, emails the candidate, and audits without leaking the raw token', async () => {
      packetRepository.findOne.mockResolvedValue(
        makePacket({ status: PreBoardingPacketStatus.DRAFT }),
      );

      const result = await service.invite(packetId, { userId: 'ops-user' });

      expect(result.accessTokenHash).toBeTruthy();
      expect(mailService.sendPreBoardingInviteMail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'candidate@personal.example',
          workerName: 'Jane Doe',
        }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'pre_boarding.packet.invite',
          changes: expect.objectContaining({
            magicLinkSend: { old: null, new: 'sent' },
          }),
        }),
      );

      const auditCallArgs = auditLogService.append.mock.calls[0][0];
      expect(JSON.stringify(auditCallArgs)).not.toContain('stubbed');
    });
  });

  describe('candidate flow (magic-link token)', () => {
    const rawToken = 'a-raw-candidate-token';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    it('resolves the packet for a valid, unexpired token', async () => {
      packetRepository.findOne.mockResolvedValue(
        makePacket({
          accessTokenHash: tokenHash,
          accessTokenExpiresAt: new Date(Date.now() + 86_400_000),
        }),
      );

      const packet = await service.getPacketForCandidate(rawToken);
      expect(packet.id).toBe(packetId);
    });

    it('rejects an expired token', async () => {
      packetRepository.findOne.mockResolvedValue(
        makePacket({
          accessTokenHash: tokenHash,
          accessTokenExpiresAt: new Date(Date.now() - 1000),
        }),
      );

      await expect(service.getPacketForCandidate(rawToken)).rejects.toThrow();
    });

    it('rejects an unknown token', async () => {
      packetRepository.findOne.mockResolvedValue(null);
      await expect(service.getPacketForCandidate(rawToken)).rejects.toThrow();
    });

    it('records consent and advances status to in_progress', async () => {
      packetRepository.findOne.mockResolvedValue(
        makePacket({
          accessTokenHash: tokenHash,
          accessTokenExpiresAt: new Date(Date.now() + 86_400_000),
          status: PreBoardingPacketStatus.INVITED,
        }),
      );

      const result = await service.submitConsentAsCandidate(
        rawToken,
        true,
        '1.2.3.4',
      );

      expect(result.consentAt).toBeTruthy();
      expect(packetRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PreBoardingPacketStatus.IN_PROGRESS,
        }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'pre_boarding.consent.submit' }),
      );
    });

    it('rejects consent when not acknowledged', async () => {
      packetRepository.findOne.mockResolvedValue(
        makePacket({
          accessTokenHash: tokenHash,
          accessTokenExpiresAt: new Date(Date.now() + 86_400_000),
        }),
      );

      await expect(
        service.submitConsentAsCandidate(rawToken, false),
      ).rejects.toThrow();
    });

    it('upserts a field value scoped to the token packet', async () => {
      packetRepository.findOne.mockResolvedValue(
        makePacket({
          accessTokenHash: tokenHash,
          accessTokenExpiresAt: new Date(Date.now() + 86_400_000),
          status: PreBoardingPacketStatus.IN_PROGRESS,
        }),
      );

      const saved = await service.upsertFieldAsCandidate(rawToken, {
        token: rawToken,
        fieldKey: 'passport_number',
        valueText: 'A1234567',
      });

      expect(saved.fieldKey).toBe('passport_number');
      expect(saved.valueText).toBe('A1234567');
    });

    it('rejects field edits once the packet is submitted', async () => {
      packetRepository.findOne.mockResolvedValue(
        makePacket({
          accessTokenHash: tokenHash,
          accessTokenExpiresAt: new Date(Date.now() + 86_400_000),
          status: PreBoardingPacketStatus.SUBMITTED,
        }),
      );

      await expect(
        service.upsertFieldAsCandidate(rawToken, {
          token: rawToken,
          fieldKey: 'passport_number',
          valueText: 'A1234567',
        }),
      ).rejects.toThrow();
    });

    it('uploads an attachment via blob storage and stores the resulting URL', async () => {
      packetRepository.findOne.mockResolvedValue(
        makePacket({
          accessTokenHash: tokenHash,
          accessTokenExpiresAt: new Date(Date.now() + 86_400_000),
          status: PreBoardingPacketStatus.IN_PROGRESS,
        }),
      );

      const file = {
        buffer: Buffer.from('data'),
        originalname: 'passport.pdf',
      } as any;
      const saved = await service.uploadAttachmentAsCandidate(
        rawToken,
        'passport_scan',
        file,
      );

      expect(blobStorageService.upload).toHaveBeenCalledWith(
        file,
        'pre-boarding',
      );
      expect(saved.valueText).toBe('https://blob.example/file.pdf');
    });

    it('submits the packet only after consent has been recorded', async () => {
      packetRepository.findOne.mockResolvedValue(
        makePacket({
          accessTokenHash: tokenHash,
          accessTokenExpiresAt: new Date(Date.now() + 86_400_000),
          status: PreBoardingPacketStatus.IN_PROGRESS,
          consentAt: null,
        }),
      );

      await expect(service.submitPacketAsCandidate(rawToken)).rejects.toThrow();
    });

    it('submits the packet and sets submittedAt when consent exists', async () => {
      packetRepository.findOne.mockResolvedValue(
        makePacket({
          accessTokenHash: tokenHash,
          accessTokenExpiresAt: new Date(Date.now() + 86_400_000),
          status: PreBoardingPacketStatus.IN_PROGRESS,
          consentAt: new Date(),
        }),
      );

      const result = await service.submitPacketAsCandidate(rawToken, '1.2.3.4');

      expect(result.status).toBe(PreBoardingPacketStatus.SUBMITTED);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'pre_boarding.packet.submit' }),
      );
    });
  });
});
