import { AutomationModule } from '@/modules/automation/automation.module';
import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { AuditLogEntity } from '@/modules/compliance/entities/audit-log.entity';
import { CoreHrModule } from '@/modules/core-hr/core-hr.module';
import { ApprovalDelegationEntity } from '@/modules/core-hr/entities/approval-delegation.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { CountryConfigModule } from '@/modules/country-config/country-config.module';
import { EmploymentTypeCountryConfigEntity } from '@/modules/country-config/entities/employment-type-country-config.entity';
import { HolidayEntity } from '@/modules/country-config/entities/holiday.entity';
import { LeaveTypeEntity } from '@/modules/country-config/entities/leave-type.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CompOffController } from './comp-off.controller';
import { CompOffService } from './comp-off.service';
import { AttendanceDaySummaryEntity } from './entities/attendance-day-summary.entity';
import { AttendancePunchEntity } from './entities/attendance-punch.entity';
import { CompOffCreditEntity } from './entities/comp-off-credit.entity';
import { LeaveBalanceEntity } from './entities/leave-balance.entity';
import { LeaveRequestEntity } from './entities/leave-request.entity';
import { PunchCorrectionRequestEntity } from './entities/punch-correction-request.entity';
import { ShiftAssignmentEntity } from './entities/shift-assignment.entity';
import { ShiftRosterEntity } from './entities/shift-roster.entity';
import { LeaveAccrualService } from './leave-accrual.service';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { ShiftRosterController } from './shift-roster.controller';
import { ShiftRosterService } from './shift-roster.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendancePunchEntity,
      AttendanceDaySummaryEntity,
      PunchCorrectionRequestEntity,
      LeaveBalanceEntity,
      LeaveRequestEntity,
      LeaveTypeEntity,
      HolidayEntity,
      WorkerEntity,
      ApprovalDelegationEntity,
      EmploymentTypeCountryConfigEntity,
      AuditLogEntity,
      ShiftRosterEntity,
      ShiftAssignmentEntity,
      CompOffCreditEntity,
    ]),
    ComplianceModule,
    CountryConfigModule,
    CoreHrModule,
    AutomationModule,
  ],
  controllers: [
    AttendanceController,
    LeaveController,
    CalendarController,
    ShiftRosterController,
    CompOffController,
  ],
  providers: [
    AttendanceService,
    LeaveService,
    LeaveAccrualService,
    ShiftRosterService,
    CompOffService,
    CalendarService,
  ],
  exports: [
    AttendanceService,
    LeaveService,
    LeaveAccrualService,
    ShiftRosterService,
    CompOffService,
    CalendarService,
    TypeOrmModule,
  ],
})
export class TimeLeaveModule {}
