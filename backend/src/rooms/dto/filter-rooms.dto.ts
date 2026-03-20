// src/rooms/dto/filter-rooms.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsInt,
  IsArray,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { RoomType, RoomStatus } from 'src/generated/prisma/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterRoomsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: RoomType })
  @IsOptional()
  @IsEnum(RoomType)
  type?: RoomType;

  @ApiPropertyOptional({ example: 5, description: 'Минимальная вместимость' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @ApiPropertyOptional({
    example: ['проектор', 'доска'],
    description: 'Теги оборудования (AND-логика: должны быть ВСЕ)',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  // Transform нужен т.к. query-параметры могут прийти как строка "проектор,доска"
  // или как повторяющийся параметр equipment=проектор&equipment=доска
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  equipment?: string[];

  @ApiPropertyOptional({
    example: '2026-03-20T10:00:00.000Z',
    description: 'Начало желаемого периода (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-03-20T12:00:00.000Z',
    description: 'Конец желаемого периода (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: RoomStatus,
    description: 'По умолчанию только ACTIVE',
  })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
