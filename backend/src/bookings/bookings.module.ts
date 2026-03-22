// src/bookings/bookings.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    // Регистрируем очередь 'reminders'
    // Воркер для этой очереди будет подключён в NotificationsModule
    BullModule.registerQueue({
      name: 'reminders',
    }),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
