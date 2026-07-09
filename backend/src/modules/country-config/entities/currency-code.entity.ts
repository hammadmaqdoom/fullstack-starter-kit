import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('currency_codes')
export class CurrencyCodeEntity {
  @PrimaryColumn({ type: 'char', length: 3 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', default: 2 })
  decimalPlaces: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  symbol: string | null;
}
