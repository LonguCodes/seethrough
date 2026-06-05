import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration matching the initial alerts commit (3a1a640 feat: new layout, PVC monitoring,
 * later refined via d82675c feat: alerts v2).
 * Introduced: alert_triggers, alerts
 */
export class AlertsV11738000000003 implements MigrationInterface {
  name = 'AlertsV11738000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "alert_triggers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "scope" text NOT NULL DEFAULT 'cluster',
        "scopeValue" character varying,
        "targetType" character varying NOT NULL,
        "targetProperty" character varying NOT NULL,
        "conditionType" character varying NOT NULL,
        "conditionValue" jsonb NOT NULL,
        "messageTemplate" character varying,
        "enabled" boolean NOT NULL DEFAULT true,
        "lookbackSeconds" integer NOT NULL DEFAULT 0,
        "autoResolveEnabled" boolean NOT NULL DEFAULT true,
        "autoResolveLookbackSeconds" integer NOT NULL DEFAULT 0,
        "noRetriggerSeconds" integer NOT NULL DEFAULT 0,
        "lastTriggeredAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alert_triggers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "alerts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "message" character varying NOT NULL,
        "severity" text NOT NULL DEFAULT 'warning',
        "status" text NOT NULL DEFAULT 'active',
        "details" jsonb,
        "triggerId" uuid,
        "triggerType" character varying NOT NULL,
        "autoResolved" boolean NOT NULL DEFAULT false,
        "lastMatchedAt" TIMESTAMP,
        "resolvedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alerts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "alerts" ADD CONSTRAINT "FK_alerts_trigger"
        FOREIGN KEY ("triggerId") REFERENCES "alert_triggers"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "alerts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "alert_triggers"`);
  }
}