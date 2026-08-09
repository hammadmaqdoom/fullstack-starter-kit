/**
 * Directory / org-chart client.
 * Canonical implementation lives in `org.ts` — re-exported here for callers
 * that import from `org-directory`.
 */
export {
  type DirectoryEntry,
  type DirectoryQuery,
  type OrgChartNode,
  type OrgChartQuery,
  directoryDisplayName,
  getOrgChart,
  getOrgChart as getOrgChartSubtree,
  orgNodeDisplayName,
  searchDirectory,
} from '@/libs/api/org';
