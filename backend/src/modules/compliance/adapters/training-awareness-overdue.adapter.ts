import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TrainingAssignmentStatus } from '@/modules/talent/enums/training.enum';
import {
  AdapterRunResult,
  ControlTestAdapter,
} from './control-test-adapter.types';

@Injectable()
export class TrainingAwarenessOverdueAdapter implements ControlTestAdapter {
  readonly key = 'training_awareness_overdue';

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async run(tenantId: string): Promise<AdapterRunResult> {
    const rows = await this.dataSource.query<{ id: string; workerId: string }[]>(
      `
      SELECT a.id, a."workerId"
      FROM training_assignments a
      INNER JOIN training_courses c ON c.id = a."courseId"
      INNER JOIN workers w ON w.id = a."workerId"
      WHERE a."tenantId" = $1
        AND c."countsTowardAwarenessControl" = true
        AND c."isActive" = true
        AND w."deletedAt" IS NULL
        AND w.status = 'active'
        AND (
          a.status = $2
          OR (
            a."dueDate" IS NOT NULL
            AND a."dueDate" < CURRENT_DATE
            AND a.status <> $3
          )
        )
      `,
      [
        tenantId,
        TrainingAssignmentStatus.OVERDUE,
        TrainingAssignmentStatus.COMPLETED,
      ],
    );

    if (rows.length === 0) {
      return {
        result: 'pass',
        summary: { overdueCount: 0 },
        evidenceRefs: [
          {
            kind: 'path',
            path: '/people-ops/training',
            label: 'Training assignments',
          },
        ],
      };
    }

    return {
      result: 'fail',
      summary: {
        overdueCount: rows.length,
        assignmentIds: rows.map((r) => r.id).slice(0, 50),
      },
      evidenceRefs: rows.slice(0, 10).map((r) => ({
        kind: 'training_assignment',
        id: r.id,
      })),
    };
  }
}
