// src/rooms/rooms.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { FilterRoomsDto } from './dto/filter-rooms.dto';
import { RoomStatus } from 'src/generated/prisma/enums';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  // ─── Создание помещения ──────────────────────────────────────────────────────
  async create(dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: {
        name: dto.name,
        type: dto.type,
        capacity: dto.capacity,
        address: dto.address,
        floor: dto.floor,
        equipment: dto.equipment ?? [],
        photoUrl: dto.photoUrl,
        status: dto.status ?? RoomStatus.ACTIVE,
      },
    });
  }

  // ─── Список с фильтрацией и пагинацией ──────────────────────────────────────
  async findAll(filters: FilterRoomsDto) {
    const {
      page = 1,
      limit = 10,
      type,
      minCapacity,
      equipment,
      dateFrom,
      dateTo,
      status,
    } = filters;

    // Валидация периода: если задан один параметр — нужен и второй
    if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
      throw new BadRequestException(
        'Необходимо указать оба параметра: dateFrom и dateTo',
      );
    }

    // Валидация: начало должно быть раньше конца
    if (dateFrom && dateTo && new Date(dateFrom) >= new Date(dateTo)) {
      throw new BadRequestException('dateFrom должен быть раньше dateTo');
    }

    // ─── Строим объект where динамически ────────────────────────────────────
    const where: any = {
      // По умолчанию показываем только активные помещения
      // Если явно передан status — используем его (Admin может смотреть все)
      status: status ?? RoomStatus.ACTIVE,
    };

    if (type) {
      where.type = type;
    }

    if (minCapacity) {
      // gte = greater than or equal (больше или равно)
      where.capacity = { gte: minCapacity };
    }

    if (equipment && equipment.length > 0) {
      // AND-логика: помещение должно иметь ВСЕ запрошенные теги
      // hasEvery — оператор Prisma для проверки что массив содержит все элементы
      where.equipment = { hasEvery: equipment };
    }

    // ─── Фильтрация по доступности ───────────────────────────────────────────
    if (dateFrom && dateTo) {
      // Помещение недоступно если у него есть ХОТЯ БЫ ОДНА активная бронь
      // которая пересекается с запрошенным периодом.
      //
      // Две брони пересекаются если: startA < endB AND endA > startB
      // (стандартная формула пересечения отрезков)
      //
      // NOT означает: исключаем помещения У КОТОРЫХ ЕСТЬ такая бронь
      where.NOT = {
        bookings: {
          some: {
            status: { not: 'CANCELLED' }, // отменённые брони не блокируют время
            AND: [
              { startTime: { lt: new Date(dateTo) } }, // бронь начинается до конца запроса
              { endTime: { gt: new Date(dateFrom) } }, // бронь кончается после начала запроса
            ],
          },
        },
      };
    }

    // ─── Выполняем запросы параллельно для производительности ────────────────
    const [rooms, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        skip: (page - 1) * limit, // пропускаем записи предыдущих страниц
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          // Считаем количество активных броней (для отображения занятости)
          _count: {
            select: {
              bookings: {
                where: { status: { not: 'CANCELLED' } },
              },
            },
          },
        },
      }),
      this.prisma.room.count({ where }),
    ]);

    // Возвращаем данные вместе с метаданными пагинации
    return {
      data: rooms,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Получение одного помещения ──────────────────────────────────────────────
  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        // Включаем ближайшие брони для отображения расписания
        bookings: {
          where: {
            status: { not: 'CANCELLED' },
            startTime: { gte: new Date() }, // только будущие
          },
          orderBy: { startTime: 'asc' },
          take: 20, // берём не более 20 ближайших броней
          select: {
            id: true,
            startTime: true,
            endTime: true,
            // НЕ включаем userId — сотрудники не должны видеть чьи брони
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Помещение с id ${id} не найдено`);
    }

    return room;
  }

  // ─── Обновление помещения ────────────────────────────────────────────────────
  async update(id: string, dto: UpdateRoomDto) {
    // Проверяем существование перед обновлением
    await this.findOne(id);

    return this.prisma.room.update({
      where: { id },
      data: dto,
    });
  }

  // ─── Удаление помещения ──────────────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);

    // Проверяем нет ли будущих активных броней
    // Нельзя удалять помещение с незавершёнными бронями
    const activeFutureBookings = await this.prisma.booking.count({
      where: {
        roomId: id,
        status: { not: 'CANCELLED' },
        startTime: { gte: new Date() },
      },
    });

    if (activeFutureBookings > 0) {
      throw new BadRequestException(
        `Невозможно удалить помещение: есть ${activeFutureBookings} активных будущих броней. ` +
          'Сначала отмените или переведите помещение в статус MAINTENANCE.',
      );
    }

    return this.prisma.room.delete({ where: { id } });
  }

  // ─── Смена статуса (отдельный метод для явности) ─────────────────────────────
  async updateStatus(id: string, status: RoomStatus) {
    await this.findOne(id);

    return this.prisma.room.update({
      where: { id },
      data: { status },
    });
  }
}
