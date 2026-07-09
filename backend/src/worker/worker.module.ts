import { Module } from '@nestjs/common';
import { EmailQueueModule } from './queues/email/email.module';
import { FxQueueModule } from './queues/fx/fx.module';

@Module({
  imports: [EmailQueueModule, FxQueueModule],
})
export class WorkerModule {}
