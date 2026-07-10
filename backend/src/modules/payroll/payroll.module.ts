import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompensationRecordEntity } from './entities/compensation-record.entity';
import { PayComponentEntity } from './entities/pay-component.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayComponentEntity, CompensationRecordEntity]),
  ],
  exports: [TypeOrmModule],
})
export class PayrollModule {}
