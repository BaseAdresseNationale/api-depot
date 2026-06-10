import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpiredAtPerimeter1781098629142 implements MigrationInterface {
  name = 'ExpiredAtPerimeter1781098629142';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "perimeters" ADD "expired_at" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "perimeters" DROP COLUMN "expired_at"`,
    );
  }
}
