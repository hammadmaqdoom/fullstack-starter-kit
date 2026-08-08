import { GlobalConfig } from '@/config/config.type';
import { Queue as QueueEnum } from '@/constants/job.constant';
import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { AwsModule } from '@/services/aws/aws.module';
import { LocalStorageService } from '@/services/local-storage.service';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertRuleService } from './alert-rule.service';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { ComplianceAlertScannerService } from './compliance-alert-scanner.service';
import { AlertRuleEntity } from './entities/alert-rule.entity';
import { ComplianceAlertEntity } from './entities/compliance-alert.entity';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';
import { ScheduledReportSubscriptionEntity } from './entities/scheduled-report-subscription.entity';
import { TEAMS_GRAPH_CLIENT } from './interfaces/teams-graph-client.interface';
import { ReportBlobStorageService } from './report-blob-storage.service';
import { TeamsGraphClient } from './teams-graph.client';
import { StubTeamsGraphClient } from './teams-graph.stub';
import { TeamsNotificationService } from './teams-notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationPreferenceEntity,
      ScheduledReportSubscriptionEntity,
      AlertRuleEntity,
      ComplianceAlertEntity,
      WorkerEntity,
    ]),
    BullModule.registerQueue({ name: QueueEnum.Automation }),
    ComplianceModule,
    AwsModule,
  ],
  controllers: [AutomationController],
  providers: [
    AutomationService,
    AlertRuleService,
    ComplianceAlertScannerService,
    ReportBlobStorageService,
    LocalStorageService,
    TeamsNotificationService,
    TeamsGraphClient,
    StubTeamsGraphClient,
    {
      provide: TEAMS_GRAPH_CLIENT,
      useFactory: (
        configService: ConfigService<GlobalConfig>,
        real: TeamsGraphClient,
        stub: StubTeamsGraphClient,
      ) => (real.isConfigured() ? real : stub),
      inject: [ConfigService, TeamsGraphClient, StubTeamsGraphClient],
    },
  ],
  exports: [
    AutomationService,
    AlertRuleService,
    ComplianceAlertScannerService,
    ReportBlobStorageService,
    TeamsNotificationService,
    TypeOrmModule,
  ],
})
export class AutomationModule {}
