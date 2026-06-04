import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration matching the alert integrations commit (cb07a6c feat: alert integrations).
 * Introduced: alert_integrations, trigger_integrations
 */
export class AlertIntegrations1738000000004 implements MigrationInterface {
  name = 'AlertIntegrations1738000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "alert_integrations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" text NOT NULL,
        "config" jsonb NOT NULL,
        "sendAllAlerts" boolean NOT NULL DEFAULT false,
        "enabled" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alert_integrations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "trigger_integrations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "triggerId" uuid NOT NULL,
        "integrationId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trigger_integrations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "trigger_integrations" ADD CONSTRAINT "FK_trigger_integrations_trigger"
        FOREIGN KEY ("triggerId") REFERENCES "alert_triggers"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "trigger_integrations" ADD CONSTRAINT "FK_trigger_integrations_integration"
        FOREIGN KEY ("integrationId") REFERENCES "alert_integrations"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "trigger_integrations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "alert_integrations"`);
  }
}