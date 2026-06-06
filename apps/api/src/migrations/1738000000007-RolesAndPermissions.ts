import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration for the roles + permissions feature.
 * Introduced: roles table
 * Modified: users (add roleId FK, drop old role column), invitations (add roleId FK, drop old role column)
 */
export class RolesAndPermissions1738000000007 implements MigrationInterface {
  name = 'RolesAndPermissions1738000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "superadmin" boolean NOT NULL DEFAULT false,
        "permissions" text NOT NULL DEFAULT '[]',
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);

    // Add roleId column to users (nullable initially)
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "roleId" uuid
    `);

    // Add roleId column to invitations (nullable initially)
    await queryRunner.query(`
      ALTER TABLE "invitations" ADD COLUMN "roleId" uuid
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "FK_users_role"
        FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "invitations" ADD CONSTRAINT "FK_invitations_role"
        FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT
    `);

    // Drop old role column from users and invitations (after FK is established)
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "role"
    `);

    await queryRunner.query(`
      ALTER TABLE "invitations" DROP COLUMN IF EXISTS "role"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add old role columns
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" character varying NOT NULL DEFAULT 'viewer'
    `);
    await queryRunner.query(`
      ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "role" character varying NOT NULL DEFAULT 'viewer'
    `);

    // Remove foreign keys
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_role"
    `);
    await queryRunner.query(`
      ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "FK_invitations_role"
    `);

    // Drop roleId columns
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "roleId"
    `);
    await queryRunner.query(`
      ALTER TABLE "invitations" DROP COLUMN IF EXISTS "roleId"
    `);

    // Drop roles table
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}