// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ReminderWorker } from './reminder.worker';

@Module({
  imports: [
    // Регистрируем ту же очередь 'reminders' что и в BookingsModule
    // BullMQ под капотом переиспользует одно и то же Redis-подключение
    // BookingsModule кладёт задачи → NotificationsModule их обрабатывает
    BullModule.registerQueue({
      name: 'reminders',
    }),
  ],
  controllers: [NotificationsController],
  // ReminderWorker — тоже провайдер NestJS, DI работает как обычно
  providers: [NotificationsService, ReminderWorker],
  exports: [NotificationsService],
})
export class NotificationsModule {}
