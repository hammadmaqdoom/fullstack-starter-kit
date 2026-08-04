import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { CountryConfigModule } from '@/modules/country-config/country-config.module';
import { Module } from '@nestjs/common';
import { ShellController } from './shell.controller';
import { ShellService } from './shell.service';

@Module({
  imports: [ComplianceModule, CountryConfigModule],
  controllers: [ShellController],
  providers: [ShellService],
  exports: [ShellService],
})
export class ShellModule {}
