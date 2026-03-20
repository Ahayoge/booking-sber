// src/rooms/rooms.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoomType, RoomStatus } from 'src/generated/prisma/enums';

// Фабрика для создания тестового объекта комнаты
const mockRoom = (overrides = {}) => ({
  id: 'uuid-room-1',
  name: 'Переговорная Байкал',
  type: RoomType.MEETING_ROOM,
  capacity: 10,
  address: 'ул. Вавилова, 19',
  floor: 3,
  equipment: ['проектор', 'доска'],
  photoUrl: null,
  status: RoomStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockPrisma = {
  room: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  booking: {
    count: jest.fn(),
  },
};

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('должен создать помещение', async () => {
      const dto = {
        name: 'Переговорная Байкал',
        type: RoomType.MEETING_ROOM,
        capacity: 10,
        address: 'ул. Вавилова, 19',
        floor: 3,
        equipment: ['проектор'],
      };
      mockPrisma.room.create.mockResolvedValue(mockRoom());

      const result = await service.create(dto);

      expect(result.name).toBe('Переговорная Байкал');
      expect(mockPrisma.room.create).toHaveBeenCalledTimes(1);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('должен вернуть список с метаданными пагинации', async () => {
      mockPrisma.room.findMany.mockResolvedValue([mockRoom()]);
      mockPrisma.room.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('должен выбросить BadRequestException если задан только dateFrom', async () => {
      await expect(
        service.findAll({ dateFrom: '2026-03-20T10:00:00Z' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('должен выбросить BadRequestException если dateFrom >= dateTo', async () => {
      await expect(
        service.findAll({
          dateFrom: '2026-03-20T12:00:00Z',
          dateTo: '2026-03-20T10:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('должен вернуть помещение по id', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom());

      const result = await service.findOne('uuid-room-1');
      expect(result.id).toBe('uuid-room-1');
    });

    it('должен выбросить NotFoundException если помещение не найдено', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('должен выбросить BadRequestException при наличии активных броней', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom());
      // Симулируем 2 активные брони
      mockPrisma.booking.count.mockResolvedValue(2);

      await expect(service.remove('uuid-room-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('должен удалить помещение если нет активных броней', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom());
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.room.delete.mockResolvedValue(mockRoom());

      await service.remove('uuid-room-1');
      expect(mockPrisma.room.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-room-1' },
      });
    });
  });
});
