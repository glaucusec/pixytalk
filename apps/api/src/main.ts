import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const webUrl = process.env.WEB_URL;

  if (!webUrl) {
    throw new Error('WEB_URL is required');
  }
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.enableCors({ origin: webUrl, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
