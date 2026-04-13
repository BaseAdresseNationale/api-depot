import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteModeRelax1776069379121 implements MigrationInterface {
  name = 'DeleteModeRelax1776069379121';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "is_relax_mode"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "is_relax_mode" boolean DEFAULT true`,
    );
  }
}
