// src/notifications/reminder.worker.ts
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from './notifications.service';

// Данные задачи, которые мы положили при создании брони в BookingsService
interface ReminderJobData {
  bookingId: string;
  userId: string;
  roomName: string;
  startTime: string; // ISO строка — JSON не умеет сериализовать Date
}

// @Processor('reminders') — говорит BullMQ что этот класс обрабатывает очередь 'reminders'
// WorkerHost — базовый класс NestJS, предоставляет метод process()
@Processor('reminders')
export class ReminderWorker extends WorkerHost {
  // Logger с именем класса — удобно в логах видеть откуда пришло сообщение
  private readonly logger = new Logger(ReminderWorker.name);

  constructor(private notificationsService: NotificationsService) {
    super();
  }

  // process() вызывается автоматически для каждой задачи из очереди
  // job.name — имя типа задачи ('send-reminder'), которое мы указали в BookingsService
  // job.data — данные задачи типа ReminderJobData
  async process(job: Job<ReminderJobData>): Promise<void> {
    this.logger.log(
      `Обработка напоминания: job=${job.id}, booking=${job.data.bookingId}`,
    );

    // Деструктурируем данные задачи
    const { bookingId, userId, roomName, startTime } = job.data;

    // Преобразуем ISO строку обратно в Date
    const startTimeDate = new Date(startTime);

    // Создаём уведомление — метод сам проверит что бронь не отменена
    const notification = await this.notificationsService.createReminder(
      userId,
      bookingId,
      roomName,
      startTimeDate,
    );

    if (notification) {
      this.logger.log(
        `Напоминание создано: userId=${userId}, booking=${bookingId}`,
      );
    } else {
      // Бронь была отменена — задача обработана, но уведомление не нужно
      this.logger.log(
        `Напоминание пропущено — бронь ${bookingId} отменена или не найдена`,
      );
    }
  }

  // ─── События жизненного цикла задачи (для логирования и отладки) ─────────

  // Вызывается когда задача успешно выполнена
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Задача выполнена: job=${job.id}`);
  }

  // Вызывается когда задача упала с ошибкой
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Задача упала: job=${job.id}, error=${error.message}`,
      error.stack,
    );
  }
}
