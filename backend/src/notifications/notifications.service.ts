// src/notifications/notifications.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from 'src/generated/prisma/enums';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // ─── Получить уведомления текущего пользователя ──────────────────────────
  async findAllForUser(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }, // новые — первые
        skip: (page - 1) * limit,
        take: limit,
        include: {
          // Включаем краткие данные о брони для контекста в UI
          booking: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              room: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    // Считаем количество непрочитанных — нужно для бейджа в UI
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  // ─── Отметить одно уведомление как прочитанное ───────────────────────────
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Уведомление с id ${notificationId} не найдено`,
      );
    }

    // Пользователь может помечать только свои уведомления
    if (notification.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому уведомлению');
    }

    // Если уже прочитано — просто возвращаем без лишнего UPDATE
    if (notification.isRead) return notification;

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  // ─── Отметить ВСЕ уведомления пользователя как прочитанные ──────────────
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    // result.count — количество обновлённых записей
    return { updated: result.count };
  }

  // ─── Создать уведомление (вызывается из Worker) ──────────────────────────
  // Этот метод используется BullMQ Worker для создания напоминания
  async createReminder(
    userId: string,
    bookingId: string,
    roomName: string,
    startTime: Date,
  ) {
    // Проверяем что бронь ещё активна перед отправкой напоминания
    // (её могли отменить пока задача ждала в очереди)
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true },
    });

    // Если бронь не найдена или уже отменена — напоминание не нужно
    if (!booking || booking.status === 'CANCELLED') {
      return null;
    }

    const timeStr = startTime.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit',
    });

    return this.prisma.notification.create({
      data: {
        userId,
        bookingId,
        type: NotificationType.REMINDER,
        message: `Напоминание: через 15 минут начинается бронь в "${roomName}" (в ${timeStr})`,
      },
    });
  }
}
