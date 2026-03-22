// src/notifications/notifications.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, BookingStatus } from 'src/generated/prisma/client';

const mockNotification = {
  id: 'notif-uuid',
  userId: 'user-uuid',
  bookingId: 'booking-uuid',
  type: NotificationType.BOOKING_CONFIRMED,
  message: 'Тестовое уведомление',
  isRead: false,
  createdAt: new Date(),
};

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  booking: {
    findUnique: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  // ─── findAllForUser ──────────────────────────────────────────────────────

  describe('findAllForUser()', () => {
    it('должен вернуть список с unreadCount в meta', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);
      mockPrisma.notification.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unreadCount

      const result = await service.findAllForUser('user-uuid', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.unreadCount).toBe(1);
    });
  });

  // ─── markAsRead ──────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('должен выбросить NotFoundException если уведомление не найдено', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsRead('non-existent', 'user-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('должен выбросить ForbiddenException при попытке пометить чужое уведомление', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      await expect(
        service.markAsRead('notif-uuid', 'another-user-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('не должен делать UPDATE если уведомление уже прочитано', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      await service.markAsRead('notif-uuid', 'user-uuid');

      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });

    it('должен обновить isRead на true', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await service.markAsRead('notif-uuid', 'user-uuid');

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-uuid' },
        data: { isRead: true },
      });
    });
  });

  // ─── markAllAsRead ───────────────────────────────────────────────────────

  describe('markAllAsRead()', () => {
    it('должен вернуть количество обновлённых уведомлений', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-uuid');

      expect(result.updated).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid', isRead: false },
        data: { isRead: true },
      });
    });
  });

  // ─── createReminder ──────────────────────────────────────────────────────

  describe('createReminder()', () => {
    it('не должен создавать уведомление если бронь отменена', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        status: BookingStatus.CANCELLED,
      });

      const result = await service.createReminder(
        'user-uuid',
        'booking-uuid',
        'Байкал',
        new Date(),
      );

      expect(result).toBeNull();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('должен создать уведомление-напоминание для активной брони', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        status: BookingStatus.CONFIRMED,
      });
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        type: NotificationType.REMINDER,
      });

      const result = await service.createReminder(
        'user-uuid',
        'booking-uuid',
        'Байкал',
        new Date(Date.now() + 15 * 60 * 1000),
      );

      expect(result).not.toBeNull();
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: NotificationType.REMINDER,
            userId: 'user-uuid',
          }),
        }),
      );
    });
  });
});
