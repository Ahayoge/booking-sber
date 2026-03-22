// src/admin/admin.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role, BookingStatus } from 'src/generated/prisma/enums';
import { AnalyticsPeriod } from './dto/analytics-query.dto';

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  booking: {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  // ─── updateUserRole ──────────────────────────────────────────────────────

  describe('updateUserRole()', () => {
    it('должен выбросить NotFoundException если пользователь не найден', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserRole('non-existent', Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('должен выбросить BadRequestException если роль уже установлена', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid',
        role: Role.ADMIN,
      });

      await expect(
        service.updateUserRole('user-uuid', Role.ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('должен успешно обновить роль', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid',
        role: Role.EMPLOYEE,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-uuid',
        email: 'test@sber.ru',
        name: 'Иван',
        role: Role.ADMIN,
      });

      const result = await service.updateUserRole('user-uuid', Role.ADMIN);
      expect(result.role).toBe(Role.ADMIN);
    });
  });

  // ─── resolveDateRange через getCancellationRate ──────────────────────────

  describe('getCancellationRate()', () => {
    it('должен выбросить BadRequestException если dateFrom >= dateTo', async () => {
      await expect(
        service.getCancellationRate({
          dateFrom: '2026-03-20T12:00:00Z',
          dateTo: '2026-03-20T10:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('должен вернуть 0% отмен если броней не было', async () => {
      mockPrisma.booking.groupBy.mockResolvedValue([]);

      const result = await service.getCancellationRate({});
      expect(result.cancellationRate).toBe(0);
      expect(result.total).toBe(0);
    });

    it('должен корректно считать процент отмен', async () => {
      mockPrisma.booking.groupBy.mockResolvedValue([
        { status: BookingStatus.CONFIRMED, _count: { id: 8 } },
        { status: BookingStatus.CANCELLED, _count: { id: 2 } },
      ]);

      const result = await service.getCancellationRate({});
      expect(result.total).toBe(10);
      expect(result.cancelled).toBe(2);
      expect(result.cancellationRate).toBe(20);
    });
  });

  // ─── getBookingsCount ────────────────────────────────────────────────────

  describe('getBookingsCount()', () => {
    it('должен вернуть 7 периодов для period=day', async () => {
      mockPrisma.booking.count.mockResolvedValue(5);

      const result = await service.getBookingsCount({
        period: AnalyticsPeriod.DAY,
      });
      expect(result).toHaveLength(7);
    });

    it('должен вернуть 9 периодов для period=week (0..8)', async () => {
      mockPrisma.booking.count.mockResolvedValue(3);

      const result = await service.getBookingsCount({
        period: AnalyticsPeriod.WEEK,
      });
      expect(result).toHaveLength(9);
    });

    it('должен вернуть 12 периодов для period=month', async () => {
      mockPrisma.booking.count.mockResolvedValue(10);

      const result = await service.getBookingsCount({
        period: AnalyticsPeriod.MONTH,
      });
      expect(result).toHaveLength(12);
    });
  });

  // ─── getTopRooms ─────────────────────────────────────────────────────────

  describe('getTopRooms()', () => {
    it('должен вернуть пустой массив если броней нет', async () => {
      mockPrisma.booking.groupBy.mockResolvedValue([]);

      const result = await service.getTopRooms({});
      expect(result).toEqual([]);
    });

    it('должен вернуть топ-5 с данными помещений', async () => {
      mockPrisma.booking.groupBy.mockResolvedValue([
        { roomId: 'room-1', _count: { id: 15 } },
        { roomId: 'room-2', _count: { id: 10 } },
      ]);
      mockPrisma.user.findMany = jest.fn(); // не используется
      // Мокируем prisma.room.findMany — он вызывается внутри getTopRooms
      // Нам нужно добавить room в mockPrisma
      (mockPrisma as any).room = {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'room-1',
            name: 'Байкал',
            type: 'MEETING_ROOM',
            address: 'ул. Вавилова',
          },
          {
            id: 'room-2',
            name: 'Алтай',
            type: 'COWORKING',
            address: 'ул. Вавилова',
          },
        ]),
      };

      const result = await service.getTopRooms({});
      expect(result).toHaveLength(2);
      expect(result[0].bookingsCount).toBe(15);
    });
  });
});
