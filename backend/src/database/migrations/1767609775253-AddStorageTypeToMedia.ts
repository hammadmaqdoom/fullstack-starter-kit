import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStorageTypeToMedia1767609775253 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "media"
            ADD "storageType" character varying(20) NOT NULL DEFAULT 'local'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "media"
            DROP COLUMN "storageType"
        `);
    }

}
