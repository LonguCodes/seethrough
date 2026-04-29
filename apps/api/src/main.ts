import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { setupSwagger } from "./swagger.js";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const logLevel = (process.env.LOG_LEVEL || 'log') as any;
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: [logLevel, 'error', 'warn', 'debug', 'verbose'].filter(l => {
      const levels = ['error', 'warn', 'log', 'verbose', 'debug'];
      return levels.indexOf(l) <= levels.indexOf(logLevel);
    }) as any,
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

  // @ts-ignore
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
