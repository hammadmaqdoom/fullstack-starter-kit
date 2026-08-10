import { Module } from '@nestjs/common';
import { AutomationQueueModule } from './queues/automation/automation.module';
import { BankFeedQueueModule } from './queues/bank-feed/bank-feed.module';
import { ComplianceQueueModule } from './queues/compliance/compliance.module';
import { CoreHrQueueModule } from './queues/core-hr/core-hr.module';
import { EmailQueueModule } from './queues/email/email.module';
import { EsignQueueModule } from './queues/esign/esign.module';
import { FxQueueModule } from './queues/fx/fx.module';
import { LeaveAccrualQueueModule } from './queues/leave-accrual/leave-accrual.module';
import { ReportsQueueModule } from './queues/reports/reports.module';
import { TalentQueueModule } from './queues/talent/talent.module';

@Module({
  imports: [
    EmailQueueModule,
    FxQueueModule,
    LeaveAccrualQueueModule,
    ComplianceQueueModule,
    EsignQueueModule,
    AutomationQueueModule,
    TalentQueueModule,
    ReportsQueueModule,
    CoreHrQueueModule,
    BankFeedQueueModule,
  ],
})
export class WorkerModule {}
