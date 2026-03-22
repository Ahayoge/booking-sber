// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { join } from 'path';
import { mkdirSync } from 'fs';

// Проверяем все обязательные переменные окружения ДО старта приложения
function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ACCESS_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN',
    'REDIS_HOST',
    'REDIS_PORT',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Отсутствуют обязательные переменные окружения: ${missing.join(', ')}\n` +
        `Проверь файл .env в корне проекта.`,
    );
  }
}

async function bootstrap() {
  // Падаем сразу если .env заполнен неверно — до инициализации NestJS
  validateEnv();

  const app = await NestFactory.create(AppModule);

  mkdirSync(join(process.cwd(), 'uploads', 'rooms'), { recursive: true });

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Office Booking API')
    .setDescription('API для бронирования помещений офисного пространства')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Сервер запущен: http://localhost:${port}/api`);
  console.log(`📖 Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
