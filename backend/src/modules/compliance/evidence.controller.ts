import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessReviewService } from './access-review.service';
import { DsarExportService } from './dsar-export.service';
import { AccessReviewEvidenceQueryDto } from './dto/access-review.dto';
import { ExportDsarDto } from './dto/dsar.dto';
import { PolarisRoleCode } from './enums/polaris-role-code.enum';

@ApiTags('compliance')
@Controller({ path: 'compliance', version: '1' })
@UseGuards(AuthGuard)
export class EvidenceController {
  constructor(
    private readonly dsarExportService: DsarExportService,
    private readonly accessReviewService: AccessReviewService,
  ) {}

  @Post('dsar/export')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'FLW-SEC-004 — build a DSAR access export package (profile, documents, audit trail, payslips)' })
  async exportDsar(
    @Body() dto: ExportDsarDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.dsarExportService.exportForWorker(dto, session.user.id);
  }

  @Get('evidence/access-review')
  @Roles(
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'FLW-SEC-005 — export a completed access review pack as CSV evidence' })
  async exportAccessReviewEvidence(
    @Query() query: AccessReviewEvidenceQueryDto,
  ) {
    return this.accessReviewService.exportEvidenceCsv(query.cycleId);
  }
}
