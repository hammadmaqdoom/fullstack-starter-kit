import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFxVarianceAlertConfigs1783040100000
  implements MigrationInterface
{
  name = 'CreateFxVarianceAlertConfigs1783040100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fx_variance_alert_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "fromCurrency" char(3) NOT NULL,
        "toCurrency" char(3) NOT NULL,
        "thresholdPercent" decimal(6,2) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "updatedByUserId" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fx_variance_alert_configs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fx_variance_alert_configs_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_fx_variance_alert_configs_unique_pair"
        ON "fx_variance_alert_configs" ("tenantId", "fromCurrency", "toCurrency")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "fx_variance_alert_configs"`);
  }
}
