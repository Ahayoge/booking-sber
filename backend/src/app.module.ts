// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [
    // ConfigModule — загружает .env в process.env глобально
    ConfigModule.forRoot({ isGlobal: true }),
    // PrismaModule — глобальный (@Global), доступен везде
    PrismaModule,
    // Модули приложения — добавляем по мере реализации
    AuthModule,
    // RoomsModule,    ← добавим в следующем этапе
    // BookingsModule,
    // NotificationsModule,
    // AdminModule,
    RoomsModule,
  ],
})
export class AppModule {}
