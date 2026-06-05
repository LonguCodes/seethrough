import type { LogLevel} from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { setupSwagger } from "./swagger.js";

async function bootstrap() {
  const allLevels: LogLevel[] = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];
  const logLevel = process.env.LOG_LEVEL || 'log';
  const logLevelIndex = allLevels.indexOf(logLevel as LogLevel);

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: allLevels.slice(0, logLevelIndex !== -1 ? logLevelIndex + 1 : 4),
  });
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      stopAtFirstError: false,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  setupSwagger(app);

  // @ts-expect-error Missing env definition
  if (import.meta.env.PROD) {
    await app.listen(3000, () => {
      console.log('=================================');
      console.log(`🚀 Api listening on the port 3000`);
      console.log('=================================');
    });
  }
  return app;
}

export const viteNodeApp = bootstrap();
