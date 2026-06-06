import type { LogLevel } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";

async function bootstrap() {
  const allLevels: LogLevel[] = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];
  const logLevel = process.env.LOG_LEVEL || 'log';
  const logLevelIndex = allLevels.indexOf(logLevel as LogLevel);
  
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: allLevels.slice(0, logLevelIndex !== -1 ? logLevelIndex + 1 : 4),
  });
  
  console.log('=================================');
  console.log(`======= ENV: ${process.env.NODE_ENV} ========`);
  console.log(`🚀 Kubernetes Agent started`);
  console.log('=================================');
  return app;
}

export const viteNodeApp = bootstrap();
