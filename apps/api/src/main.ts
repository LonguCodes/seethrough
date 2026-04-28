import { NestFactory } from "@nestjs/core";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { setupSwagger } from "./swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  app.enableCors({
    origin: '*',
    credentials: true,
  });

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
  // Set up the Proxmox shell proxy service
  const server = app.getHttpServer();

  setupSwagger(app);

  await app.listen(3000, () => {
    console.log('=================================');
    console.log(`🚀 Api listening on the port 3000`);
    console.log('=================================');
  });
}

// @ts-ignore
if (import.meta.env.PROD) {
  bootstrap();
}

export const viteNodeApp = NestFactory.create(AppModule);
