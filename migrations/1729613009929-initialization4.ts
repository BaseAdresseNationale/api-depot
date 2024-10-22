import { MigrationInterface, QueryRunner } from "typeorm";

export class Initialization41729613009929 implements MigrationInterface {
    name = 'Initialization41729613009929'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "revisions" ALTER COLUMN "ready" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "revisions" ALTER COLUMN "ready" SET NOT NULL`);
    }

}
