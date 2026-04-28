import {NestFactory} from "@nestjs/core";
import {AppModule} from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('=================================');
  console.log(`======= ENV: ${process.env.NODE_ENV} ========`);
  console.log(`🚀 Agent standalone mode started`);
  console.log('=================================');
}

// @ts-ignore
if (import.meta.env.PROD) {
    bootstrap();
}

export const viteNodeApp = NestFactory.createApplicationContext(AppModule);

