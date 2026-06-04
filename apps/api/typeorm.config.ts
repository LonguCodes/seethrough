import { DataSource } from 'typeorm';
import { User } from './src/auth/entities/user.entity.js';
import { Session } from './src/auth/entities/session.entity.js';
import { Invitation } from './src/auth/entities/invitation.entity.js';
import { AuthMethod } from './src/auth/entities/auth-method.entity.js';
import { MfaConfig } from './src/auth/entities/mfa-config.entity.js';
import { UserMfa } from './src/auth/entities/user-mfa.entity.js';
import { Alert } from './src/alerts/alert.entity.js';
import { AlertTrigger } from './src/alerts/alert-trigger.entity.js';
import { AlertIntegration } from './src/alerts/integrations/integration.entity.js';
import { TriggerIntegration } from './src/alerts/integrations/trigger-integration.entity.js';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE__HOST || 'localhost',
  port: Number(process.env.DATABASE__PORT) || 5432,
  database: process.env.DATABASE__DATABASE || 'template',
  username: process.env.DATABASE__USERNAME,
  password: process.env.DATABASE__PASSWORD,
  entities: [
    User,
    Session,
    Invitation,
    AuthMethod,
    MfaConfig,
    UserMfa,
    Alert,
    AlertTrigger,
    AlertIntegration,
    TriggerIntegration,
  ],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
});