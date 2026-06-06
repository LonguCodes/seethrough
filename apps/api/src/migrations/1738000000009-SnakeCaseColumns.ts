import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to rename all camelCase columns to snake_case across all tables.
 * Ensures consistency with the naming convention used by newer tables/columns.
 */
export class SnakeCaseColumns1738000000009 implements MigrationInterface {
  name = 'SnakeCaseColumns1738000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================
    // 1. users
    // =========================================================
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "roleId" TO "role_id"`);

    // =========================================================
    // 2. sessions
    // =========================================================
    await queryRunner.query(`ALTER TABLE "sessions" RENAME COLUMN "expiresAt" TO "expires_at"`);
    await queryRunner.query(`ALTER TABLE "sessions" RENAME COLUMN "userId" TO "user_id"`);
    await queryRunner.query(`ALTER TABLE "sessions" RENAME COLUMN "createdAt" TO "created_at"`);

    // =========================================================
    // 3. invitations
    // =========================================================
    await queryRunner.query(`ALTER TABLE "invitations" RENAME COLUMN "roleId" TO "role_id"`);
    await queryRunner.query(`ALTER TABLE "invitations" RENAME COLUMN "expiresAt" TO "expires_at"`);
    await queryRunner.query(`ALTER TABLE "invitations" RENAME COLUMN "createdAt" TO "created_at"`);

    // =========================================================
    // 4. user_mfa_enrollments
    // =========================================================
    await queryRunner.query(`ALTER TABLE "user_mfa_enrollments" RENAME COLUMN "userId" TO "user_id"`);
    await queryRunner.query(`ALTER TABLE "user_mfa_enrollments" RENAME COLUMN "mfaConfigId" TO "mfa_config_id"`);

    // =========================================================
    // 5. alert_triggers
    // =========================================================
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "scopeValue" TO "scope_value"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "targetType" TO "target_type"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "targetProperty" TO "target_property"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "conditionType" TO "condition_type"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "conditionValue" TO "condition_value"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "messageTemplate" TO "message_template"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "lookbackSeconds" TO "lookback_seconds"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "autoResolveEnabled" TO "auto_resolve_enabled"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "autoResolveLookbackSeconds" TO "auto_resolve_lookback_seconds"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "noRetriggerSeconds" TO "no_retrigger_seconds"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "lastTriggeredAt" TO "last_triggered_at"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "createdAt" TO "created_at"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "updatedAt" TO "updated_at"`);

    // =========================================================
    // 6. alerts
    // =========================================================
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "triggerId" TO "trigger_id"`);
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "triggerType" TO "trigger_type"`);
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "autoResolved" TO "auto_resolved"`);
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "lastMatchedAt" TO "last_matched_at"`);
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "resolvedAt" TO "resolved_at"`);
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "createdAt" TO "created_at"`);

    // =========================================================
    // 7. alert_integrations
    // =========================================================
    await queryRunner.query(`ALTER TABLE "alert_integrations" RENAME COLUMN "sendAllAlerts" TO "send_all_alerts"`);
    await queryRunner.query(`ALTER TABLE "alert_integrations" RENAME COLUMN "createdAt" TO "created_at"`);
    await queryRunner.query(`ALTER TABLE "alert_integrations" RENAME COLUMN "updatedAt" TO "updated_at"`);

    // =========================================================
    // 8. trigger_integrations
    // =========================================================
    await queryRunner.query(`ALTER TABLE "trigger_integrations" RENAME COLUMN "triggerId" TO "trigger_id"`);
    await queryRunner.query(`ALTER TABLE "trigger_integrations" RENAME COLUMN "integrationId" TO "integration_id"`);
    await queryRunner.query(`ALTER TABLE "trigger_integrations" RENAME COLUMN "createdAt" TO "created_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // =========================================================
    // 1. users
    // =========================================================
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "role_id" TO "roleId"`);

    // =========================================================
    // 2. sessions
    // =========================================================
    await queryRunner.query(`ALTER TABLE "sessions" RENAME COLUMN "expires_at" TO "expiresAt"`);
    await queryRunner.query(`ALTER TABLE "sessions" RENAME COLUMN "user_id" TO "userId"`);
    await queryRunner.query(`ALTER TABLE "sessions" RENAME COLUMN "created_at" TO "createdAt"`);

    // =========================================================
    // 3. invitations
    // =========================================================
    await queryRunner.query(`ALTER TABLE "invitations" RENAME COLUMN "role_id" TO "roleId"`);
    await queryRunner.query(`ALTER TABLE "invitations" RENAME COLUMN "expires_at" TO "expiresAt"`);
    await queryRunner.query(`ALTER TABLE "invitations" RENAME COLUMN "created_at" TO "createdAt"`);

    // =========================================================
    // 4. user_mfa_enrollments
    // =========================================================
    await queryRunner.query(`ALTER TABLE "user_mfa_enrollments" RENAME COLUMN "user_id" TO "userId"`);
    await queryRunner.query(`ALTER TABLE "user_mfa_enrollments" RENAME COLUMN "mfa_config_id" TO "mfaConfigId"`);

    // =========================================================
    // 5. alert_triggers
    // =========================================================
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "scope_value" TO "scopeValue"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "target_type" TO "targetType"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "target_property" TO "targetProperty"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "condition_type" TO "conditionType"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "condition_value" TO "conditionValue"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "message_template" TO "messageTemplate"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "lookback_seconds" TO "lookbackSeconds"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "auto_resolve_enabled" TO "autoResolveEnabled"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "auto_resolve_lookback_seconds" TO "autoResolveLookbackSeconds"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "no_retrigger_seconds" TO "noRetriggerSeconds"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "last_triggered_at" TO "lastTriggeredAt"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "created_at" TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "alert_triggers" RENAME COLUMN "updated_at" TO "updatedAt"`);

    // =========================================================
    // 6. alerts
    // =========================================================
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "trigger_id" TO "triggerId"`);
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "trigger_type" TO "triggerType"`);
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "auto_resolved" TO "autoResolved"`);
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "last_matched_at" TO "lastMatchedAt"`);
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "resolved_at" TO "resolvedAt"`);
    await queryRunner.query(`ALTER TABLE "alerts" RENAME COLUMN "created_at" TO "createdAt"`);

    // =========================================================
    // 7. alert_integrations
    // =========================================================
    await queryRunner.query(`ALTER TABLE "alert_integrations" RENAME COLUMN "send_all_alerts" TO "sendAllAlerts"`);
    await queryRunner.query(`ALTER TABLE "alert_integrations" RENAME COLUMN "created_at" TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "alert_integrations" RENAME COLUMN "updated_at" TO "updatedAt"`);

    // =========================================================
    // 8. trigger_integrations
    // =========================================================
    await queryRunner.query(`ALTER TABLE "trigger_integrations" RENAME COLUMN "trigger_id" TO "triggerId"`);
    await queryRunner.query(`ALTER TABLE "trigger_integrations" RENAME COLUMN "integration_id" TO "integrationId"`);
    await queryRunner.query(`ALTER TABLE "trigger_integrations" RENAME COLUMN "created_at" TO "createdAt"`);
  }
}