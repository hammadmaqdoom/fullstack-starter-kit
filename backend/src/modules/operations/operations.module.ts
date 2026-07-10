import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { CoreHrModule } from '@/modules/core-hr/core-hr.module';
import { ProfileChangeRequestEntity } from '@/modules/core-hr/entities/profile-change-request.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { DocumentsModule } from '@/modules/documents/documents.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractorInvoiceController } from './contractor-invoice.controller';
import { ContractorInvoiceService } from './contractor-invoice.service';
import { ContractorInvoiceLineItemEntity } from './entities/contractor-invoice-line-item.entity';
import { ContractorInvoiceEntity } from './entities/contractor-invoice.entity';
import { HubSavedViewEntity } from './entities/hub-saved-view.entity';
import { HubController } from './hub.controller';
import { HubService } from './hub.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HubSavedViewEntity,
      WorkerEntity,
      ProfileChangeRequestEntity,
      ContractorInvoiceEntity,
      ContractorInvoiceLineItemEntity,
    ]),
    ComplianceModule,
    CoreHrModule,
    DocumentsModule,
  ],
  controllers: [HubController, ContractorInvoiceController],
  providers: [HubService, ContractorInvoiceService],
  exports: [HubService, ContractorInvoiceService],
})
export class OperationsModule {}
