import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RbacService } from '@/modules/compliance/rbac.service';
import { QueryDirectoryDto } from '@/modules/core-hr/dto/query-directory.dto';
import { OrgService } from '@/modules/core-hr/org.service';
import { PolicyService } from '@/modules/documents/policy.service';
import { QueryHubDto } from '@/modules/operations/dto/hub.dto';
import { HubService } from '@/modules/operations/hub.service';
import { Injectable } from '@nestjs/common';
import {
  actionsForRoles,
  moduleToSearchHit,
  modulesForLayout,
} from './constants/shell-nav.catalog';
import { ShellLayout } from './enums/shell-layout.enum';
import { resolveShellLayout } from './shell-layout.util';
import { ShellSearchHit } from './types/shell.type';

@Injectable()
export class ShellSearchService {
  constructor(
    private readonly rbacService: RbacService,
    private readonly orgService: OrgService,
    private readonly hubService: HubService,
    private readonly policyService: PolicyService,
  ) {}

  async search(
    userId: string,
    qRaw: string,
    limit = 20,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ShellSearchHit[]> {
    const q = (qRaw ?? '').trim();
    const cappedLimit = Math.min(Math.max(limit, 1), 50);
    const auth = await this.rbacService.getAuthContext(userId, tenantId);
    const { primaryLayout } = resolveShellLayout(auth.roleCodes);
    const modules = modulesForLayout(primaryLayout);
    const actions = actionsForRoles(auth.roleCodes);

    if (q.length < 2) {
      return [
        ...actions,
        ...modules.map((module) => moduleToSearchHit(module)),
      ].slice(0, cappedLimit);
    }

    const needle = q.toLowerCase();
    const directoryQuery = Object.assign(new QueryDirectoryDto(), {
      q,
      page: 1,
      limit: Math.min(cappedLimit, 10),
    });

    const [directory, inbox, policies] = await Promise.all([
      this.orgService.getDirectory(directoryQuery, userId, tenantId),
      this.hubService.getInbox(
        userId,
        Object.assign(new QueryHubDto(), {
          page: 1,
          limit: Math.min(cappedLimit, 10),
        }),
        tenantId,
      ),
      this.policyService.list(tenantId),
    ]);

    const workerHits: ShellSearchHit[] = directory.items.map((worker) => ({
      type: 'worker',
      id: worker.id,
      title: `${worker.firstName} ${worker.lastName}`.trim(),
      subtitle: worker.email ?? undefined,
      href: this.workerHref(primaryLayout, worker.id, q),
    }));

    const hubHits: ShellSearchHit[] = [
      ...inbox.data.mine,
      ...inbox.data.forMe,
    ]
      .filter((item) => {
        const hay = `${item.title} ${item.id} ${item.status}`.toLowerCase();
        return hay.includes(needle);
      })
      .map((item) => ({
        type: 'hub_item' as const,
        id: item.id,
        title: item.title,
        subtitle: item.status,
        href: item.href || '/hub',
      }));

    const policyHref =
      primaryLayout === ShellLayout.PEOPLE_OPS ||
      primaryLayout === ShellLayout.ADMIN
        ? '/people-ops/policies'
        : '/employee/policies';

    const policyHits: ShellSearchHit[] = policies
      .filter(
        (policy) =>
          policy.isActive &&
          (policy.title.toLowerCase().includes(needle) ||
            policy.code.toLowerCase().includes(needle)),
      )
      .map((policy) => ({
        type: 'policy' as const,
        id: policy.id,
        title: policy.title,
        subtitle: policy.code,
        href: `${policyHref}?q=${encodeURIComponent(q)}`,
      }));

    const moduleHits = modules
      .filter(
        (module) =>
          module.id.toLowerCase().includes(needle) ||
          module.labelKey.toLowerCase().includes(needle) ||
          module.href.toLowerCase().includes(needle),
      )
      .map((module) => moduleToSearchHit(module));

    const actionHits = actions.filter((action) =>
      action.title.toLowerCase().includes(needle),
    );

    return [
      ...actionHits,
      ...moduleHits,
      ...workerHits,
      ...hubHits,
      ...policyHits,
    ].slice(0, cappedLimit);
  }

  private workerHref(
    layout: ShellLayout,
    workerId: string,
    q: string,
  ): string {
    if (
      layout === ShellLayout.PEOPLE_OPS ||
      layout === ShellLayout.ADMIN
    ) {
      return `/people-ops/workers/${workerId}`;
    }
    return `/employee/directory?q=${encodeURIComponent(q)}`;
  }
}
