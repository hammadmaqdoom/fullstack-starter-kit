import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { DOCUMENT_TYPE_NUMBER_CODE } from './enums/document.enum';

export interface NextDocumentNumberInput {
  tenantId: string;
  legalEntityId: string;
  legalEntityCode: string;
  documentType: string;
  issuedAt?: Date;
}

@Injectable()
export class DocumentNumberService {
  /**
   * Atomically increments the (tenant, legal entity, document type, year)
   * sequence counter and formats the immutable document number
   * `{ENTITY_CODE}-{TYPE}-{YYYY}-{SEQ}` (PRD §6.8.4).
   *
   * Uses a single upsert statement rather than find-then-save so concurrent
   * issues for the same scope cannot race past each other or collide with a
   * pessimistic lock on a not-yet-existing row.
   */
  async next(
    manager: EntityManager,
    input: NextDocumentNumberInput,
  ): Promise<string> {
    const year = (input.issuedAt ?? new Date()).getUTCFullYear();

    const rows: Array<{ lastSeq: number }> = await manager.query(
      `
        INSERT INTO "document_number_sequences"
          ("tenantId", "legalEntityId", "documentType", "year", "lastSeq")
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT ("tenantId", "legalEntityId", "documentType", "year")
        DO UPDATE SET
          "lastSeq" = "document_number_sequences"."lastSeq" + 1,
          "updatedAt" = now()
        RETURNING "lastSeq"
      `,
      [input.tenantId, input.legalEntityId, input.documentType, year],
    );

    const seq = rows[0].lastSeq;
    const typeCode =
      DOCUMENT_TYPE_NUMBER_CODE[input.documentType] ??
      input.documentType.slice(0, 3).toUpperCase();

    return `${input.legalEntityCode}-${typeCode}-${year}-${String(seq).padStart(4, '0')}`;
  }
}
