import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration matching the multi-user management commit (d6f4ab8 feat: mutliuser management).
 * Introduced: invitations
 */
export class Invitations1738000000002 implements MigrationInterface {
  name = 'Invitations1738000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" character varying NOT NULL,
        "username" character varying NOT NULL,
        "role" character varying NOT NULL DEFAULT 'viewer',
        "expiresAt" TIMESTAMP NOT NULL,
        "accepted" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_invitations_token" UNIQUE ("token"),
        CONSTRAINT "PK_invitations" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invitations"`);
  }
}