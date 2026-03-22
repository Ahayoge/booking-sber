// src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { FilterUsersDto } from './dto/filter-users.dto';
import {
  AnalyticsQueryDto,
  AnalyticsDateRangeDto,
} from './dto/analytics-query.dto';
import { FilterBookingsDto } from '../bookings/dto/filter-bookings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';

// Весь контроллер доступен только для ADMIN
@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ─── Пользователи ─────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Список всех пользователей с поиском и пагинацией' })
  findAllUsers(@Query() filters: FilterUsersDto) {
    return this.adminService.findAllUsers(filters);
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Изменить роль пользователя' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 400, description: 'Пользователь уже имеет эту роль' })
  updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: Role,
  ) {
    return this.adminService.updateUserRole(id, role);
  }

  // ─── Брони ────────────────────────────────────────────────────────────────

  @Get('bookings')
  @ApiOperation({ summary: 'Все брони системы с расширенной фильтрацией' })
  findAllBookings(@Query() filters: FilterBookingsDto) {
    return this.adminService.findAllBookings(filters);
  }

  // ─── Аналитика ────────────────────────────────────────────────────────────

  @Get('analytics/top-rooms')
  @ApiOperation({
    summary: 'Топ-5 самых востребованных помещений',
    description: 'Считает по количеству подтверждённых броней за период',
  })
  getTopRooms(@Query() dateRange: AnalyticsDateRangeDto) {
    return this.adminService.getTopRooms(dateRange);
  }

  @Get('analytics/load-by-time')
  @ApiOperation({
    summary: 'Тепловая карта загруженности',
    description:
      'Количество броней по дню недели (0-6) и часу (0-23), московское время',
  })
  getLoadByTime(@Query() dateRange: AnalyticsDateRangeDto) {
    return this.adminService.getLoadByTime(dateRange);
  }

  @Get('analytics/bookings-count')
  @ApiOperation({
    summary: 'Количество броней за период',
    description:
      'period=day → последние 7 дней, period=week → 8 недель, period=month → 12 месяцев',
  })
  getBookingsCount(@Query() query: AnalyticsQueryDto) {
    return this.adminService.getBookingsCount(query);
  }

  @Get('analytics/cancellation-rate')
  @ApiOperation({
    summary: 'Процент отменённых броней за период',
    description:
      'Возвращает total, confirmed, cancelled и cancellationRate в %',
  })
  getCancellationRate(@Query() dateRange: AnalyticsDateRangeDto) {
    return this.adminService.getCancellationRate(dateRange);
  }

  // Добавить в src/admin/admin.controller.ts

  @Get('rooms/:roomId/owners')
  @ApiOperation({ summary: 'Список владельцев помещения' })
  getRoomOwners(@Param('roomId', ParseUUIDPipe) roomId: string) {
    return this.adminService.getRoomOwners(roomId);
  }

  @Post('rooms/:roomId/owners/:userId')
  @ApiOperation({ summary: 'Назначить владельца помещения' })
  assignRoomOwner(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.adminService.assignRoomOwner(roomId, userId);
  }

  @Delete('rooms/:roomId/owners/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Снять владельца помещения' })
  removeRoomOwner(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.adminService.removeRoomOwner(roomId, userId);
  }
}
