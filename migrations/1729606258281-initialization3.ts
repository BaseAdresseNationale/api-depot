import { MigrationInterface, QueryRunner } from "typeorm";

export class Initialization31729606258281 implements MigrationInterface {
    name = 'Initialization31729606258281'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "revisions" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "revisions" ALTER COLUMN "status" DROP DEFAULT`);
    }

}
