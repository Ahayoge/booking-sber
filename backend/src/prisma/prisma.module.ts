// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() — делаем модуль глобальным, чтобы не импортировать PrismaModule
// в каждый модуль по отдельности
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // экспортируем, чтобы другие модули могли использовать
})
export class PrismaModule {}
