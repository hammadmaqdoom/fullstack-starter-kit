import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EntraStatus, WorkerStatus } from '@/modules/core-hr/enums/worker.enum';
import {
  AdapterRunResult,
  ControlTestAdapter,
  OFFBOARD_ENTRA_SLA_DAYS,
} from './control-test-adapter.types';

type OffboardRow = {
  id: string;
  endDate: string | null;
  entraStatus: string;
};

@Injectable()
export class OffboardingEntraDisableAdapter implements ControlTestAdapter {
  readonly key = 'offboarding_entra_disable';

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async run(tenantId: string): Promise<AdapterRunResult> {
    const rows = await this.dataSource.query<OffboardRow[]>(
      `
      SELECT id, "endDate", "entraStatus"
      FROM workers
      WHERE "tenantId" = $1
        AND "deletedAt" IS NULL
        AND status IN ($2, $3)
        AND "endDate" IS NOT NULL
        AND "endDate" <= CURRENT_DATE
      `,
      [tenantId, WorkerStatus.SEPARATED, WorkerStatus.ARCHIVED],
    );

    const failing = rows.filter((row) => {
      if (
        row.entraStatus === EntraStatus.DISABLED ||
        row.entraStatus === EntraStatus.NOT_REQUIRED
      ) {
        return false;
      }
      const end = new Date(`${row.endDate}T00:00:00.000Z`);
      const deadline = new Date(end);
      deadline.setUTCDate(deadline.getUTCDate() + OFFBOARD_ENTRA_SLA_DAYS);
      return new Date() > deadline;
    });

    if (failing.length === 0) {
      return {
        result: 'pass',
        summary: {
          checked: rows.length,
          failing: 0,
          slaDays: OFFBOARD_ENTRA_SLA_DAYS,
        },
        evidenceRefs: [],
      };
    }

    return {
      result: 'fail',
      summary: {
        checked: rows.length,
        failing: failing.length,
        workerIds: failing.map((r) => r.id).slice(0, 50),
        slaDays: OFFBOARD_ENTRA_SLA_DAYS,
      },
      evidenceRefs: failing.slice(0, 10).map((r) => ({
        kind: 'worker',
        id: r.id,
        path: `/people-ops/workers/${r.id}`,
      })),
    };
  }
}
