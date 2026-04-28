import {DynamicModule, Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {ConfigModule, ConfigToken} from "@longucodes/config";
import {AppConfig, ConfigSchema} from "./config/app.config";
import {MetricsModule} from "./metrics/metrics.module";

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
        MetricsModule
    ]
})
export class AppModule {}