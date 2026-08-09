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
import { ExpenseClaimLineEntity } from './entities/expense-claim-line.entity';
import { ExpenseClaimEntity } from './entities/expense-claim.entity';
import { ExpensePolicyEntity } from './entities/expense-policy.entity';
import { HelpDeskSlaPolicyEntity } from './entities/help-desk-sla-policy.entity';
import { HelpDeskTicketEntity } from './entities/help-desk-ticket.entity';
import { HubSavedViewEntity } from './entities/hub-saved-view.entity';
import { TicketCommentEntity } from './entities/ticket-comment.entity';
import { TravelApprovalRuleEntity } from './entities/travel-approval-rule.entity';
import { TravelItineraryEntity } from './entities/travel-itinerary.entity';
import { TravelRequestEntity } from './entities/travel-request.entity';
import { ExpenseClaimController } from './expense-claim.controller';
import { ExpenseClaimService } from './expense-claim.service';
import { ExpenseSettlementService } from './expense-settlement.service';
import { HelpDeskController } from './help-desk.controller';
import { HelpDeskService } from './help-desk.service';
import { HubController } from './hub.controller';
import { HubService } from './hub.service';
import { TravelRequestController } from './travel-request.controller';
import { TravelRequestService } from './travel-request.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HubSavedViewEntity,
      WorkerEntity,
      ProfileChangeRequestEntity,
      ContractorInvoiceEntity,
      ContractorInvoiceLineItemEntity,
      ExpenseClaimEntity,
      ExpenseClaimLineEntity,
      ExpensePolicyEntity,
      TravelRequestEntity,
      TravelItineraryEntity,
      TravelApprovalRuleEntity,
      HelpDeskTicketEntity,
      TicketCommentEntity,
      HelpDeskSlaPolicyEntity,
    ]),
    ComplianceModule,
    CoreHrModule,
    DocumentsModule,
  ],
  controllers: [
    HubController,
    ContractorInvoiceController,
    ExpenseClaimController,
    TravelRequestController,
    HelpDeskController,
  ],
  providers: [
    HubService,
    ContractorInvoiceService,
    ExpenseClaimService,
    ExpenseSettlementService,
    TravelRequestService,
    HelpDeskService,
  ],
  exports: [
    HubService,
    ContractorInvoiceService,
    ExpenseClaimService,
    ExpenseSettlementService,
    TravelRequestService,
    HelpDeskService,
  ],
})
export class OperationsModule {}
