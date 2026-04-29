import {DynamicModule, Module} from "@nestjs/common";
import {ConfigModule} from "@longucodes/config";
import {ConfigSchema} from "./config/app.config.js";
import {KubernetesModule} from "./kubernetes/kubernetes.module.js";

@Module({
    imports: [
        ConfigModule.forRoot({
            loadEnv: true,
            schema: ConfigSchema,
            global: true
        }) as DynamicModule,
        KubernetesModule
    ]
})
export class AppModule {}
