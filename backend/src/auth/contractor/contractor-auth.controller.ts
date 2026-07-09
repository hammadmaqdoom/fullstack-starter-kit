import { Public } from '@/decorators/public.decorator';
import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { ContractorAuthService } from './contractor-auth.service';
import { ContractorLoginDto } from './dto/contractor-login.dto';
import { ContractorMagicLinkDto } from './dto/contractor-magic-link.dto';

@ApiTags('auth')
@Controller({ path: 'auth/contractor', version: '1' })
@Throttle({ default: { limit: 5, ttl: 900 } })
export class ContractorAuthController {
  constructor(private readonly contractorAuthService: ContractorAuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Contractor email and password sign-in' })
  async login(
    @Body() dto: ContractorLoginDto,
    @Req() request: FastifyRequest,
  ) {
    return this.contractorAuthService.signInWithEmail(dto, request);
  }

  @Public()
  @Post('magic-link')
  @ApiOperation({ summary: 'Send contractor magic-link sign-in email' })
  async magicLink(@Body() dto: ContractorMagicLinkDto) {
    return this.contractorAuthService.sendMagicLink(dto);
  }
}
