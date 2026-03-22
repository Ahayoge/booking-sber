// src/bookings/bookings.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role, RoomStatus, BookingStatus } from 'src/generated/prisma/enums';

// Вспомогательная функция: дата через N дней от сейчас
const futureDate = (days: number, hours = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, 0, 0, 0);
  return d;
};

const mockRoom = {
  id: 'room-uuid',
  name: 'Байкал',
  status: RoomStatus.ACTIVE,
};

const mockBooking = {
  id: 'booking-uuid',
  userId: 'user-uuid',
  roomId: 'room-uuid',
  startTime: futureDate(2, 10),
  endTime: futureDate(2, 11),
  status: BookingStatus.CONFIRMED,
  room: { name: 'Байкал' },
  user: { name: 'Иван', email: 'ivan@sber.ru' },
};

const mockPrisma = {
  room: { findUnique: jest.fn() },
  booking: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  notification: { create: jest.fn() },
  $transaction: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
  getJob: jest.fn(),
};

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('reminders'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    jest.clearAllMocks();
  });

  // ─── Валидация бизнес-правил при создании ─────────────────────────────────

  describe('create() — валидация дат', () => {
    const validDto = {
      roomId: 'room-uuid',
      startTime: futureDate(2, 10).toISOString(),
      endTime: futureDate(2, 12).toISOString(), // 2 часа
    };

    it('должен выбросить ошибку если startTime в прошлом', async () => {
      const dto = {
        ...validDto,
        startTime: new Date(Date.now() - 60000).toISOString(),
      };
      await expect(service.create('user-uuid', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('должен выбросить ошибку если бронирование более чем за 14 дней', async () => {
      const dto = {
        ...validDto,
        startTime: futureDate(15).toISOString(),
        endTime: futureDate(15, 12).toISOString(),
      };
      await expect(service.create('user-uuid', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('должен выбросить ошибку если длительность меньше 30 минут', async () => {
      const start = futureDate(2, 10);
      const end = new Date(start.getTime() + 20 * 60 * 1000); // +20 минут
      const dto = {
        ...validDto,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      };
      await expect(service.create('user-uuid', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('должен выбросить ошибку если длительность больше 13 часов', async () => {
      const start = futureDate(2, 8);
      const end = new Date(start.getTime() + 14 * 60 * 60 * 1000); // +14 часов
      const dto = {
        ...validDto,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      };
      await expect(service.create('user-uuid', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('должен выбросить ошибку если помещение на обслуживании', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        ...mockRoom,
        status: RoomStatus.MAINTENANCE,
      });
      await expect(service.create('user-uuid', validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('должен успешно создать бронь при валидных данных', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);
      // Мокируем транзакцию: она вызывает callback и возвращает его результат
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockPrisma.booking.findFirst.mockResolvedValue(null); // нет конфликтов
        mockPrisma.booking.create.mockResolvedValue(mockBooking);
        mockPrisma.notification.create.mockResolvedValue({});
        return callback(mockPrisma);
      });
      mockQueue.add.mockResolvedValue({});

      const result = await service.create('user-uuid', validDto);
      expect(result.id).toBe('booking-uuid');
    });
  });

  // ─── Отмена брони ─────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('должен выбросить ForbiddenException при попытке отменить чужую бронь', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        service.cancel('booking-uuid', 'other-user-uuid', Role.EMPLOYEE),
      ).rejects.toThrow(ForbiddenException);
    });

    it('должен выбросить BadRequestException при отмене менее чем за 1 час', async () => {
      // Бронь начинается через 30 минут
      const soonBooking = {
        ...mockBooking,
        userId: 'user-uuid',
        startTime: new Date(Date.now() + 30 * 60 * 1000),
      };
      mockPrisma.booking.findUnique.mockResolvedValue(soonBooking);

      await expect(
        service.cancel('booking-uuid', 'user-uuid', Role.EMPLOYEE),
      ).rejects.toThrow(BadRequestException);
    });

    it('Admin может отменить бронь менее чем за 1 час', async () => {
      const soonBooking = {
        ...mockBooking,
        userId: 'user-uuid',
        startTime: new Date(Date.now() + 30 * 60 * 1000),
      };
      mockPrisma.booking.findUnique.mockResolvedValue(soonBooking);
      mockPrisma.$transaction.mockResolvedValue([
        { ...soonBooking, status: BookingStatus.CANCELLED },
      ]);
      mockQueue.getJob.mockResolvedValue(null);

      const result = await service.cancel(
        'booking-uuid',
        'admin-uuid',
        Role.ADMIN,
      );
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('должен выбросить BadRequestException если бронь уже отменена', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });

      await expect(
        service.cancel('booking-uuid', 'user-uuid', Role.EMPLOYEE),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
