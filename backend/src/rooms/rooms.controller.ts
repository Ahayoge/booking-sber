// src/rooms/rooms.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { FilterRoomsDto } from './dto/filter-rooms.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, RoomStatus } from 'src/generated/prisma/enums';

// Все маршруты этого контроллера требуют авторизации
@ApiTags('Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Создать помещение (только Admin)' })
  @ApiResponse({ status: 201, description: 'Помещение успешно создано' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Список помещений с фильтрацией и пагинацией',
    description:
      'Поддерживает фильтрацию по типу, вместимости, оборудованию и доступности в период',
  })
  @ApiResponse({
    status: 200,
    description: 'Список помещений с мета-данными пагинации',
  })
  findAll(@Query() filters: FilterRoomsDto) {
    return this.roomsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали помещения с ближайшими бронями' })
  @ApiParam({ name: 'id', type: String, description: 'UUID помещения' })
  @ApiResponse({ status: 404, description: 'Помещение не найдено' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // ParseUUIDPipe — автоматически валидирует что id является валидным UUID
    // Если передать не-UUID — получим 400 до вызова сервиса
    return this.roomsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Обновить данные помещения (только Admin)' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Изменить статус помещения (только Admin)' })
  @ApiParam({ name: 'id', type: String })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: RoomStatus,
  ) {
    return this.roomsService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT) // 204 — успешное удаление без тела ответа
  @ApiOperation({ summary: 'Удалить помещение (только Admin)' })
  @ApiResponse({ status: 204, description: 'Помещение удалено' })
  @ApiResponse({
    status: 400,
    description: 'Есть активные брони — удаление невозможно',
  })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomsService.remove(id);
  }
}
