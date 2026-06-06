import { ConfigModule, ConfigToken } from "@longucodes/config";
import type { DynamicModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { AlertsModule } from "./alerts/alerts.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard.js";
import { ClusterModule } from "./cluster/cluster.module.js";
import { ConfigSchema } from "./config/app.config.js";
import type { AppConfig } from "./config/app.config.js";
import { MetricsModule } from "./metrics/metrics.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      loadEnv: true,
      schema: ConfigSchema,
      global: true,
    }) as DynamicModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigToken],
      useFactory: (config: AppConfig) => ({
        ...config.database,
        type: "postgres",
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: ["apps/api/dist/migrations/*.js"],
        migrationsTableName: "migrations",
        namingStrategy: new SnakeNamingStrategy(),
        logging: "all"
      }),
    }),
    MetricsModule,
    ClusterModule,
    AlertsModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
