import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { LegalEntityRenderProfile } from '@/modules/core-hr/enums/org.enum';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LetterheadConfigEntity } from '../entities/letterhead-config.entity';
import { LetterheadConfigService } from '../letterhead-config.service';

describe('LetterheadConfigService', () => {
  let service: LetterheadConfigService;
  let letterheadRepository: jest.Mocked<
    Pick<Repository<LetterheadConfigEntity>, 'find' | 'findOne'>
  >;
  let legalEntityRepository: jest.Mocked<
    Pick<Repository<LegalEntityEntity>, 'findOne' | 'save'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let dataSource: { transaction: jest.Mock };

  const legalEntityId = 'e0000000-0000-4000-8000-000000000001';
  const actorId = 'u0000000-0000-4000-8000-000000000001';

  const legalEntity = {
    id: legalEntityId,
    tenantId: DIGITARO_TENANT_ID,
    code: 'DIGITARO_LABS_PK',
    registeredName: 'Digitaro Labs (Private) Limited',
    requiresWetStamp: false,
    stampInstructions: null,
    defaultRenderProfile: LegalEntityRenderProfile.FULL_DIGITAL,
  } as LegalEntityEntity;

  beforeEach(async () => {
    letterheadRepository = { find: jest.fn(), findOne: jest.fn() };
    legalEntityRepository = {
      findOne: jest.fn().mockResolvedValue(legalEntity),
      save: jest.fn(async (entity) => entity),
    } as unknown as typeof legalEntityRepository;
    auditLogService = { append: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LetterheadConfigService,
        {
          provide: getRepositoryToken(LetterheadConfigEntity),
          useValue: letterheadRepository,
        },
        {
          provide: getRepositoryToken(LegalEntityEntity),
          useValue: legalEntityRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(LetterheadConfigService);
  });

  describe('create', () => {
    it('creates version 1 when no letterhead exists yet, and audits it', async () => {
      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) => {
          const manager = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn((_entity: unknown, data: unknown) => data),
            save: jest.fn(async (_entity: unknown, data: unknown) => ({
              id: 'lh-1',
              ...(data as object),
            })),
          };
          return cb(manager);
        },
      );

      const result = await service.create(
        {
          legalEntityId,
          layout: { margins: { top: 72, bottom: 72, left: 72, right: 72 } },
        },
        { actorId },
      );

      expect(result.version).toBe(1);
      expect(result.isCurrent).toBe(true);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'letterhead_config.create',
          entityId: 'lh-1',
        }),
      );
    });

    it('retires the previous current version when creating a new one', async () => {
      const previousCurrent = {
        id: 'lh-old',
        tenantId: DIGITARO_TENANT_ID,
        legalEntityId,
        version: 1,
        isCurrent: true,
        effectiveTo: null,
      } as LetterheadConfigEntity;

      let savedPrevious: LetterheadConfigEntity | undefined;
      dataSource.transaction.mockImplementation(
        async (cb: (manager: unknown) => Promise<unknown>) => {
          const manager = {
            findOne: jest
              .fn()
              .mockResolvedValueOnce(previousCurrent) // previousCurrent lookup
              .mockResolvedValueOnce({ version: 1 }), // latest version lookup
            create: jest.fn((_entity: unknown, data: unknown) => data),
            save: jest.fn(async (_entity: unknown, data: unknown) => {
              if ((data as LetterheadConfigEntity).id === 'lh-old') {
                savedPrevious = data as LetterheadConfigEntity;
                return data;
              }
              return { id: 'lh-2', ...(data as object) };
            }),
          };
          return cb(manager);
        },
      );

      const result = await service.create(
        { legalEntityId, layout: {} },
        { actorId },
      );

      expect(result.version).toBe(2);
      expect(savedPrevious?.isCurrent).toBe(false);
      expect(savedPrevious?.effectiveTo).toBeInstanceOf(Date);
    });

    it('rejects an unknown legal entity', async () => {
      legalEntityRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ legalEntityId, layout: {} }, { actorId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateDocumentOutput', () => {
    it('updates stamp config and writes an audit log entry', async () => {
      legalEntityRepository.findOne.mockResolvedValue({ ...legalEntity });

      const result = await service.updateDocumentOutput(
        legalEntityId,
        {
          requiresWetStamp: true,
          stampInstructions: 'Affix company seal before signing',
          defaultRenderProfile: LegalEntityRenderProfile.PRINT_ON_LETTERHEAD,
        },
        { actorId },
      );

      expect(result.requiresWetStamp).toBe(true);
      expect(result.defaultRenderProfile).toBe(
        LegalEntityRenderProfile.PRINT_ON_LETTERHEAD,
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'legal_entity.document_output_update',
          changes: expect.objectContaining({
            requiresWetStamp: { old: false, new: true },
          }),
        }),
      );
    });

    it('rejects an unknown legal entity', async () => {
      legalEntityRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateDocumentOutput(legalEntityId, {}, { actorId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
