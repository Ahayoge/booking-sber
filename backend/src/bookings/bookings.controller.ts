// src/bookings/bookings.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
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
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FilterBookingsDto } from './dto/filter-bookings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Создать бронь (с защитой от конфликтов через SERIALIZABLE)',
  })
  @ApiResponse({ status: 201, description: 'Бронь создана' })
  @ApiResponse({
    status: 400,
    description: 'Нарушение бизнес-правил (длительность, период)',
  })
  @ApiResponse({ status: 409, description: 'Помещение занято на это время' })
  create(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Список броней',
    description: 'Сотрудник видит только свои, Admin — все',
  })
  findAll(
    @CurrentUser() user: { id: string; role: any },
    @Query() filters: FilterBookingsDto,
  ) {
    return this.bookingsService.findAll(user.id, user.role, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали брони' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 403, description: 'Нет доступа к чужой брони' })
  @ApiResponse({ status: 404, description: 'Бронь не найдена' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: any },
  ) {
    return this.bookingsService.findOne(id, user.id, user.role);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отменить бронь' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: 400,
    description: 'Нельзя отменить менее чем за 1 час до начала',
  })
  @ApiResponse({ status: 403, description: 'Нельзя отменить чужую бронь' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: any },
  ) {
    return this.bookingsService.cancel(id, user.id, user.role);
  }
}
