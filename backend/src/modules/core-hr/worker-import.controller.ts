import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ImportWorkersCsvDto } from './dto/worker-import.dto';
import { WorkerImportService } from './worker-import.service';

@ApiTags('workers')
@Controller({ path: 'workers/import', version: '1' })
@UseGuards(AuthGuard)
@Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
export class WorkerImportController {
  constructor(private readonly workerImportService: WorkerImportService) {}

  @Post('preview')
  @ApiOperation({ summary: 'Validate a worker CSV import without persisting rows' })
  async preview(@Body() dto: ImportWorkersCsvDto) {
    return this.workerImportService.preview(dto.csv);
  }

  @Post()
  @ApiOperation({ summary: 'Enqueue a worker CSV import batch (async, audited per row)' })
  async enqueue(
    @Body() dto: ImportWorkersCsvDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.workerImportService.enqueueImport(
      dto.csv,
      session.user.id,
      dto.fileName,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List recent worker import batches' })
  async list() {
    return this.workerImportService.listBatches();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a worker import batch status and row results' })
  async getBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.workerImportService.getBatch(id);
  }
}
