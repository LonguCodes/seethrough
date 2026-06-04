import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration matching the SSO commit (7bb80ba feat: sso).
 * Introduced: sso_configs
 */
export class SsoConfig1738000000005 implements MigrationInterface {
  name = 'SsoConfig1738000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sso_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" text NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "allow_only_sso" boolean NOT NULL DEFAULT false,
        "auto_create_users" boolean NOT NULL DEFAULT false,
        "default_role" character varying NOT NULL DEFAULT 'viewer',
        "saml_entry_point" character varying,
        "saml_issuer" character varying,
        "saml_cert" text,
        "oidc_issuer_url" character varying,
        "oidc_client_id" character varying,
        "oidc_client_secret" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sso_configs" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sso_configs"`);
  }
}