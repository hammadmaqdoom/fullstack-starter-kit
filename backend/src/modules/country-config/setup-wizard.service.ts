import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  DEFAULT_BENEFIT_TYPES,
  DEFAULT_COUNTRY_SELECTION,
  DEFAULT_CURRENCY_SETTINGS,
  DEFAULT_DOCUMENT_TEMPLATES,
  DEFAULT_LEAVE_TYPES,
  DEFAULT_NOTIFICATION_SETTINGS,
  HOLIDAYS_BY_COUNTRY,
  SETUP_WIZARD_SEED_YEAR,
} from './constants/setup-wizard.seed-data';
import { SaveSetupWizardStepDto } from './dto/setup-wizard.dto';
import { BenefitTypeEntity } from './entities/benefit-type.entity';
import { CountryConfigEntity } from './entities/country-config.entity';
import { DocumentTemplateEntity } from './entities/document-template.entity';
import { DocumentTemplateVersionEntity } from './entities/document-template-version.entity';
import { HolidayCalendarEntity } from './entities/holiday-calendar.entity';
import { HolidayEntity } from './entities/holiday.entity';
import { LeaveTypeEntity } from './entities/leave-type.entity';
import { SetupWizardProgressEntity } from './entities/setup-wizard-progress.entity';
import {
  DocumentTemplateStatus,
  SETUP_WIZARD_STEP_ORDER,
  SetupWizardStep,
} from './enums/setup-wizard.enum';

export type SetupWizardStepState = {
  step: SetupWizardStep;
  label: string;
  isComplete: boolean;
  isSkipped: boolean;
  isCurrent: boolean;
  canSkip: boolean;
};

export type SetupWizardState = {
  progress: SetupWizardProgressEntity;
  steps: SetupWizardStepState[];
  summary: {
    leaveTypeCount: number;
    holidayCount: number;
    benefitTypeCount: number;
    documentTemplateCount: number;
    legalEntityCount: number;
    activeCountryCount: number;
  };
};

const SKIPPABLE_STEPS = new Set<SetupWizardStep>([
  SetupWizardStep.BENEFIT_TYPES,
  SetupWizardStep.DOCUMENT_TEMPLATES,
  SetupWizardStep.NOTIFICATIONS,
]);

const STEP_LABELS: Record<SetupWizardStep, string> = {
  [SetupWizardStep.ORGANISATION]: 'Organisation',
  [SetupWizardStep.LEGAL_ENTITIES]: 'Legal entities',
  [SetupWizardStep.COUNTRIES]: 'Countries',
  [SetupWizardStep.CURRENCIES]: 'Currencies & FX',
  [SetupWizardStep.LEAVE_TYPES]: 'Leave types',
  [SetupWizardStep.HOLIDAY_CALENDARS]: 'Holiday calendars',
  [SetupWizardStep.BENEFIT_TYPES]: 'Benefit types',
  [SetupWizardStep.ROLES]: 'Roles',
  [SetupWizardStep.DOCUMENT_TEMPLATES]: 'Document templates',
  [SetupWizardStep.NOTIFICATIONS]: 'Notifications',
};

