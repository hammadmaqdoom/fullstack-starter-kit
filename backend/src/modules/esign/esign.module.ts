import { Queue as QueueEnum } from '@/constants/job.constant';
import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { AwsModule } from '@/services/aws/aws.module';
import { AzureModule } from '@/services/azure/azure.module';
import { LocalStorageService } from '@/services/local-storage.service';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EsignAuditEventEntity } from './entities/esign-audit-event.entity';
import { EsignEnvelopeEntity } from './entities/esign-envelope.entity';
import { EsignFieldEntity } from './entities/esign-field.entity';
import { EsignSignatoryEntity } from './entities/esign-signatory.entity';
import { SigningCertificateEntity } from './entities/signing-certificate.entity';
import { EsignBlobStorageService } from './esign-blob-storage.service';
import { EsignController } from './esign.controller';
import { EsignService } from './esign.service';
import { PADES_SEALING_SERVICE } from './interfaces/pades-sealing.interface';
import { NoopPadesSealingService } from './pades-sealing.noop';
import { PadesSealingService } from './pades-sealing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EsignEnvelopeEntity,
      EsignSignatoryEntity,
      EsignFieldEntity,
      EsignAuditEventEntity,
      SigningCertificateEntity,
      WorkerEntity,
    ]),
    BullModule.registerQueue({ name: QueueEnum.Esign }),
    ComplianceModule,
    AwsModule,
    AzureModule,
  ],
  controllers: [EsignController],
  providers: [
    EsignService,
    EsignBlobStorageService,
    LocalStorageService,
    PadesSealingService,
    NoopPadesSealingService,
    {
      provide: PADES_SEALING_SERVICE,
      useFactory: (real: PadesSealingService, noop: NoopPadesSealingService) =>
        real.isConfigured() ? real : noop,
      inject: [PadesSealingService, NoopPadesSealingService],
    },
  ],
  exports: [EsignService, TypeOrmModule, PADES_SEALING_SERVICE],
})
export class EsignModule {}
