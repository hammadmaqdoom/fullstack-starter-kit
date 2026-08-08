import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { TimeLeaveModule } from '@/modules/time-leave/time-leave.module';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Module, OnModuleInit } from '@nestjs/common';
import type { Queue as BullQueue } from 'bullmq';
import { LeaveAccrualProcessor } from './leave-accrual.processor';

@Module({
  imports: [
    TimeLeaveModule,
    BullModule.registerQueue({
      name: QueueEnum.LeaveAccrual,
    }),
  ],
  providers: [LeaveAccrualProcessor],
})
export class LeaveAccrualQueueModule implements OnModuleInit {
  constructor(
    @InjectQueue(QueueEnum.LeaveAccrual)
    private readonly leaveAccrualQueue: BullQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.leaveAccrualQueue.add(
      JobEnum.LeaveAccrual.MonthlyAccrue,
      {},
      {
        repeat: { pattern: '0 2 1 * *' },
        jobId: 'leave-accrual-monthly',
      },
    );
  }
}
