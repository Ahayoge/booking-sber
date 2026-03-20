// src/rooms/rooms.module.ts
import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService],
  // Экспортируем RoomsService — он нужен в BookingsModule
  // для проверки существования и статуса помещения при бронировании
  exports: [RoomsService],
})
export class RoomsModule {}
