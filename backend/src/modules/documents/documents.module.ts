import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { CoreHrModule } from '@/modules/core-hr/core-hr.module';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { LegalEntityStatutoryIdEntity } from '@/modules/core-hr/entities/legal-entity-statutory-id.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { CountryConfigModule } from '@/modules/country-config/country-config.module';
import { DocumentTemplateVersionEntity } from '@/modules/country-config/entities/document-template-version.entity';
import { DocumentTemplateEntity } from '@/modules/country-config/entities/document-template.entity';
import { AwsModule } from '@/services/aws/aws.module';
import { LocalStorageService } from '@/services/local-storage.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentBlobStorageService } from './document-blob-storage.service';
import { DocumentNumberService } from './document-number.service';
import { DocumentPdfService } from './document-pdf.service';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentNumberSequenceEntity } from './entities/document-number-sequence.entity';
import { GeneratedDocumentEntity } from './entities/generated-document.entity';
import { LetterheadConfigEntity } from './entities/letterhead-config.entity';
import { PolicyAcknowledgementEntity } from './entities/policy-acknowledgement.entity';
import { PolicyPopulationRuleEntity } from './entities/policy-population-rule.entity';
import { PolicyVersionEntity } from './entities/policy-version.entity';
import { PolicyEntity } from './entities/policy.entity';
import { LegalEntityDocumentOutputController } from './legal-entity-document-output.controller';
import { LetterheadConfigController } from './letterhead-config.controller';
import { LetterheadConfigService } from './letterhead-config.service';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PolicyEntity,
      PolicyVersionEntity,
      PolicyPopulationRuleEntity,
      PolicyAcknowledgementEntity,
      GeneratedDocumentEntity,
      DocumentTemplateEntity,
      DocumentTemplateVersionEntity,
      WorkerEntity,
      LegalEntityEntity,
      LegalEntityStatutoryIdEntity,
      LetterheadConfigEntity,
      DocumentNumberSequenceEntity,
    ]),
    ComplianceModule,
    CountryConfigModule,
    CoreHrModule,
    AwsModule,
  ],
  controllers: [
    PolicyController,
    DocumentController,
    LetterheadConfigController,
    LegalEntityDocumentOutputController,
  ],
  providers: [
    PolicyService,
    DocumentService,
    LetterheadConfigService,
    DocumentNumberService,
    DocumentPdfService,
    DocumentBlobStorageService,
    LocalStorageService,
  ],
  exports: [PolicyService, DocumentService, TypeOrmModule],
})
export class DocumentsModule {}
