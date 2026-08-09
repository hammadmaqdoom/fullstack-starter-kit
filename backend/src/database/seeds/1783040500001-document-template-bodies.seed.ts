import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { DEFAULT_DOCUMENT_TEMPLATES } from '@/modules/country-config/constants/setup-wizard.seed-data';
import { DocumentTemplateVersionEntity } from '@/modules/country-config/entities/document-template-version.entity';
import { DocumentTemplateEntity } from '@/modules/country-config/entities/document-template.entity';
import {
  DocumentTemplateStatus,
  DocumentTemplateVersionStatus,
} from '@/modules/country-config/enums/setup-wizard.enum';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

/**
 * Upserts richer document template bodies (company legal block) for demo/dev.
 * Creates a new draft version when the published body is still the short stub.
 */
export class DocumentTemplateBodiesSeed1783040500001 implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _: SeederFactoryManager,
  ): Promise<void> {
    const templateRepo = dataSource.getRepository(DocumentTemplateEntity);
    const versionRepo = dataSource.getRepository(DocumentTemplateVersionEntity);

    for (const seed of DEFAULT_DOCUMENT_TEMPLATES) {
      let template = await templateRepo.findOne({
        where: { tenantId: DIGITARO_TENANT_ID, code: seed.code },
      });

      if (!template) {
        template = await templateRepo.save(
          templateRepo.create({
            tenantId: DIGITARO_TENANT_ID,
            code: seed.code,
            name: seed.code.replaceAll('_', ' '),
            documentType: seed.documentType,
            audience: seed.audience,
            countryCode: seed.countryCode,
            status: DocumentTemplateStatus.ACTIVE,
          }),
        );
      }

      const versions = await versionRepo.find({
        where: { tenantId: DIGITARO_TENANT_ID, templateId: template.id },
        order: { version: 'DESC' },
      });

      const latest = versions[0];
      const alreadyCurrent = latest && latest.body === seed.body;
      if (alreadyCurrent) {
        continue;
      }

      const nextVersion = (latest?.version ?? 0) + 1;
      const created = await versionRepo.save(
        versionRepo.create({
          tenantId: DIGITARO_TENANT_ID,
          templateId: template.id,
          version: nextVersion,
          body: seed.body,
          mergeFieldSchema: seed.mergeFieldSchema,
          status: DocumentTemplateVersionStatus.PUBLISHED,
          publishedAt: new Date(),
          publishedBy: null,
          createdBy: null,
        }),
      );

      if (latest?.status === DocumentTemplateVersionStatus.PUBLISHED) {
        latest.status = DocumentTemplateVersionStatus.ARCHIVED;
        await versionRepo.save(latest);
      }

      // Ensure only one published row.
      for (const version of versions) {
        if (
          version.id !== created.id
          && version.status === DocumentTemplateVersionStatus.PUBLISHED
        ) {
          version.status = DocumentTemplateVersionStatus.ARCHIVED;
          await versionRepo.save(version);
        }
      }
    }
  }
}
