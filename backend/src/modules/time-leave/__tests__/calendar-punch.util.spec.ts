import { PunchType } from '../enums/attendance.enum';
import {
  computeWorkedMinutes,
  groupPunchesByWorkerAndDate,
} from '../calendar-punch.util';

describe('computeWorkedMinutes', () => {
  it('sums completed in→out pairs and floors to minutes', () => {
    const minutes = computeWorkedMinutes([
      {
        punchType: PunchType.CHECK_IN,
        punchedAt: new Date('2026-08-04T09:00:00.000Z'),
      },
      {
        punchType: PunchType.CHECK_OUT,
        punchedAt: new Date('2026-08-04T12:00:00.000Z'),
      },
      {
        punchType: PunchType.CHECK_IN,
        punchedAt: new Date('2026-08-04T13:00:00.000Z'),
      },
      {
        punchType: PunchType.CHECK_OUT,
        punchedAt: new Date('2026-08-04T17:30:00.000Z'),
      },
    ]);
    // 3h + 4h30m = 450
    expect(minutes).toBe(450);
  });

  it('ignores unpaired open check-in for minutes', () => {
    expect(
      computeWorkedMinutes([
        {
          punchType: PunchType.CHECK_IN,
          punchedAt: new Date('2026-08-04T09:00:00.000Z'),
        },
      ]),
    ).toBe(0);
  });

  it('returns 0 for empty list', () => {
    expect(computeWorkedMinutes([])).toBe(0);
  });

  it('skips orphan check-out until a check-in opens a pair', () => {
    expect(
      computeWorkedMinutes([
        {
          punchType: PunchType.CHECK_OUT,
          punchedAt: new Date('2026-08-04T08:00:00.000Z'),
        },
        {
          punchType: PunchType.CHECK_IN,
          punchedAt: new Date('2026-08-04T09:00:00.000Z'),
        },
        {
          punchType: PunchType.CHECK_OUT,
          punchedAt: new Date('2026-08-04T10:00:00.000Z'),
        },
      ]),
    ).toBe(60);
  });
});

describe('groupPunchesByWorkerAndDate', () => {
  it('groups by worker local work date across UTC midnight', () => {
    const tz = new Map([['w1', 'Asia/Karachi']]); // UTC+5
    // 2026-08-04 22:00 UTC = 2026-08-05 03:00 in Karachi
    const punches = [
      {
        id: 'p1',
        workerId: 'w1',
        punchType: PunchType.CHECK_IN,
        punchedAt: new Date('2026-08-04T22:00:00.000Z'),
      },
      {
        id: 'p2',
        workerId: 'w1',
        punchType: PunchType.CHECK_OUT,
        punchedAt: new Date('2026-08-05T06:00:00.000Z'),
      },
    ];
    const map = groupPunchesByWorkerAndDate(punches, tz);
    expect(map.get('w1:2026-08-05')?.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(map.has('w1:2026-08-04')).toBe(false);
  });
});
