// src/bookings/bookings.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FilterBookingsDto } from './dto/filter-bookings.dto';
import {
  Prisma,
  Role,
  RoomStatus,
  BookingStatus,
  NotificationType,
} from 'src/generated/prisma/client';

// Константы бизнес-правил — вынесены для читаемости и удобства изменения
const BOOKING_RULES = {
  MAX_DAYS_AHEAD: 14, // бронирование не более чем за 14 дней
  MIN_DURATION_MINUTES: 30, // минимум 30 минут
  MAX_DURATION_HOURS: 13, // максимум 13 часов
  CANCEL_BEFORE_MINUTES: 60, // отмена не позднее чем за 60 минут до начала
  REMINDER_BEFORE_MINUTES: 15, // напоминание за 15 минут
} as const;

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    // Инжектируем очередь BullMQ для отправки напоминаний
    // 'reminders' — имя очереди, должно совпадать с registerQueue в модуле
    @InjectQueue('reminders') private remindersQueue: Queue,
  ) {}

  // ─── Создание брони ─────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateBookingDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const now = new Date();

    // ── Валидация дат ────────────────────────────────────────────────────────

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException('Некорректный формат даты');
    }

    if (startTime <= now) {
      throw new BadRequestException('Начало брони должно быть в будущем');
    }

    // Проверка "не более 14 дней вперёд"
    const maxStartTime = new Date(now);
    maxStartTime.setDate(maxStartTime.getDate() + BOOKING_RULES.MAX_DAYS_AHEAD);
    if (startTime > maxStartTime) {
      throw new BadRequestException(
        `Бронирование возможно не более чем за ${BOOKING_RULES.MAX_DAYS_AHEAD} дней вперёд`,
      );
    }

    if (endTime <= startTime) {
      throw new BadRequestException(
        'Время окончания должно быть позже времени начала',
      );
    }

    // Проверка минимальной и максимальной длительности
    const durationMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    if (durationMinutes < BOOKING_RULES.MIN_DURATION_MINUTES) {
      throw new BadRequestException(
        `Минимальная длительность брони — ${BOOKING_RULES.MIN_DURATION_MINUTES} минут`,
      );
    }
    if (durationMinutes > BOOKING_RULES.MAX_DURATION_HOURS * 60) {
      throw new BadRequestException(
        `Максимальная длительность брони — ${BOOKING_RULES.MAX_DURATION_HOURS} часов`,
      );
    }

    // ── Проверяем существование и статус помещения ───────────────────────────
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });

    if (!room) {
      throw new NotFoundException(`Помещение с id ${dto.roomId} не найдено`);
    }

    if (room.status === RoomStatus.MAINTENANCE) {
      throw new BadRequestException(
        `Помещение "${room.name}" находится на обслуживании и недоступно для бронирования`,
      );
    }

    // Добавить в src/bookings/bookings.service.ts — в метод create(), перед транзакцией

    // ─── Проверка расписания помещения ────────────────────────────────────────
    const schedule = await this.prisma.roomSchedule.findMany({
      where: { roomId: dto.roomId },
    });

    if (schedule.length > 0) {
      const startDay = startTime.getDay(); // 0-6
      const daySchedule = schedule.find((s) => s.dayOfWeek === startDay);

      if (!daySchedule || !daySchedule.isOpen) {
        throw new BadRequestException(
          `Помещение недоступно в этот день недели`,
        );
      }

      // Проверяем что время брони укладывается в рабочие часы помещения
      const bookingOpenTime = startTime.toTimeString().slice(0, 5); // "HH:mm"
      const bookingCloseTime = endTime.toTimeString().slice(0, 5);

      if (
        bookingOpenTime < daySchedule.openTime ||
        bookingCloseTime > daySchedule.closeTime
      ) {
        throw new BadRequestException(
          `Помещение работает с ${daySchedule.openTime} до ${daySchedule.closeTime}`,
        );
      }
    }

    // ─── Проверка заблокированных слотов ─────────────────────────────────────
    const blockedSlot = await this.prisma.roomBlockedSlot.findFirst({
      where: {
        roomId: dto.roomId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (blockedSlot) {
      throw new ConflictException(
        `Выбранное время заблокировано${blockedSlot.reason ? `: ${blockedSlot.reason}` : ''}`,
      );
    }

    // ── Транзакция SERIALIZABLE: атомарная проверка конфликтов + создание ────
    //
    // Почему SERIALIZABLE, а не просто SELECT + INSERT?
    // Если два пользователя одновременно проверят свободно ли время (оба получат "да"),
    // затем оба попытаются создать бронь — без транзакции оба успешно создадут её.
    // SERIALIZABLE гарантирует: если две транзакции читают одни данные и обе пишут,
    // PostgreSQL откатит одну из них с кодом 40001 (SerializationFailure).
    // Мы перехватываем это в GlobalExceptionFilter и возвращаем 409 Conflict.

    let booking: any;
    try {
      booking = await this.prisma.$transaction(
        async (tx) => {
          // Ищем любую пересекающуюся активную бронь для этого помещения
          // Формула пересечения отрезков: startA < endB AND endA > startB
          const conflictingBooking = await tx.booking.findFirst({
            where: {
              roomId: dto.roomId,
              status: { not: BookingStatus.CANCELLED },
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gt: startTime } },
              ],
            },
          });

          if (conflictingBooking) {
            throw new ConflictException(
              'Помещение уже забронировано на указанное время. Выберите другой промежуток.',
            );
          }

          // Создаём бронь и уведомление в одной транзакции — атомарно
          const newBooking = await tx.booking.create({
            data: {
              userId,
              roomId: dto.roomId,
              startTime,
              endTime,
              status: BookingStatus.CONFIRMED,
            },
            include: {
              room: { select: { name: true } },
              user: { select: { name: true, email: true } },
            },
          });

          // Создаём уведомление о подтверждении брони внутри той же транзакции
          await tx.notification.create({
            data: {
              userId,
              bookingId: newBooking.id,
              type: NotificationType.BOOKING_CONFIRMED,
              message:
                `Бронь подтверждена: "${newBooking.room.name}" ` +
                `${this.formatDateTime(startTime)} – ${this.formatTime(endTime)}`,
            },
          });

          return newBooking;
        },
        // Уровень изоляции SERIALIZABLE — ключевой параметр
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      // Перебрасываем NestJS-исключения (ConflictException и т.д.) как есть
      if (error?.status) throw error;
      // Перебрасываем PostgreSQL SerializationFailure — его поймает GlobalExceptionFilter
      throw error;
    }

    // ── Планируем напоминание через BullMQ ────────────────────────────────────
    // Делаем это ПОСЛЕ транзакции — если транзакция упала, задачу не ставим
    await this.scheduleReminder(
      booking.id,
      userId,
      booking.room.name,
      startTime,
    );

    return booking;
  }

  // ─── Список броней ──────────────────────────────────────────────────────────
  async findAll(
    requestingUserId: string,
    requestingUserRole: Role,
    filters: FilterBookingsDto,
  ) {
    const { page = 1, limit = 10, status, roomId, dateFrom, dateTo } = filters;

    const where: any = {};

    // Сотрудник видит только свои брони, Admin — все
    if (requestingUserRole === Role.EMPLOYEE) {
      where.userId = requestingUserId;
    }

    if (status) where.status = status;
    if (roomId) where.roomId = roomId;

    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = new Date(dateFrom);
      if (dateTo) where.startTime.lte = new Date(dateTo);
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              type: true,
              address: true,
              floor: true,
            },
          },
          // Admin видит информацию о пользователе, Employee — нет
          user:
            requestingUserRole === Role.ADMIN
              ? {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    department: true,
                  },
                }
              : false,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Детали одной брони ──────────────────────────────────────────────────────
  async findOne(
    id: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        room: true,
        user: {
          select: { id: true, name: true, email: true, department: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Бронь с id ${id} не найдена`);
    }

    // Сотрудник может видеть только свою бронь
    if (
      requestingUserRole === Role.EMPLOYEE &&
      booking.userId !== requestingUserId
    ) {
      throw new ForbiddenException('Нет доступа к этой брони');
    }

    return booking;
  }

  // ─── Отмена брони ────────────────────────────────────────────────────────────
  async cancel(
    bookingId: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: { select: { name: true } } },
    });

    if (!booking) {
      throw new NotFoundException(`Бронь с id ${bookingId} не найдена`);
    }

    // Сотрудник может отменять только свои брони
    if (
      requestingUserRole === Role.EMPLOYEE &&
      booking.userId !== requestingUserId
    ) {
      throw new ForbiddenException('Вы можете отменять только свои брони');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Бронь уже отменена');
    }

    // Проверка правила "не позднее чем за 1 час" — только для сотрудников
    // Администратор может отменить в любой момент
    if (requestingUserRole === Role.EMPLOYEE) {
      const now = new Date();
      const minutesUntilStart =
        (booking.startTime.getTime() - now.getTime()) / (1000 * 60);

      if (minutesUntilStart < BOOKING_RULES.CANCEL_BEFORE_MINUTES) {
        throw new BadRequestException(
          `Отмена возможна не позднее чем за ${BOOKING_RULES.CANCEL_BEFORE_MINUTES} ` +
            `минут до начала. До начала осталось ${Math.floor(minutesUntilStart)} мин.`,
        );
      }
    }

    // Отменяем бронь и создаём уведомление атомарно
    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
        include: { room: { select: { name: true } } },
      }),
      this.prisma.notification.create({
        data: {
          userId: booking.userId, // уведомляем владельца брони
          bookingId: booking.id,
          type: NotificationType.BOOKING_CANCELLED,
          message:
            `Бронь отменена: "${booking.room.name}" ` +
            `${this.formatDateTime(booking.startTime)} – ${this.formatTime(booking.endTime)}`,
        },
      }),
    ]);

    // Удаляем задачу напоминания из BullMQ — бронь отменена, напоминание не нужно
    // jobId deterministic: 'reminder-{bookingId}' — позволяет найти задачу без хранения в БД
    try {
      const job = await this.remindersQueue.getJob(`reminder-${bookingId}`);
      if (job) await job.remove();
    } catch {
      // Если задача уже выполнилась или не существует — игнорируем ошибку
    }

    return updatedBooking;
  }

  // ─── Приватные вспомогательные методы ───────────────────────────────────────

  // Планирует BullMQ delayed job для напоминания за 15 минут до начала
  private async scheduleReminder(
    bookingId: string,
    userId: string,
    roomName: string,
    startTime: Date,
  ) {
    // Вычисляем задержку: момент срабатывания = startTime - 15 минут
    const reminderTime = new Date(
      startTime.getTime() - BOOKING_RULES.REMINDER_BEFORE_MINUTES * 60 * 1000,
    );
    const delay = reminderTime.getTime() - Date.now();

    // Если до напоминания уже меньше нуля — не планируем
    // (бронь могла быть создана менее чем за 15 мин до начала)
    if (delay <= 0) return;

    await this.remindersQueue.add(
      'send-reminder', // имя типа задачи (job name)
      // Данные, которые получит воркер
      { bookingId, userId, roomName, startTime: startTime.toISOString() },
      {
        delay, // задержка в миллисекундах
        // Детерминированный jobId — позволяет найти и удалить задачу при отмене брони
        // без необходимости хранить ID задачи в БД
        jobId: `reminder-${bookingId}`,
        // Удаляем задачу из Redis после выполнения (не засоряем память)
        removeOnComplete: true,
        removeOnFail: 3, // оставляем 3 последних упавших задачи для отладки
      },
    );
  }

  // Форматирует дату и время для сообщений уведомлений
  private formatDateTime(date: Date): string {
    return date.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
