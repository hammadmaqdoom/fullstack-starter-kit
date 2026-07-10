import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { CoreHrModule } from '@/modules/core-hr/core-hr.module';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { CountryConfigModule } from '@/modules/country-config/country-config.module';
import { BenefitTypeEntity } from '@/modules/country-config/entities/benefit-type.entity';
import { ContractorInvoiceEntity } from '@/modules/operations/entities/contractor-invoice.entity';
import { AwsModule } from '@/services/aws/aws.module';
import { AzureModule } from '@/services/azure/azure.module';
import { LocalStorageService } from '@/services/local-storage.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BenefitTypeController,
  EmployeeBenefitController,
} from './benefit.controller';
import { BenefitService } from './benefit.service';
import { CompensationController } from './compensation.controller';
import { CompensationService } from './compensation.service';
import {
  ContractorPaymentBatchController,
  ContractorPaymentLineController,
} from './contractor-payment-batch.controller';
import { ContractorPaymentBatchService } from './contractor-payment-batch.service';
import { BenefitTypeFieldEntity } from './entities/benefit-type-field.entity';
import { CompensationRecordEntity } from './entities/compensation-record.entity';
import { ContractorPaymentBatchEntity } from './entities/contractor-payment-batch.entity';
import { ContractorPaymentLineEntity } from './entities/contractor-payment-line.entity';
import { EmployeeBenefitEntity } from './entities/employee-benefit.entity';
import { FinanceExportProfileEntity } from './entities/finance-export-profile.entity';
import { PayComponentEntity } from './entities/pay-component.entity';
import { PayRunExportBatchEntity } from './entities/pay-run-export-batch.entity';
import { PayRunLineItemEntity } from './entities/pay-run-line-item.entity';
import { PayRunEntity } from './entities/pay-run.entity';
import { PayslipEntity } from './entities/payslip.entity';
import { StatutoryRateEntryEntity } from './entities/statutory-rate-entry.entity';
import { StatutoryRateScheduleEntity } from './entities/statutory-rate-schedule.entity';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { PayRunCalculatorService } from './pay-run-calculator.service';
import {
  DefaultPayRunLopProvider,
  PAY_RUN_LOP_PROVIDER,
} from './pay-run-lop-provider';
import { PayRunController } from './pay-run.controller';
import { PayRunService } from './pay-run.service';
import { PayrollSeedService } from './payroll-seed.service';
import { PayslipBlobStorageService } from './payslip-blob-storage.service';
import { PayslipPdfService } from './payslip-pdf.service';
import { PayslipController } from './payslip.controller';
import { PayslipService } from './payslip.service';
import { RemittanceCorridorConfigEntity } from './entities/remittance-corridor-config.entity';
import { RemittancePackDocumentEntity } from './entities/remittance-pack-document.entity';
import { RemittancePackEntity } from './entities/remittance-pack.entity';
import {
  ContractorInvoiceRemittanceController,
  ContractorPaymentLineRemittanceController,
  PayRunLineRemittanceController,
  PayslipRemittanceController,
  RemittanceCorridorController,
} from './remittance.controller';
import { RemittanceService } from './remittance.service';
import { StatutoryRateController } from './statutory-rate.controller';
import { StatutoryRateService } from './statutory-rate.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayComponentEntity,
      CompensationRecordEntity,
      BenefitTypeEntity,
      BenefitTypeFieldEntity,
      EmployeeBenefitEntity,
      StatutoryRateScheduleEntity,
      StatutoryRateEntryEntity,
      PayRunEntity,
      PayRunLineItemEntity,
      PayslipEntity,
      FinanceExportProfileEntity,
      PayRunExportBatchEntity,
      ContractorPaymentBatchEntity,
      ContractorPaymentLineEntity,
      ContractorInvoiceEntity,
      RemittanceCorridorConfigEntity,
      RemittancePackEntity,
      RemittancePackDocumentEntity,
      WorkerEntity,
      LegalEntityEntity,
    ]),
    ComplianceModule,
    CountryConfigModule,
    CoreHrModule,
    AwsModule,
    AzureModule,
  ],
  controllers: [
    BenefitTypeController,
    EmployeeBenefitController,
    CompensationController,
    StatutoryRateController,
    PayRunController,
    PayslipController,
    ExportController,
    ContractorPaymentBatchController,
    ContractorPaymentLineController,
    RemittanceCorridorController,
    PayRunLineRemittanceController,
    ContractorPaymentLineRemittanceController,
    PayslipRemittanceController,
    ContractorInvoiceRemittanceController,
  ],
  providers: [
    BenefitService,
    CompensationService,
    StatutoryRateService,
    PayRunCalculatorService,
    PayRunService,
    PayrollSeedService,
    PayslipService,
    PayslipPdfService,
    PayslipBlobStorageService,
    ExportService,
    ContractorPaymentBatchService,
    RemittanceService,
    LocalStorageService,
    { provide: PAY_RUN_LOP_PROVIDER, useClass: DefaultPayRunLopProvider },
  ],
  exports: [
    BenefitService,
    CompensationService,
    StatutoryRateService,
    PayRunCalculatorService,
    PayRunService,
    PayrollSeedService,
    PayslipService,
    ExportService,
    ContractorPaymentBatchService,
    RemittanceService,
    TypeOrmModule,
  ],
})
export class PayrollModule {}
