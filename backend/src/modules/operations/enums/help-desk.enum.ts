export enum HelpDeskQueue {
  HR = 'hr',
  IT = 'it',
  ADMIN = 'admin',
  FINANCE = 'finance',
}

export enum HelpDeskPriority {
  P1 = 'p1',
  P2 = 'p2',
  P3 = 'p3',
  P4 = 'p4',
}

/** FLW-OPS-003 — Open → In progress → Waiting on employee → Resolved → Closed. */
export enum HelpDeskStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_ON_EMPLOYEE = 'waiting_on_employee',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}
