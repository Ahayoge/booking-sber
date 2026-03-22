// src/admin/admin.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilterUsersDto } from './dto/filter-users.dto';
import { FilterBookingsDto } from '../bookings/dto/filter-bookings.dto';
import {
  AnalyticsQueryDto,
  AnalyticsPeriod,
  AnalyticsDateRangeDto,
} from './dto/analytics-query.dto';
import { Role, BookingStatus } from 'src/generated/prisma/enums';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Список всех пользователей ───────────────────────────────────────────
  async findAllUsers(filters: FilterUsersDto) {
    const { page = 1, limit = 10, role, search } = filters;

    const where: any = {};

    if (role) where.role = role;

    // Поиск по имени ИЛИ email (нечувствительно к регистру через mode: insensitive)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
          role: true,
          createdAt: true,
          // Считаем количество броней пользователя
          _count: { select: { bookings: true } },
          // Пароль НИКОГДА не возвращаем!
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Изменить роль пользователя ──────────────────────────────────────────
  async updateUserRole(userId: string, newRole: Role) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`Пользователь с id ${userId} не найден`);
    }

    if (user.role === newRole) {
      throw new BadRequestException(`Пользователь уже имеет роль ${newRole}`);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  УПРАВЛЕНИЕ БРОНЯМИ
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Все брони с расширенной фильтрацией ─────────────────────────────────
  async findAllBookings(filters: FilterBookingsDto) {
    const { page = 1, limit = 10, status, roomId, dateFrom, dateTo } = filters;

    const where: any = {};
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
          // Admin видит полную информацию о брони
          room: {
            select: {
              id: true,
              name: true,
              type: true,
              address: true,
              floor: true,
            },
          },
          user: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  АНАЛИТИКА
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Топ-5 самых востребованных помещений ────────────────────────────────
  async getTopRooms(dateRange: AnalyticsDateRangeDto) {
    const { dateFrom, dateTo } = this.resolveDateRange(dateRange);

    // groupBy — группируем брони по roomId и считаем количество
    // Prisma groupBy аналог SQL: SELECT roomId, COUNT(*) FROM bookings GROUP BY roomId
    const grouped = await this.prisma.booking.groupBy({
      by: ['roomId'],
      where: {
        status: { not: BookingStatus.CANCELLED }, // только состоявшиеся
        startTime: { gte: dateFrom, lte: dateTo },
      },
      _count: { id: true }, // считаем количество броней
      orderBy: { _count: { id: 'desc' } }, // сортируем по убыванию
      take: 5, // берём только топ-5
    });

    if (grouped.length === 0) return [];

    // Подгружаем данные о помещениях одним запросом (не N запросов в цикле!)
    const roomIds = grouped.map((g) => g.roomId);
    const rooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, name: true, type: true, address: true },
    });

    // Объединяем результаты в удобный формат для фронта
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    return grouped.map((g) => ({
      room: roomMap.get(g.roomId),
      bookingsCount: g._count.id,
    }));
  }

  // ─── Загруженность по дням недели и часам ────────────────────────────────
  async getLoadByTime(dateRange: AnalyticsDateRangeDto) {
    const { dateFrom, dateTo } = this.resolveDateRange(dateRange);

    // Используем $queryRaw для оконных функций и date_part — PostgreSQL специфика
    // Prisma не поддерживает EXTRACT(DOW ...) через ORM-методы, поэтому raw SQL
    //
    // EXTRACT(DOW FROM ...) — день недели: 0=воскресенье, 6=суббота
    // EXTRACT(HOUR FROM ...) — час: 0-23
    // AT TIME ZONE 'Europe/Moscow' — переводим UTC → московское время для отображения
    const rows = await this.prisma.$queryRaw<
      Array<{ day_of_week: number; hour: number; count: bigint }>
    >`
      SELECT
        EXTRACT(DOW FROM "startTime" AT TIME ZONE 'Europe/Moscow')::int AS day_of_week,
        EXTRACT(HOUR FROM "startTime" AT TIME ZONE 'Europe/Moscow')::int AS hour,
        COUNT(*)::bigint AS count
      FROM "Booking"
      WHERE
        status != 'CANCELLED'
        AND "startTime" >= ${dateFrom}
        AND "startTime" <= ${dateTo}
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `;

    // BigInt не сериализуется в JSON нативно — конвертируем в Number
    return rows.map((r) => ({
      dayOfWeek: r.day_of_week,
      hour: r.hour,
      count: Number(r.count),
    }));
  }

  // ─── Общее количество броней за период ───────────────────────────────────
  async getBookingsCount(query: AnalyticsQueryDto) {
    const now = new Date();

    // Вычисляем границы всех периодов сразу для сравнительного графика
    const periods = this.buildPeriods(query.period, now);

    // Выполняем все запросы COUNT параллельно
    const counts = await Promise.all(
      periods.map(({ label, from, to }) =>
        this.prisma.booking
          .count({
            where: {
              startTime: { gte: from, lte: to },
              status: { not: BookingStatus.CANCELLED },
            },
          })
          .then((count) => ({ label, count, from, to })),
      ),
    );

    return counts;
  }

  // ─── Процент отменённых броней за период ─────────────────────────────────
  async getCancellationRate(dateRange: AnalyticsDateRangeDto) {
    const { dateFrom, dateTo } = this.resolveDateRange(dateRange);

    // Считаем общее и отменённые одним groupBy-запросом
    const grouped = await this.prisma.booking.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      _count: { id: true },
    });

    const total = grouped.reduce((sum, g) => sum + g._count.id, 0);
    const cancelled =
      grouped.find((g) => g.status === BookingStatus.CANCELLED)?._count.id ?? 0;
    const confirmed = total - cancelled;

    // Защита от деления на ноль
    const cancellationRate =
      total > 0
        ? Math.round((cancelled / total) * 100 * 10) / 10 // округляем до 0.1%
        : 0;

    return {
      total,
      confirmed,
      cancelled,
      cancellationRate, // в процентах, например 12.5
      period: { from: dateFrom, to: dateTo },
    };
  }

  // Добавить в src/admin/admin.service.ts

  // ─── Назначение / снятие владельца помещения ──────────────────────────────
  async assignRoomOwner(roomId: string, userId: string) {
    const [room, user] = await Promise.all([
      this.prisma.room.findUnique({ where: { id: roomId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!room) throw new NotFoundException(`Помещение ${roomId} не найдено`);
    if (!user) throw new NotFoundException(`Пользователь ${userId} не найден`);

    // ✅ ADMIN уже имеет доступ ко всем помещениям — назначать его владельцем бессмысленно
    if (user.role === 'ADMIN') {
      throw new BadRequestException(
        'Нельзя назначить ADMIN владельцем помещения — у него уже есть полный доступ',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.roomOwnership.upsert({
        where: { userId_roomId: { userId, roomId } },
        create: { userId, roomId },
        update: {},
      });

      // Повышаем роль только если пользователь был EMPLOYEE
      if (user.role === 'EMPLOYEE') {
        await tx.user.update({
          where: { id: userId },
          data: { role: 'ROOM_OWNER' },
        });
      }

      return tx.roomOwnership.findMany({
        where: { roomId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
    });
  }

  async removeRoomOwner(roomId: string, userId: string) {
    const ownership = await this.prisma.roomOwnership.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });

    if (!ownership) throw new NotFoundException('Владение не найдено');

    // Получаем пользователя чтобы проверить роль перед удалением
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    // ✅ ADMIN не должен менять роль при снятии владения
    if (user.role === 'ADMIN') {
      throw new BadRequestException(
        'ADMIN не может быть владельцем помещения — операция невозможна',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.roomOwnership.delete({
        where: { userId_roomId: { userId, roomId } },
      });

      // Понижаем до EMPLOYEE только если у пользователя больше нет помещений
      // и только если он НЕ ADMIN (двойная защита)
      const remaining = await tx.roomOwnership.count({ where: { userId } });
      if (remaining === 0 && user.role === 'ROOM_OWNER') {
        await tx.user.update({
          where: { id: userId },
          data: { role: 'EMPLOYEE' },
        });
      }

      return { message: 'Владелец снят' };
    });
  }

  async getRoomOwners(roomId: string) {
    return this.prisma.roomOwnership.findMany({
      where: { roomId },
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ПРИВАТНЫЕ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ═══════════════════════════════════════════════════════════════════════════

  // Возвращает dateFrom и dateTo: если не переданы — берём текущий месяц
  private resolveDateRange(dateRange: AnalyticsDateRangeDto): {
    dateFrom: Date;
    dateTo: Date;
  } {
    const now = new Date();

    const dateFrom = dateRange.dateFrom
      ? new Date(dateRange.dateFrom)
      : new Date(now.getFullYear(), now.getMonth(), 1); // 1-е число текущего месяца

    const dateTo = dateRange.dateTo ? new Date(dateRange.dateTo) : now;

    if (dateFrom >= dateTo) {
      throw new BadRequestException('dateFrom должен быть раньше dateTo');
    }

    return { dateFrom, dateTo };
  }

  // Строит массив периодов для графика getBookingsCount
  // Например для period='day': последние 7 дней
  // Для period='week': последние 8 недель
  // Для period='month': последние 12 месяцев
  private buildPeriods(
    period: AnalyticsPeriod,
    now: Date,
  ): Array<{ label: string; from: Date; to: Date }> {
    const periods: Array<{ label: string; from: Date; to: Date }> = [];

    if (period === AnalyticsPeriod.DAY) {
      // Последние 7 дней
      for (let i = 6; i >= 0; i--) {
        const from = new Date(now);
        from.setDate(from.getDate() - i);
        from.setHours(0, 0, 0, 0);

        const to = new Date(from);
        to.setHours(23, 59, 59, 999);

        periods.push({
          label: from.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
          }),
          from,
          to,
        });
      }
    } else if (period === AnalyticsPeriod.WEEK) {
      // Последние 8 недель
      for (let i = 7; i >= 0; i--) {
        const from = new Date(now);
        from.setDate(from.getDate() - i * 7);
        from.setHours(0, 0, 0, 0);

        const to = new Date(from);
        to.setDate(to.getDate() + 6);
        to.setHours(23, 59, 59, 999);

        periods.push({
          label: `Нед. ${from.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`,
          from,
          to,
        });
      }
    } else {
      // Последние 12 месяцев
      for (let i = 11; i >= 0; i--) {
        const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const to = new Date(
          now.getFullYear(),
          now.getMonth() - i + 1,
          0,
          23,
          59,
          59,
          999,
        );

        periods.push({
          label: from.toLocaleDateString('ru-RU', {
            month: 'short',
            year: '2-digit',
          }),
          from,
          to,
        });
      }
    }

    return periods;
  }
}
