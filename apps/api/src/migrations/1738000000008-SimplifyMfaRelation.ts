import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to simplify MFA to a 1:0..1 relationship.
 * Each auth method now has zero or one MFA config (no junction table).
 * MFA is always required when linked.
 */
export class SimplifyMfaRelation1738000000008 implements MigrationInterface {
  name = 'SimplifyMfaRelation1738000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add mfa_config_id column to auth_methods
    await queryRunner.query(`
      ALTER TABLE "auth_methods"
      ADD COLUMN "mfa_config_id" uuid NULL
    `);

    // Add foreign key
    await queryRunner.query(`
      ALTER TABLE "auth_methods"
      ADD CONSTRAINT "FK_auth_methods_mfa_config" 
      FOREIGN KEY ("mfa_config_id") 
      REFERENCES "mfa_configs"("id") 
      ON DELETE SET NULL
    `);

    // Remove the junction table
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_methods_mfa_configs"`);

    // Remove required_mfa_count column
    await queryRunner.query(`
      ALTER TABLE "auth_methods" 
      DROP COLUMN IF EXISTS "required_mfa_count"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore required_mfa_count
    await queryRunner.query(`
      ALTER TABLE "auth_methods" 
      ADD COLUMN "required_mfa_count" integer NOT NULL DEFAULT 1
    `);

    // Recreate junction table
    await queryRunner.query(`
      CREATE TABLE "auth_methods_mfa_configs" (
        "auth_method_id" uuid NOT NULL,
        "mfa_config_id" uuid NOT NULL,
        CONSTRAINT "PK_auth_methods_mfa_configs" PRIMARY KEY ("auth_method_id", "mfa_config_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "auth_methods_mfa_configs"
      ADD CONSTRAINT "FK_ammc_auth_method" 
      FOREIGN KEY ("auth_method_id") 
      REFERENCES "auth_methods"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "auth_methods_mfa_configs"
      ADD CONSTRAINT "FK_ammc_mfa_config" 
      FOREIGN KEY ("mfa_config_id") 
      REFERENCES "mfa_configs"("id") 
      ON DELETE CASCADE
    `);

    // Migrate data: move mfa_config_id back to junction table
    await queryRunner.query(`
      INSERT INTO "auth_methods_mfa_configs" ("auth_method_id", "mfa_config_id")
      SELECT "id", "mfa_config_id" FROM "auth_methods" WHERE "mfa_config_id" IS NOT NULL
    `);

    // Drop foreign key and column
    await queryRunner.query(`
      ALTER TABLE "auth_methods" DROP CONSTRAINT IF EXISTS "FK_auth_methods_mfa_config"
    `);
    await queryRunner.query(`
      ALTER TABLE "auth_methods" DROP COLUMN IF EXISTS "mfa_config_id"
    `);
  }
}