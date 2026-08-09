export function parsePerformanceSearchParams(search: string): {
  reviewId: string | null;
  developmentActionId: string | null;
} {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  return {
    reviewId: params.get('reviewId'),
    developmentActionId: params.get('developmentActionId'),
  };
}
