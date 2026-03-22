// src/rooms/room-owner.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { RoomOwnerService } from './room-owner.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RoomOwnerGuard } from '../common/guards/room-owner.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';

// Все маршруты: /rooms/:roomId/manage/*
// Доступ: ROOM_OWNER (только для своих) или ADMIN (для всех)
@ApiTags('Room Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ROOM_OWNER, Role.ADMIN)
@Controller('rooms/:roomId/manage')
export class RoomOwnerController {
  constructor(private roomOwnerService: RoomOwnerService) {}

  // ─── Расписание ────────────────────────────────────────────────────────────

  @Get('schedule')
  @UseGuards(RoomOwnerGuard)
  @ApiOperation({ summary: 'Получить расписание помещения' })
  getSchedule(@Param('roomId', ParseUUIDPipe) roomId: string) {
    return this.roomOwnerService.getSchedule(roomId);
  }

  @Put('schedule')
  @UseGuards(RoomOwnerGuard)
  @ApiOperation({
    summary: 'Обновить расписание помещения',
    description:
      'Принимает массив из 7 дней (dayOfWeek 0-6). Перезаписывает расписание целиком.',
  })
  updateSchedule(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body()
    body: {
      days: Array<{
        dayOfWeek: number;
        isOpen: boolean;
        openTime: string;
        closeTime: string;
      }>;
    },
  ) {
    return this.roomOwnerService.updateSchedule(roomId, body.days);
  }

  // ─── Блокировки ────────────────────────────────────────────────────────────

  @Get('blocked-slots')
  @UseGuards(RoomOwnerGuard)
  @ApiOperation({ summary: 'Список заблокированных слотов' })
  getBlockedSlots(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.roomOwnerService.getBlockedSlots(roomId, dateFrom, dateTo);
  }

  @Post('blocked-slots')
  @UseGuards(RoomOwnerGuard)
  @ApiOperation({
    summary: 'Заблокировать временной слот',
    description:
      'Отменяет все существующие брони попадающие в слот и создаёт уведомления',
  })
  blockSlot(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: { startTime: string; endTime: string; reason?: string },
  ) {
    return this.roomOwnerService.blockSlot(roomId, body);
  }

  @Delete('blocked-slots/:slotId')
  @UseGuards(RoomOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Снять блокировку слота' })
  unblockSlot(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
  ) {
    return this.roomOwnerService.unblockSlot(roomId, slotId);
  }

  // ─── Брони ─────────────────────────────────────────────────────────────────

  @Get('bookings')
  @UseGuards(RoomOwnerGuard)
  @ApiOperation({ summary: 'Все брони помещения' })
  getRoomBookings(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.roomOwnerService.getRoomBookings(roomId, +page, +limit);
  }

  @Delete('bookings/:bookingId')
  @UseGuards(RoomOwnerGuard)
  @ApiOperation({ summary: 'Отменить бронь в своём помещении' })
  cancelBooking(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.roomOwnerService.cancelBookingInRoom(roomId, bookingId);
  }

  // ─── Аналитика ─────────────────────────────────────────────────────────────

  @Get('analytics')
  @UseGuards(RoomOwnerGuard)
  @ApiOperation({ summary: 'Аналитика своего помещения за текущий месяц' })
  getAnalytics(@Param('roomId', ParseUUIDPipe) roomId: string) {
    return this.roomOwnerService.getRoomAnalytics(roomId);
  }
}
