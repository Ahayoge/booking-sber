// src/bookings/dto/filter-bookings.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { BookingStatus } from 'src/generated/prisma/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterBookingsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'Фильтр по помещению (UUID)' })
  @IsOptional()
  @IsUUID('4')
  roomId?: string;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-03-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
