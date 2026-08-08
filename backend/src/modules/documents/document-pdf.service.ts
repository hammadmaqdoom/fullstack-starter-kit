import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildDocumentPdf } from './document-pdf.builder';
import { GeneratedDocumentEntity } from './entities/generated-document.entity';
import { LetterheadConfigEntity } from './entities/letterhead-config.entity';
import { RenderProfile } from './enums/document.enum';

@Injectable()
export class DocumentPdfService {
  constructor(
    @InjectRepository(LegalEntityEntity)
    private readonly legalEntityRepository: Repository<LegalEntityEntity>,
    @InjectRepository(LetterheadConfigEntity)
    private readonly letterheadRepository: Repository<LetterheadConfigEntity>,
  ) {}

  /** Renders a generated document at the given profile (PRD §6.8.5). Draft docs render with `documentNumber: null`. */
  async render(
    document: GeneratedDocumentEntity,
    renderProfile: RenderProfile,
  ): Promise<Buffer> {
    if (!document.legalEntityId) {
      throw new NotFoundException({
        code: 'DOCUMENT_LEGAL_ENTITY_UNRESOLVED',
        message:
          'Document has no resolved legal entity to render letterhead from',
      });
    }

    const legalEntity = await this.legalEntityRepository.findOne({
      where: { id: document.legalEntityId, tenantId: document.tenantId },
    });
    if (!legalEntity) {
      throw new NotFoundException({
        code: 'LEGAL_ENTITY_NOT_FOUND',
        message: 'Legal entity not found for document',
      });
    }

    let letterhead: LetterheadConfigEntity | null = null;
    if (document.letterheadConfigId) {
      letterhead = await this.letterheadRepository.findOne({
        where: { id: document.letterheadConfigId, tenantId: document.tenantId },
      });
    } else {
      letterhead = await this.letterheadRepository.findOne({
        where: {
          tenantId: document.tenantId,
          legalEntityId: document.legalEntityId,
          isCurrent: true,
        },
      });
    }

    const body = (document.templateSnapshot?.body as string | undefined) ?? '';

    return buildDocumentPdf({
      documentNumber: document.documentNumber,
      issuedAt: document.issuedAt,
      bodyHtml: body,
      mergeData: document.mergeData ?? {},
      renderProfile,
      legalEntity: {
        registeredName: legalEntity.registeredName,
        tradingName: legalEntity.tradingName,
        requiresWetStamp: legalEntity.requiresWetStamp,
        stampInstructions: legalEntity.stampInstructions,
      },
      letterhead: letterhead?.layoutJson ?? null,
    });
  }

  async resolveCurrentLetterhead(
    legalEntityId: string,
    tenantId: string,
  ): Promise<LetterheadConfigEntity | null> {
    return this.letterheadRepository.findOne({
      where: { tenantId, legalEntityId, isCurrent: true },
    });
  }
}
