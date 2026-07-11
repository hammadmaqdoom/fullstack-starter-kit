import { csvToRecords, parseCsv } from '../utils/csv-import.util';

describe('csv-import.util', () => {
  it('parses plain comma-separated rows', () => {
    const rows = parseCsv('a,b,c\n1,2,3');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with embedded commas and escaped quotes', () => {
    const rows = parseCsv('name,note\n"Doe, John","He said ""hi"""');
    expect(rows).toEqual([
      ['name', 'note'],
      ['Doe, John', 'He said "hi"'],
    ]);
  });

  it('skips blank lines', () => {
    const rows = parseCsv('a,b\n1,2\n\n3,4\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('converts rows into header-keyed records', () => {
    const records = csvToRecords('firstName,lastName\nJane,Doe\nJohn,Smith');
    expect(records).toEqual([
      { firstName: 'Jane', lastName: 'Doe' },
      { firstName: 'John', lastName: 'Smith' },
    ]);
  });

  it('returns an empty array for a header-only file', () => {
    expect(csvToRecords('firstName,lastName')).toEqual([]);
  });
});
