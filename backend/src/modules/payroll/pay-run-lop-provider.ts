import { Injectable } from '@nestjs/common';

export const PAY_RUN_LOP_PROVIDER = 'PAY_RUN_LOP_PROVIDER';

/**
 * Resolves loss-of-pay days for a worker within a pay run period.
 *
 * Kept as an injectable seam so leave/attendance integration can replace the
 * default stub later without touching pay run calculation logic.
 */
export interface PayRunLopProvider {
  resolveLopDays(
    workerId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<number>;
}

@Injectable()
export class DefaultPayRunLopProvider implements PayRunLopProvider {
  async resolveLopDays(): Promise<number> {
    return 0;
  }
}
