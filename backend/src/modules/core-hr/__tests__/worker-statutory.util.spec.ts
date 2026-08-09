import {
  statutoryMapFromRows,
  statutoryRowsFromMap,
} from '../worker-statutory.util';

describe('worker-statutory.util', () => {
  it('maps JSON fields to rows skipping empty values', () => {
    const rows = statutoryRowsFromMap('t1', 'w1', 'PK', {
      cnic: '35202-1',
      ntn: '',
      eobi_number: 'E1',
    });
    expect(rows).toEqual([
      {
        tenantId: 't1',
        workerId: 'w1',
        countryCode: 'PK',
        fieldKey: 'cnic',
        fieldValue: '35202-1',
        expiryDate: null,
      },
      {
        tenantId: 't1',
        workerId: 'w1',
        countryCode: 'PK',
        fieldKey: 'eobi_number',
        fieldValue: 'E1',
        expiryDate: null,
      },
    ]);
  });

  it('rebuilds map from rows', () => {
    expect(
      statutoryMapFromRows([
        { fieldKey: 'cnic', fieldValue: '1' },
        { fieldKey: 'ntn', fieldValue: '2' },
      ]),
    ).toEqual({ cnic: '1', ntn: '2' });
  });
});
