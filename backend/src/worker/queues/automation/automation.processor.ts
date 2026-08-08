import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import {
  CheckInNudgeCardInput,
  LeaveApprovalCardInput,
  ProfileChangeCardInput,
  TeamsNotificationService,
} from '@/modules/automation/teams-notification.service';
import { AttendanceService } from '@/modules/time-leave/attendance.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor(QueueEnum.Automation)
export class AutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(
    private readonly teamsNotificationService: TeamsNotificationService,
    private readonly attendanceService: AttendanceService,
  ) {
    super();
  }

  async process(job: Job): Promise<Record<string, unknown>> {
    switch (job.name) {
      case JobEnum.Automation.SendLeaveApprovalCard: {
        await this.teamsNotificationService.sendLeaveApprovalCard(
          job.data as LeaveApprovalCardInput,
        );
        return { sent: true };
      }
      case JobEnum.Automation.SendProfileChangeCard: {
        await this.teamsNotificationService.sendProfileChangeCard(
          job.data as ProfileChangeCardInput,
        );
        return { sent: true };
      }
      case JobEnum.Automation.SendCheckInNudgeCard: {
        await this.teamsNotificationService.sendCheckInNudgeCard(
          job.data as CheckInNudgeCardInput,
        );
        return { sent: true };
      }
      case JobEnum.Automation.ScanCheckInNudges: {
        return this.runCheckInNudgeScan();
      }
      default:
        this.logger.warn(`Unknown automation job: ${job.name}`);
        return {};
    }
  }

  /**
   * Daily cron — find active workers who have not checked in yet today
   * and are not on approved leave, then fan out one nudge card each.
   */
  private async runCheckInNudgeScan(): Promise<{ queued: number }> {
    const workDate = new Date().toISOString().slice(0, 10);
    const workers = await this.attendanceService.listWorkersMissingCheckIn(
      workDate,
      DIGITARO_TENANT_ID,
    );

    let queued = 0;
    for (const worker of workers) {
      if (!worker.userId) {
        continue;
      }
      await this.teamsNotificationService.enqueueCheckInNudge({
        userId: worker.userId,
        workerId: worker.id,
        workerName: `${worker.firstName} ${worker.lastName}`.trim(),
        tenantId: worker.tenantId,
      });
      queued += 1;
    }

    this.logger.log(
      `Check-in nudge scan for ${workDate}: queued ${queued} card(s)`,
    );
    return { queued };
  }
}