@Injectable()
export class SetupWizardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
    @InjectRepository(SetupWizardProgressEntity)
    private readonly progressRepository: Repository<SetupWizardProgressEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(LeaveTypeEntity)
    private readonly leaveTypeRepository: Repository<LeaveTypeEntity>,
    @InjectRepository(HolidayCalendarEntity)
    private readonly holidayCalendarRepository: Repository<HolidayCalendarEntity>,
    @InjectRepository(HolidayEntity)
    private readonly holidayRepository: Repository<HolidayEntity>,
    @InjectRepository(BenefitTypeEntity)
    private readonly benefitTypeRepository: Repository<BenefitTypeEntity>,
    @InjectRepository(DocumentTemplateEntity)
    private readonly documentTemplateRepository: Repository<DocumentTemplateEntity>,
    @InjectRepository(DocumentTemplateVersionEntity)
    private readonly documentTemplateVersionRepository: Repository<DocumentTemplateVersionEntity>,
    @InjectRepository(CountryConfigEntity)
    private readonly countryConfigRepository: Repository<CountryConfigEntity>,
    @InjectRepository(LegalEntityEntity)
    private readonly legalEntityRepository: Repository<LegalEntityEntity>,
  ) {}

  async getState(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<SetupWizardState> {
    const progress = await this.getOrCreateProgress(tenantId);
    const [
      leaveTypeCount,
      holidayCount,
      benefitTypeCount,
      documentTemplateCount,
      legalEntityCount,
      activeCountryCount,
    ] = await Promise.all([
      this.leaveTypeRepository.count({ where: { tenantId } }),
      this.holidayRepository.count({ where: { tenantId } }),
      this.benefitTypeRepository.count({ where: { tenantId } }),
      this.documentTemplateRepository.count({ where: { tenantId } }),
      this.legalEntityRepository.count({ where: { tenantId } }),
      this.countryConfigRepository.count({
        where: { tenantId, isActive: true },
      }),
    ]);

    return {
      progress,
      steps: this.buildStepStates(progress),
      summary: {
        leaveTypeCount,
        holidayCount,
        benefitTypeCount,
        documentTemplateCount,
        legalEntityCount,
        activeCountryCount,
      },
    };
  }

  async saveStep(
    dto: SaveSetupWizardStepDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<SetupWizardState> {
    const progress = await this.getOrCreateProgress(tenantId);
    const stepData = { ...progress.stepData, [dto.step]: dto.data ?? {} };

    if (dto.skip) {
      const skipped = new Set(progress.skippedSteps);
      skipped.add(dto.step);
      progress.skippedSteps = [...skipped];
    } else {
      const completed = new Set(progress.completedSteps);
      completed.add(dto.step);
      progress.completedSteps = [...completed];
      progress.skippedSteps = progress.skippedSteps.filter(
        (s) => s !== dto.step,
      );
    }

    progress.stepData = stepData;
    progress.currentStep = this.nextStep(dto.step, progress);
    await this.progressRepository.save(progress);

    if (dto.step === SetupWizardStep.ORGANISATION && dto.data?.organisationName) {
      await this.tenantRepository.update(tenantId, {
        name: String(dto.data.organisationName),
        baseReportingCurrency:
          (dto.data.reportingCurrency as string | undefined) ??
          undefined,
      });
    }

    if (dto.step === SetupWizardStep.COUNTRIES && dto.data?.activeCountries) {
      await this.syncActiveCountries(
        tenantId,
        dto.data.activeCountries as string[],
      );
    }

    if (dto.step === SetupWizardStep.CURRENCIES && dto.data) {
      progress.stepData = {
        ...progress.stepData,
        [SetupWizardStep.CURRENCIES]: {
          ...DEFAULT_CURRENCY_SETTINGS,
          ...dto.data,
        },
      };
      await this.progressRepository.save(progress);
    }

    if (dto.step === SetupWizardStep.NOTIFICATIONS) {
      progress.stepData = {
        ...progress.stepData,
        [SetupWizardStep.NOTIFICATIONS]: {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...dto.data,
        },
      };
      progress.isComplete = true;
      progress.completedAt = new Date();
      await this.progressRepository.save(progress);
      await this.applySeeds(actorId, tenantId, correlationId, ipAddress);
    }

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: dto.skip ? 'setup_wizard.step_skipped' : 'setup_wizard.step_saved',
      entityType: 'setup_wizard_progress',
      entityId: progress.id,
      changes: {
        step: { old: null, new: dto.step },
        skip: { old: null, new: dto.skip ?? false },
      },
      correlationId,
      ipAddress,
    });

    return this.getState(tenantId);
  }

  async applySeeds(
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
    correlationId?: string,
    ipAddress?: string,
    countryCodes: string[] = [...DEFAULT_COUNTRY_SELECTION],
  ): Promise<SetupWizardState> {
    const progress = await this.getOrCreateProgress(tenantId);
    const selectedCountries =
      (progress.stepData[SetupWizardStep.COUNTRIES] as
        | { activeCountries?: string[] }
        | undefined)?.activeCountries ?? countryCodes;

    await this.dataSource.transaction(async (manager) => {
      for (const leaveType of DEFAULT_LEAVE_TYPES) {
        if (!selectedCountries.includes(leaveType.countryCode)) {
          continue;
        }
        const existing = await manager.findOne(LeaveTypeEntity, {
          where: {
            tenantId,
            countryCode: leaveType.countryCode,
            code: leaveType.code,
          },
        });
        if (!existing) {
          await manager.save(
            manager.create(LeaveTypeEntity, {
              tenantId,
              ...leaveType,
            }),
          );
        }
      }

      for (const countryCode of selectedCountries) {
        const holidays = HOLIDAYS_BY_COUNTRY[countryCode] ?? [];
        if (holidays.length === 0) {
          continue;
        }

        let calendar = await manager.findOne(HolidayCalendarEntity, {
          where: {
            tenantId,
            countryCode,
            effectiveYear: SETUP_WIZARD_SEED_YEAR,
          },
        });

        if (!calendar) {
          calendar = await manager.save(
            manager.create(HolidayCalendarEntity, {
              tenantId,
              countryCode,
              effectiveYear: SETUP_WIZARD_SEED_YEAR,
              name: `${countryCode} Public Holidays ${SETUP_WIZARD_SEED_YEAR}`,
              isActive: true,
            }),
          );
        }

        for (const holiday of holidays) {
          const existingHoliday = await manager.findOne(HolidayEntity, {
            where: {
              tenantId,
              holidayCalendarId: calendar.id,
              holidayDate: holiday.holidayDate,
            },
          });
          if (!existingHoliday) {
            await manager.save(
              manager.create(HolidayEntity, {
                tenantId,
                holidayCalendarId: calendar.id,
                name: holiday.name,
                holidayDate: holiday.holidayDate,
                isCompanyClosure: true,
              }),
            );
          }
        }
      }

      for (const benefit of DEFAULT_BENEFIT_TYPES) {
        const existing = await manager.findOne(BenefitTypeEntity, {
          where: { tenantId, code: benefit.code },
        });
        if (!existing) {
          await manager.save(
            manager.create(BenefitTypeEntity, {
              tenantId,
              ...benefit,
            }),
          );
        }
      }

      for (const template of DEFAULT_DOCUMENT_TEMPLATES) {
        let existingTemplate = await manager.findOne(DocumentTemplateEntity, {
          where: { tenantId, code: template.code },
        });
        if (!existingTemplate) {
          existingTemplate = await manager.save(
            manager.create(DocumentTemplateEntity, {
              tenantId,
              code: template.code,
              documentType: template.documentType,
              audience: template.audience,
              countryCode: template.countryCode,
              status: DocumentTemplateStatus.ACTIVE,
            }),
          );

          await manager.save(
            manager.create(DocumentTemplateVersionEntity, {
              tenantId,
              templateId: existingTemplate.id,
              version: 1,
              body: template.body,
              mergeFieldSchema: template.mergeFieldSchema,
              createdBy: actorId,
            }),
          );
        }
      }
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'setup_wizard.seeds_applied',
      entityType: 'setup_wizard_progress',
      entityId: progress.id,
      changes: {
        countries: { old: null, new: selectedCountries },
      },
      correlationId,
      ipAddress,
    });

    return this.getState(tenantId);
  }

  private async getOrCreateProgress(
    tenantId: string,
  ): Promise<SetupWizardProgressEntity> {
    let progress = await this.progressRepository.findOne({
      where: { tenantId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        tenantId,
        currentStep: SetupWizardStep.ORGANISATION,
        completedSteps: [],
        skippedSteps: [],
        stepData: {
          [SetupWizardStep.COUNTRIES]: {
            activeCountries: DEFAULT_COUNTRY_SELECTION,
          },
          [SetupWizardStep.CURRENCIES]: DEFAULT_CURRENCY_SETTINGS,
          [SetupWizardStep.NOTIFICATIONS]: DEFAULT_NOTIFICATION_SETTINGS,
        },
        isComplete: false,
      });
      progress = await this.progressRepository.save(progress);
    }

    return progress;
  }

  private buildStepStates(
    progress: SetupWizardProgressEntity,
  ): SetupWizardStepState[] {
    const completed = new Set(progress.completedSteps);
    const skipped = new Set(progress.skippedSteps);

    return SETUP_WIZARD_STEP_ORDER.map((step) => ({
      step,
      label: STEP_LABELS[step],
      isComplete: completed.has(step),
      isSkipped: skipped.has(step),
      isCurrent: progress.currentStep === step,
      canSkip: SKIPPABLE_STEPS.has(step),
    }));
  }

  private nextStep(
    current: SetupWizardStep,
    progress: SetupWizardProgressEntity,
  ): SetupWizardStep {
    const idx = SETUP_WIZARD_STEP_ORDER.indexOf(current);
    if (idx < 0 || idx >= SETUP_WIZARD_STEP_ORDER.length - 1) {
      return current;
    }

    const resolved = new Set([
      ...progress.completedSteps,
      ...progress.skippedSteps,
      current,
    ]);

    for (let i = idx + 1; i < SETUP_WIZARD_STEP_ORDER.length; i++) {
      const candidate = SETUP_WIZARD_STEP_ORDER[i];
      if (!resolved.has(candidate)) {
        return candidate;
      }
    }

    return SETUP_WIZARD_STEP_ORDER[SETUP_WIZARD_STEP_ORDER.length - 1];
  }

  private async syncActiveCountries(
    tenantId: string,
    activeCountries: string[],
  ): Promise<void> {
    const configs = await this.countryConfigRepository.find({
      where: { tenantId },
    });

    for (const config of configs) {
      const shouldBeActive = activeCountries.includes(config.countryCode);
      if (config.isActive !== shouldBeActive) {
        await this.countryConfigRepository.update(config.id, {
          isActive: shouldBeActive,
        });
      }
    }
  }
}
