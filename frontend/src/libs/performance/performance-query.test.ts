import { describe, expect, it } from 'vitest';
import { parsePerformanceSearchParams } from './performance-query';

describe('parsePerformanceSearchParams', () => {
  it('reads reviewId', () => {
    expect(parsePerformanceSearchParams('?reviewId=abc')).toEqual({
      reviewId: 'abc',
      developmentActionId: null,
      meetingId: null,
    });
  });

  it('reads developmentActionId', () => {
    expect(
      parsePerformanceSearchParams('?developmentActionId=act-1'),
    ).toEqual({
      reviewId: null,
      developmentActionId: 'act-1',
      meetingId: null,
    });
  });

  it('reads meetingId', () => {
    expect(parsePerformanceSearchParams('?meetingId=m-1')).toEqual({
      reviewId: null,
      developmentActionId: null,
      meetingId: 'm-1',
    });
  });

  it('returns nulls when absent', () => {
    expect(parsePerformanceSearchParams('')).toEqual({
      reviewId: null,
      developmentActionId: null,
      meetingId: null,
    });
  });
});
