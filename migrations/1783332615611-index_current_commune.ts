import { MigrationInterface, QueryRunner } from 'typeorm';

export class IndexCurrentCommune1783332615611 implements MigrationInterface {
  name = 'IndexCurrentCommune1783332615611';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_revision_current_commune" ON "revisions" ("code_commune") WHERE "is_current" = TRUE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_revision_current_commune"`,
    );
  }
}
