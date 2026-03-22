// src/rooms/dto/create-room.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoomType, RoomStatus } from 'src/generated/prisma/enums';

export class CreateRoomDto {
  @ApiProperty({ example: 'Переговорная "Байкал"' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: RoomType, example: RoomType.MEETING_ROOM })
  @IsEnum(RoomType)
  type: RoomType;

  @ApiProperty({ example: 10, description: 'Максимальное кол-во человек' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  capacity: number;

  @ApiProperty({ example: 'ул. Вавилова, 19' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  address: string;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  floor: number;

  @ApiPropertyOptional({
    example: ['проектор', 'доска', 'микрофоны'],
    description: 'Список тегов оборудования',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // каждый элемент массива должен быть строкой
  equipment?: string[] = [];

  @ApiPropertyOptional({ example: 'https://cdn.sber.ru/rooms/baikal.jpg' })
  @IsOptional()
  @IsString({})
  photoUrl?: string;

  @ApiPropertyOptional({ enum: RoomStatus, default: RoomStatus.ACTIVE })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus = RoomStatus.ACTIVE;
}
