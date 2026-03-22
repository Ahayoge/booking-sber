// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
// Prisma 7: импорт НЕ из "@prisma/client", а из сгенерированного клиента!
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
// OnModuleInit — подключаемся к БД при старте модуля
// OnModuleDestroy — отключаемся при остановке приложения
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      options: '-c client_encoding=UTF8',
    });

    // Передаём адаптер в PrismaClient
    super({ adapter });
  }

  async onModuleInit() {
    // Устанавливаем соединение с БД при загрузке модуля
    await this.$connect();
  }

  async onModuleDestroy() {
    // Закрываем соединение при выключении приложения (graceful shutdown)
    await this.$disconnect();
  }
}
