import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { CoreHrModule } from '@/modules/core-hr/core-hr.module';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { DocumentsModule } from '@/modules/documents/documents.module';
import { AwsModule } from '@/services/aws/aws.module';
import { AzureModule } from '@/services/azure/azure.module';
import { LocalStorageService } from '@/services/local-storage.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateEntity } from './entities/candidate.entity';
import { ClearanceItemEntity } from './entities/clearance-item.entity';
import {
  DevelopmentPlanActionEntity,
  DevelopmentPlanEntity,
} from './entities/development-plan.entity';
import { EntraProvisioningJobEntity } from './entities/entra-provisioning-job.entity';
import { ExitInterviewEntity } from './entities/exit-interview.entity';
import {
  FeedbackEntryEntity,
  RecognitionEntryEntity,
} from './entities/feedback.entity';
import { GoalCheckInEntity } from './entities/goal-check-in.entity';
import { InterviewScorecardEntity } from './entities/interview-scorecard.entity';
import { JobRequisitionEntity } from './entities/job-requisition.entity';
import { ManpowerPlanEntity } from './entities/manpower-plan.entity';
import { ManpowerPositionEntity } from './entities/manpower-position.entity';
import { ObjectiveKeyResultEntity } from './entities/objective-key-result.entity';
import { OnboardingCaseEntity } from './entities/onboarding-case.entity';
import { OnboardingTaskEntity } from './entities/onboarding-task.entity';
import { OnboardingTemplateTaskEntity } from './entities/onboarding-template-task.entity';
import { OnboardingTemplateEntity } from './entities/onboarding-template.entity';
import {
  OneOnOneMeetingEntity,
  OneOnOneNoteEntity,
} from './entities/one-on-one.entity';
import { OrganizationalObjectiveEntity } from './entities/organizational-objective.entity';
import { PerformanceCycleEntity } from './entities/performance-cycle.entity';
import { PerformanceGoalEntity } from './entities/performance-goal.entity';
import {
  PerformanceReviewEntity,
  PerformanceReviewPeerFeedbackEntity,
} from './entities/performance-review.entity';
import { PreBoardingFieldValueEntity } from './entities/pre-boarding-field-value.entity';
import { PreBoardingPacketEntity } from './entities/pre-boarding-packet.entity';
import {
  PulseSurveyEntity,
  PulseSurveyResponseEntity,
} from './entities/pulse-survey.entity';
import { SeparationCaseEntity } from './entities/separation-case.entity';
import { TrainingAssignmentEntity } from './entities/training-assignment.entity';
import { TrainingCompletionEntity } from './entities/training-completion.entity';
import { TrainingCourseEntity } from './entities/training-course.entity';
import { WorkerPassportEntity } from './entities/worker-passport.entity';
import { WorkerVisaAttachmentEntity } from './entities/worker-visa-attachment.entity';
import { WorkerVisaRecordEntity } from './entities/worker-visa-record.entity';
import { EntraProvisioningController } from './entra-provisioning.controller';
import { EntraProvisioningService } from './entra-provisioning.service';
import { EntraWebhookController } from './entra-webhook.controller';
import { EntraWebhookService } from './entra-webhook.service';
import { ExitInterviewService } from './exit-interview.service';
import { StubMicrosoftGraphIdentityService } from './graph-identity.stub';
import { EntraWebhookGuard } from './guards/entra-webhook.guard';
import { MICROSOFT_GRAPH_IDENTITY } from './interfaces/microsoft-graph-identity.interface';
import { ManpowerController } from './manpower.controller';
import { ManpowerService } from './manpower.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { PreBoardingBlobStorageService } from './pre-boarding-blob-storage.service';
import { PreBoardingCandidateController } from './pre-boarding-candidate.controller';
import { PreBoardingMergeService } from './pre-boarding-merge.service';
import { PreBoardingController } from './pre-boarding.controller';
import { PreBoardingService } from './pre-boarding.service';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { SeparationController } from './separation.controller';
import { SeparationService } from './separation.service';
import { TalentController } from './talent.controller';
import { TalentService } from './talent.service';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { WorkerImmigrationController } from './worker-immigration.controller';
import { WorkerImmigrationService } from './worker-immigration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkerEntity,
      OrganizationalObjectiveEntity,
      ObjectiveKeyResultEntity,
      PerformanceGoalEntity,
      GoalCheckInEntity,
      FeedbackEntryEntity,
      RecognitionEntryEntity,
      OneOnOneMeetingEntity,
      OneOnOneNoteEntity,
      PerformanceCycleEntity,
      PerformanceReviewEntity,
      PerformanceReviewPeerFeedbackEntity,
      DevelopmentPlanEntity,
      DevelopmentPlanActionEntity,
      PulseSurveyEntity,
      PulseSurveyResponseEntity,
      OnboardingTemplateEntity,
      OnboardingTemplateTaskEntity,
      OnboardingCaseEntity,
      OnboardingTaskEntity,
      SeparationCaseEntity,
      ClearanceItemEntity,
      PreBoardingPacketEntity,
      PreBoardingFieldValueEntity,
      WorkerPassportEntity,
      WorkerVisaRecordEntity,
      WorkerVisaAttachmentEntity,
      ExitInterviewEntity,
      EntraProvisioningJobEntity,
      JobRequisitionEntity,
      CandidateEntity,
      InterviewScorecardEntity,
      TrainingCourseEntity,
      TrainingAssignmentEntity,
      TrainingCompletionEntity,
      ManpowerPlanEntity,
      ManpowerPositionEntity,
    ]),
    ComplianceModule,
    CoreHrModule,
    DocumentsModule,
    AwsModule,
    AzureModule,
  ],
  controllers: [
    TalentController,
    OnboardingController,
    SeparationController,
    PreBoardingController,
    PreBoardingCandidateController,
    WorkerImmigrationController,
    EntraProvisioningController,
    EntraWebhookController,
    RecruitmentController,
    TrainingController,
    ManpowerController,
  ],
  providers: [
    TalentService,
    OnboardingService,
    SeparationService,
    PreBoardingService,
    PreBoardingBlobStorageService,
    PreBoardingMergeService,
    LocalStorageService,
    WorkerImmigrationService,
    ExitInterviewService,
    EntraProvisioningService,
    EntraWebhookService,
    EntraWebhookGuard,
    StubMicrosoftGraphIdentityService,
    RecruitmentService,
    TrainingService,
    ManpowerService,
    {
      provide: MICROSOFT_GRAPH_IDENTITY,
      useExisting: StubMicrosoftGraphIdentityService,
    },
  ],
  exports: [
    TalentService,
    OnboardingService,
    SeparationService,
    PreBoardingService,
    PreBoardingMergeService,
    WorkerImmigrationService,
    ExitInterviewService,
    EntraProvisioningService,
    RecruitmentService,
    TrainingService,
    ManpowerService,
    TypeOrmModule,
  ],
})
export class TalentModule {}
