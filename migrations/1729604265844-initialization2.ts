import { MigrationInterface, QueryRunner } from "typeorm";

export class Initialization21729604265844 implements MigrationInterface {
    name = 'Initialization21729604265844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chefs_de_file" ALTER COLUMN "is_email_public" SET DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "type" SET DEFAULT 'bal'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "chefs_de_file" ALTER COLUMN "is_email_public" SET DEFAULT true`);
    }

}
