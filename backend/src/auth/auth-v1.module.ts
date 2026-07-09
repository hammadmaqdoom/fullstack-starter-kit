import { Module } from '@nestjs/common';
import { EntraAuthController } from './entra/entra-auth.controller';
import { EntraStrategy } from './entra/entra.strategy';
import { ContractorAuthController } from './contractor/contractor-auth.controller';
import { ContractorAuthService } from './contractor/contractor-auth.service';

@Module({
  controllers: [EntraAuthController, ContractorAuthController],
  providers: [EntraStrategy, ContractorAuthService],
})
export class AuthV1Module {}
