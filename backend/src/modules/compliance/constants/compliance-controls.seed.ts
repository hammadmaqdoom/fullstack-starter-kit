import {
  ControlDomain,
  ControlFrequency,
  ControlOwnerRole,
} from '../enums/control.enum';

export const KNOWN_ADAPTER_KEYS = [
  'policy_ack_current',
  'access_review_quarterly',
  'rbac_assignment_reviewable',
  'offboarding_entra_disable',
  'training_awareness_overdue',
  'dsar_export_ready',
  'audit_log_immutable',
] as const;

export type KnownAdapterKey = (typeof KNOWN_ADAPTER_KEYS)[number];

export type SeedFrameworkMap = {
  framework: string;
  externalRef: string;
};

export type SeedControl = {
  code: string;
  title: string;
  description: string;
  domain: ControlDomain;
  ownerRole: ControlOwnerRole;
  frequency: ControlFrequency;
  inScope: boolean;
  testAdapterKey: KnownAdapterKey | null;
  sortOrder: number;
  maps: SeedFrameworkMap[];
};

export const SEED_CONTROLS: SeedControl[] = [
  {
    code: 'POL-ACK-CURRENT',
    title: 'Current mandatory policy acknowledgement 100%',
    description:
      'All in-scope active workers have acknowledged the current mandatory policy set.',
    domain: ControlDomain.POLICY,
    ownerRole: ControlOwnerRole.PEOPLE_OPS,
    frequency: ControlFrequency.DAILY,
    inScope: true,
    testAdapterKey: 'policy_ack_current',
    sortOrder: 10,
    maps: [
      { framework: 'SOC2', externalRef: 'CC1.1' },
      { framework: 'ISO27001', externalRef: 'A.5.1' },
      { framework: 'ISO9001', externalRef: '7.5' },
    ],
  },
  {
    code: 'POL-VERSION-MANDATORY',
    title: 'Mandatory policies published and versioned',
    description:
      'Mandatory ISO-aligned policies exist as published versions in Polaris.',
    domain: ControlDomain.POLICY,
    ownerRole: ControlOwnerRole.PEOPLE_OPS,
    frequency: ControlFrequency.MANUAL,
    inScope: true,
    testAdapterKey: null,
    sortOrder: 20,
    maps: [
      { framework: 'ISO27001', externalRef: 'A.5.1' },
      { framework: 'ISO27701', externalRef: '6.2' },
    ],
  },
  {
    code: 'ACC-REVIEW-QUARTERLY',
    title: 'Quarterly access review completed',
    description:
      'A completed access review cycle exists for the current quarter window.',
    domain: ControlDomain.ACCESS,
    ownerRole: ControlOwnerRole.IT_ADMIN,
    frequency: ControlFrequency.QUARTERLY,
    inScope: true,
    testAdapterKey: 'access_review_quarterly',
    sortOrder: 30,
    maps: [
      { framework: 'SOC2', externalRef: 'CC6.2' },
      { framework: 'ISO27001', externalRef: 'A.5.18' },
    ],
  },
  {
    code: 'ACC-RBAC-SNAPSHOT',
    title: 'RBAC assignments reviewable',
    description:
      'Active role assignments can be snapshotted for access review.',
    domain: ControlDomain.ACCESS,
    ownerRole: ControlOwnerRole.IT_ADMIN,
    frequency: ControlFrequency.QUARTERLY,
    inScope: true,
    testAdapterKey: 'rbac_assignment_reviewable',
    sortOrder: 40,
    maps: [
      { framework: 'SOC2', externalRef: 'CC6.1' },
      { framework: 'ISO27001', externalRef: 'A.5.15' },
    ],
  },
  {
    code: 'ACC-OFFBOARD-ENTRA',
    title: 'Entra disable within SLA after separation',
    description:
      'Separated workers have Entra disabled or not_required within the configured SLA.',
    domain: ControlDomain.ACCESS,
    ownerRole: ControlOwnerRole.IT_ADMIN,
    frequency: ControlFrequency.DAILY,
    inScope: true,
    testAdapterKey: 'offboarding_entra_disable',
    sortOrder: 50,
    maps: [
      { framework: 'SOC2', externalRef: 'CC6.3' },
      { framework: 'ISO27001', externalRef: 'A.5.18' },
    ],
  },
  {
    code: 'PEO-TRAIN-AWARENESS',
    title: 'No overdue awareness training',
    description:
      'No overdue assignments for courses flagged countsTowardAwarenessControl.',
    domain: ControlDomain.PEOPLE,
    ownerRole: ControlOwnerRole.PEOPLE_OPS,
    frequency: ControlFrequency.DAILY,
    inScope: true,
    testAdapterKey: 'training_awareness_overdue',
    sortOrder: 60,
    maps: [
      { framework: 'SOC2', externalRef: 'CC1.4' },
      { framework: 'ISO27001', externalRef: 'A.6.3' },
    ],
  },
  {
    code: 'PEO-ONBOARD-GATE',
    title: 'Onboarding gated on policies / docs / Entra',
    description:
      'Day-1 onboarding cannot complete without mandatory gates (manual attestation).',
    domain: ControlDomain.PEOPLE,
    ownerRole: ControlOwnerRole.PEOPLE_OPS,
    frequency: ControlFrequency.MANUAL,
    inScope: true,
    testAdapterKey: null,
    sortOrder: 70,
    maps: [
      { framework: 'ISO30400', externalRef: 'HR-onboarding' },
      { framework: 'ISO9001', externalRef: '8.5' },
    ],
  },
  {
    code: 'PEO-SEPARATION-CLEARANCE',
    title: 'Separation clearance before archive',
    description:
      'Separation clearance completed before worker archive (manual / process evidence).',
    domain: ControlDomain.PEOPLE,
    ownerRole: ControlOwnerRole.PEOPLE_OPS,
    frequency: ControlFrequency.MANUAL,
    inScope: true,
    testAdapterKey: null,
    sortOrder: 80,
    maps: [
      { framework: 'ISO27001', externalRef: 'A.6.5' },
      { framework: 'SOC2', externalRef: 'CC6.3' },
    ],
  },
  {
    code: 'PRIV-DSAR-EXPORT',
    title: 'DSAR export capability ready',
    description: 'Data subject access export API is available and evidenced.',
    domain: ControlDomain.PRIVACY,
    ownerRole: ControlOwnerRole.PEOPLE_OPS,
    frequency: ControlFrequency.MANUAL,
    inScope: true,
    testAdapterKey: 'dsar_export_ready',
    sortOrder: 90,
    maps: [
      { framework: 'ISO27701', externalRef: '7.3' },
      { framework: 'PDPA', externalRef: 'Access' },
      { framework: 'PDPL', externalRef: 'Access' },
      { framework: 'GDPR', externalRef: 'Art.15' },
    ],
  },
  {
    code: 'PRIV-RETENTION-5Y',
    title: 'Retention schedule documented',
    description: '5-year default retention schedule documented and applied.',
    domain: ControlDomain.PRIVACY,
    ownerRole: ControlOwnerRole.PEOPLE_OPS,
    frequency: ControlFrequency.MANUAL,
    inScope: true,
    testAdapterKey: null,
    sortOrder: 100,
    maps: [
      { framework: 'ISO27701', externalRef: '7.4' },
      { framework: 'PDPA', externalRef: 'Retention' },
    ],
  },
  {
    code: 'PROC-AUDIT-LOG',
    title: 'Append-only audit log operational',
    description: 'Audit log append path works; no UPDATE/DELETE on audit rows.',
    domain: ControlDomain.PROCESS,
    ownerRole: ControlOwnerRole.SUPER_ADMIN,
    frequency: ControlFrequency.DAILY,
    inScope: true,
    testAdapterKey: 'audit_log_immutable',
    sortOrder: 110,
    maps: [
      { framework: 'SOC2', externalRef: 'CC7.2' },
      { framework: 'ISO27001', externalRef: 'A.8.15' },
    ],
  },
  {
    code: 'PROC-ESIGN-COC',
    title: 'E-sign Certificate of Completion retained',
    description: 'Sealed CoC PDFs retained for signed envelopes (manual check).',
    domain: ControlDomain.PROCESS,
    ownerRole: ControlOwnerRole.PEOPLE_OPS,
    frequency: ControlFrequency.MANUAL,
    inScope: true,
    testAdapterKey: null,
    sortOrder: 120,
    maps: [
      { framework: 'ISO9001', externalRef: '7.5' },
      { framework: 'SOC2', externalRef: 'CC8.1' },
    ],
  },
];

export const WAVE1_CONTROL_CODES = SEED_CONTROLS.map((c) => c.code);
