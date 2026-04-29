import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const logLevel = (process.env.LOG_LEVEL || 'log') as any;
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: [logLevel, 'error', 'warn', 'debug', 'verbose'].filter(l => {
      const levels = ['error', 'warn', 'log', 'verbose', 'debug'];
      return levels.indexOf(l) <= levels.indexOf(logLevel);
    }) as any,
  });
  
  console.log('=================================');
  console.log(`======= ENV: ${process.env.NODE_ENV} ========`);
  console.log(`🚀 Kubernetes Agent started`);
  console.log('=================================');
  return app;
}

export const viteNodeApp = bootstrap();
