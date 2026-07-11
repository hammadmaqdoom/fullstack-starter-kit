import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  PayrollDeductionsQueryDto,
  PayrollRegisterQueryDto,
  PayrollVarianceQueryDto,
} from './dto/payroll-report.dto';
import { PayrollReportService } from './payroll-report.service';

const PAYROLL_REPORT_ROLES = [
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('reports')
@Controller({ path: 'reports', version: '1' })
@UseGuards(AuthGuard)
@Roles(...PAYROLL_REPORT_ROLES)
export class PayrollReportController {
  constructor(private readonly payrollReportService: PayrollReportService) {}

  @Get('payroll-register')
  @ApiOperation({ summary: 'Payroll register — gross/net/deductions per worker per pay run' })
  async register(@Query() query: PayrollRegisterQueryDto) {
    return this.payrollReportService.register(query);
  }

  @Get('payroll-deductions')
  @ApiOperation({ summary: 'Deductions breakdown per worker per pay run' })
  async deductions(@Query() query: PayrollDeductionsQueryDto) {
    return this.payrollReportService.deductions(query);
  }

  @Get('payroll-variance')
  @ApiOperation({ summary: 'Compare a pay run vs the prior period for the same legal entity' })
  async variance(@Query() query: PayrollVarianceQueryDto) {
    return this.payrollReportService.variance(query.payRunId);
  }
}
