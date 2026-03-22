import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomOwnerService {
  constructor(private prisma: PrismaService) {}

  // ─── Расписание ────────────────────────────────────────────────────────────

  async getSchedule(roomId: string) {
    await this.ensureRoomExists(roomId);

    const schedule = await this.prisma.roomSchedule.findMany({
      where: { roomId },
      orderBy: { dayOfWeek: 'asc' },
    });

    if (schedule.length === 0) {
      return this.getDefaultSchedule(roomId);
    }

    return schedule;
  }

  async updateSchedule(
    roomId: string,
    days: Array<{
      dayOfWeek: number;
      isOpen: boolean;
      openTime: string;
      closeTime: string;
    }>,
  ) {
    await this.ensureRoomExists(roomId);

    for (const day of days) {
      if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
        throw new BadRequestException('dayOfWeek должен быть от 0 до 6');
      }
      if (day.isOpen) {
        this.validateTimeRange(day.openTime, day.closeTime);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.roomSchedule.deleteMany({ where: { roomId } });
      await tx.roomSchedule.createMany({
        data: days.map((d) => ({ ...d, roomId })),
      });
      return tx.roomSchedule.findMany({
        where: { roomId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }

  // ─── Блокировки слотов ─────────────────────────────────────────────────────

  async getBlockedSlots(roomId: string, dateFrom?: string, dateTo?: string) {
    await this.ensureRoomExists(roomId);

    const where: any = { roomId };
    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = new Date(dateFrom);
      if (dateTo) where.startTime.lte = new Date(dateTo);
    }

    return this.prisma.roomBlockedSlot.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });
  }

  async blockSlot(
    roomId: string,
    data: { startTime: string; endTime: string; reason?: string },
  ) {
    await this.ensureRoomExists(roomId);

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (start >= end) {
      throw new BadRequestException('startTime должен быть раньше endTime');
    }
    if (start < new Date()) {
      throw new BadRequestException('Нельзя заблокировать слот в прошлом');
    }

    const overlap = await this.prisma.roomBlockedSlot.findFirst({
      where: {
        roomId,
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (overlap) {
      throw new ConflictException(
        `Слот пересекается с существующей блокировкой: ` +
          `${overlap.startTime.toISOString()} – ${overlap.endTime.toISOString()}`,
      );
    }

    const affectedBookings = await this.prisma.booking.findMany({
      where: {
        roomId,
        status: 'CONFIRMED',
        startTime: { lt: end },
        endTime: { gt: start },
      },
      include: { user: { select: { id: true } } },
    });

    return this.prisma.$transaction(async (tx) => {
      const blockedSlot = await tx.roomBlockedSlot.create({
        data: {
          roomId,
          startTime: start,
          endTime: end,
          reason: data.reason,
        },
      });

      for (const booking of affectedBookings) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' },
        });

        await tx.notification.create({
          data: {
            userId: booking.user.id,
            bookingId: booking.id,
            type: 'BOOKING_CANCELLED',
            message: `Ваша бронь отменена: помещение заблокировано${
              data.reason ? ` (${data.reason})` : ''
            }`,
          },
        });
      }

      return {
        blockedSlot,
        cancelledBookings: affectedBookings.length,
      };
    });
  }

  async unblockSlot(roomId: string, slotId: string) {
    const slot = await this.prisma.roomBlockedSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot || slot.roomId !== roomId) {
      throw new NotFoundException('Блокировка не найдена');
    }

    return this.prisma.roomBlockedSlot.delete({ where: { id: slotId } });
  }

  // ─── Брони помещения ───────────────────────────────────────────────────────

  async getRoomBookings(roomId: string, page = 1, limit = 20) {
    await this.ensureRoomExists(roomId);

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { roomId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
      }),
      this.prisma.booking.count({ where: { roomId } }),
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

  async cancelBookingInRoom(roomId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: { select: { id: true } } },
    });

    if (!booking || booking.roomId !== roomId) {
      throw new NotFoundException('Бронь не найдена в этом помещении');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Бронь уже отменена');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      await tx.notification.create({
        data: {
          userId: booking.user.id,
          bookingId,
          type: 'BOOKING_CANCELLED',
          message: 'Ваша бронь отменена владельцем помещения',
        },
      });

      return updated;
    });
  }

  // ─── Аналитика ────────────────────────────────────────────────────────────

  async getRoomAnalytics(roomId: string) {
    await this.ensureRoomExists(roomId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, confirmed, cancelled, upcoming] = await Promise.all([
      this.prisma.booking.count({
        where: { roomId, createdAt: { gte: monthStart } },
      }),
      this.prisma.booking.count({
        where: { roomId, status: 'CONFIRMED', createdAt: { gte: monthStart } },
      }),
      this.prisma.booking.count({
        where: { roomId, status: 'CANCELLED', createdAt: { gte: monthStart } },
      }),
      this.prisma.booking.count({
        where: { roomId, status: 'CONFIRMED', startTime: { gte: now } },
      }),
    ]);

    return {
      period: { from: monthStart, to: now },
      totalBookings: total,
      confirmedBookings: confirmed,
      cancelledBookings: cancelled,
      upcomingBookings: upcoming,
      cancellationRate:
        total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0,
    };
  }

  // ─── Приватные методы ──────────────────────────────────────────────────────

  private async ensureRoomExists(roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException(`Помещение ${roomId} не найдено`);
    return room;
  }

  private validateTimeRange(openTime: string, closeTime: string) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
      throw new BadRequestException('Время должно быть в формате HH:mm');
    }
    if (openTime >= closeTime) {
      throw new BadRequestException('openTime должен быть раньше closeTime');
    }
  }

  private getDefaultSchedule(roomId: string) {
    return Array.from({ length: 7 }, (_, dayOfWeek) => ({
      id: null,
      roomId,
      dayOfWeek,
      isOpen: dayOfWeek >= 1 && dayOfWeek <= 5,
      openTime: '09:00',
      closeTime: '18:00',
    }));
  }
}
