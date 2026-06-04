import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration for the unified auth method + MFA configuration system.
 * Introduced: auth_methods, mfa_configs, auth_methods_mfa_configs (junction), user_mfa_enrollments
 */
export class AuthMethodsMfa1738000000006 implements MigrationInterface {
  name = 'AuthMethodsMfa1738000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Auth methods table
    await queryRunner.query(`
      CREATE TABLE "auth_methods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" text NOT NULL,
        "name" character varying NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "priority" integer NOT NULL DEFAULT 0,
        "required_mfa_count" integer NOT NULL DEFAULT 1,
        "auto_create_users" boolean NOT NULL DEFAULT false,
        "default_role" character varying NOT NULL DEFAULT 'viewer',
        "settings" json NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_methods" PRIMARY KEY ("id")
      )
    `);

    // MFA configs table
    await queryRunner.query(`
      CREATE TABLE "mfa_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" text NOT NULL,
        "name" character varying NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "settings" json NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mfa_configs" PRIMARY KEY ("id")
      )
    `);

    // Junction table: auth_methods <-> mfa_configs
    await queryRunner.query(`
      CREATE TABLE "auth_methods_mfa_configs" (
        "auth_method_id" uuid NOT NULL,
        "mfa_config_id" uuid NOT NULL,
        CONSTRAINT "PK_auth_methods_mfa_configs" PRIMARY KEY ("auth_method_id", "mfa_config_id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "auth_methods_mfa_configs" ADD CONSTRAINT "FK_auth_methods_mfa_configs_auth_method"
        FOREIGN KEY ("auth_method_id") REFERENCES "auth_methods"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "auth_methods_mfa_configs" ADD CONSTRAINT "FK_auth_methods_mfa_configs_mfa_config"
        FOREIGN KEY ("mfa_config_id") REFERENCES "mfa_configs"("id") ON DELETE CASCADE
    `);

    // User MFA enrollments table
    await queryRunner.query(`
      CREATE TABLE "user_mfa_enrollments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid,
        "mfaConfigId" uuid,
        "type" text NOT NULL,
        "secret" character varying,
        "destination" character varying,
        "credential_id" character varying,
        "public_key_cose" character varying,
        "verified" boolean NOT NULL DEFAULT false,
        "enabled" boolean NOT NULL DEFAULT true,
        "last_used_at" TIMESTAMP,
        "backup_codes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_mfa_enrollments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "user_mfa_enrollments" ADD CONSTRAINT "FK_user_mfa_enrollments_user"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "user_mfa_enrollments" ADD CONSTRAINT "FK_user_mfa_enrollments_mfa_config"
        FOREIGN KEY ("mfaConfigId") REFERENCES "mfa_configs"("id") ON DELETE CASCADE
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_user_mfa_enrollments_user" ON "user_mfa_enrollments" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_mfa_enrollments_mfa_config" ON "user_mfa_enrollments" ("mfaConfigId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_mfa_enrollments_mfa_config"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_mfa_enrollments_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_mfa_enrollments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_methods_mfa_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mfa_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_methods"`);
  }
}