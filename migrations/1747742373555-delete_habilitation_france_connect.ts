import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteHabilitationFranceConnect1747742373555
  implements MigrationInterface
{
  name = 'DeleteHabilitationFranceConnect1747742373555';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "habilitations" DROP COLUMN "franceconnect_authentication_url"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "habilitations" ADD "franceconnect_authentication_url" text`,
    );
  }
}
