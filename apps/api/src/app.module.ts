import {DynamicModule, Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {ConfigModule, ConfigToken} from "@longucodes/config";
import {AppConfig, ConfigSchema} from "./config/app.config.js";
import {MetricsModule} from "./metrics/metrics.module.js";
import {ClusterModule} from "./cluster/cluster.module.js";

@Module({
    imports: [
        ConfigModule.forRoot({
            loadEnv: true,
            schema: ConfigSchema,
            global: true
        }) as DynamicModule,
        TypeOrmModule.forRootAsync({
            inject: [ConfigToken],
            useFactory: (config: AppConfig) => ({
                ...config.database, 
                type: 'postgres',
                autoLoadEntities: true,
                synchronize: true // Assuming dev environment, would use migrations in prod
            })
        }),
        MetricsModule,
        ClusterModule
    ]
})
export class AppModule {}