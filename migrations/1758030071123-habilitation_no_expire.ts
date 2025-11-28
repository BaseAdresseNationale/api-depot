import { MigrationInterface, QueryRunner } from 'typeorm';

export class HabilitationNoExpire1758030071123 implements MigrationInterface {
  name = 'HabilitationNoExpire1758030071123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "habilitations" DROP COLUMN "expires_at"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "habilitations" ADD "expires_at" TIMESTAMP`,
    );
  }
}
