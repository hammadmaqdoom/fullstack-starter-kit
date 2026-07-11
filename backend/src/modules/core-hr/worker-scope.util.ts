import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { WorkerEntity } from './entities/worker.entity';

export async function resolveActingWorkerId(
  workerRepository: Repository<WorkerEntity>,
  userId: string,
  tenantId: string,
): Promise<string | null> {
  const worker = await workerRepository.findOne({
    where: { tenantId, userId },
    select: ['id'],
  });

  return worker?.id ?? null;
}

export function applyWorkerScopeFilter(
  qb: SelectQueryBuilder<WorkerEntity>,
  auth: PolarisAuthContext,
  actingWorkerId: string | null,
  alias = 'worker',
): void {
  if (auth.broadestScope === ScopeType.ALL) {
    return;
  }

  qb.andWhere(
    new Brackets((scopeQb) => {
      auth.assignments.forEach((assignment, index) => {
        switch (assignment.scopeType) {
          case ScopeType.ALL:
            scopeQb.orWhere('1=1');
            break;
          case ScopeType.COUNTRY:
            if (assignment.scopeCountryCode) {
              scopeQb.orWhere(`${alias}.countryCode = :countryScopeId${index}`, {
                [`countryScopeId${index}`]: assignment.scopeCountryCode,
              });
            }
            break;
          case ScopeType.LEGAL_ENTITY:
            if (assignment.scopeId) {
              scopeQb.orWhere(
                `${alias}.legalEntityId = :legalEntityScopeId${index}`,
                {
                  [`legalEntityScopeId${index}`]: assignment.scopeId,
                },
              );
            }
            break;
          case ScopeType.DIVISION:
            if (assignment.scopeId) {
              scopeQb.orWhere(`${alias}.divisionId = :divisionScopeId${index}`, {
                [`divisionScopeId${index}`]: assignment.scopeId,
              });
            }
            break;
          case ScopeType.TEAM:
            if (actingWorkerId) {
              scopeQb.orWhere(`${alias}.managerId = :actingWorkerId`, {
                actingWorkerId,
              });
            }
            break;
          case ScopeType.OWN:
            if (actingWorkerId) {
              scopeQb.orWhere(`${alias}.id = :actingWorkerId`, {
                actingWorkerId,
              });
            }
            break;
          default:
            break;
        }
      });

      if (auth.assignments.length === 0) {
        scopeQb.orWhere('1=0');
      }
    }),
  );
}
