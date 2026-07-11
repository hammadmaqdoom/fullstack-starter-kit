import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { WorkerEntity } from './entities/worker.entity';

const CONTACT_ROLES = new Set<string>([
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.DIVISION_HEAD,
]);

export interface DirectoryEntry {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  countryCode: string;
  workMode: string | null;
  divisionId: string | null;
  divisionName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  employmentTypeName: string | null;
  managerId: string | null;
}

export interface OrgChartNode {
  workerId: string;
  firstName: string;
  lastName: string;
  email: string;
  divisionId: string | null;
  divisionName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  employmentTypeName: string | null;
  managerId: string | null;
  directReports: OrgChartNode[];
}

export function toDirectoryEntry(
  worker: WorkerEntity & {
    division?: { name: string } | null;
    department?: { name: string } | null;
  },
  auth: PolarisAuthContext,
  actingWorkerId: string | null,
): DirectoryEntry {
  const roleCodes = new Set(auth.roleCodes.map((code) => code.toLowerCase()));
  const canViewContact =
    actingWorkerId === worker.id ||
    [...roleCodes].some((code) => CONTACT_ROLES.has(code));

  return {
    id: worker.id,
    firstName: worker.firstName,
    lastName: worker.lastName,
    email: worker.email,
    phone: canViewContact ? worker.phone : null,
    countryCode: worker.countryCode,
    workMode: worker.workMode,
    divisionId: worker.divisionId,
    divisionName: worker.division?.name ?? null,
    departmentId: worker.departmentId,
    departmentName: worker.department?.name ?? null,
    employmentTypeName: worker.employmentType?.displayName ?? null,
    managerId: worker.managerId,
  };
}

export function buildOrgChart(
  workers: Array<
    WorkerEntity & {
      division?: { name: string } | null;
      department?: { name: string } | null;
    }
  >,
): OrgChartNode[] {
  return buildOrgChartSubtree(workers);
}

export function buildOrgChartSubtree(
  workers: Array<
    WorkerEntity & {
      division?: { name: string } | null;
      department?: { name: string } | null;
    }
  >,
  maxDepth = 2,
  rootId?: string,
): OrgChartNode[] {
  const nodes = new Map<string, OrgChartNode>();

  for (const worker of workers) {
    nodes.set(worker.id, {
      workerId: worker.id,
      firstName: worker.firstName,
      lastName: worker.lastName,
      email: worker.email,
      divisionId: worker.divisionId,
      divisionName: worker.division?.name ?? null,
      departmentId: worker.departmentId,
      departmentName: worker.department?.name ?? null,
      employmentTypeName: worker.employmentType?.displayName ?? null,
      managerId: worker.managerId,
      directReports: [],
    });
  }

  const roots: OrgChartNode[] = [];

  for (const worker of workers) {
    const node = nodes.get(worker.id)!;
    if (worker.managerId && nodes.has(worker.managerId)) {
      nodes.get(worker.managerId)!.directReports.push(node);
    } else {
      roots.push(node);
    }
  }

  const chartRoots = rootId
    ? (() => {
        const root = nodes.get(rootId);
        return root ? [root] : [];
      })()
    : roots;

  for (const root of chartRoots) {
    pruneOrgChartDepth(root, 0, maxDepth);
  }

  return chartRoots;
}

function pruneOrgChartDepth(
  node: OrgChartNode,
  currentDepth: number,
  maxDepth: number,
): void {
  if (currentDepth >= maxDepth) {
    node.directReports = [];
    return;
  }

  for (const child of node.directReports) {
    pruneOrgChartDepth(child, currentDepth + 1, maxDepth);
  }
}
