// src/bookings/dto/create-booking.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID помещения',
  })
  @IsUUID('4', { message: 'roomId должен быть валидным UUID' })
  roomId: string;

  @ApiProperty({
    example: '2026-03-25T10:00:00.000Z',
    description: 'Начало брони (ISO 8601, UTC)',
  })
  @IsDateString(
    {},
    { message: 'startTime должен быть датой в формате ISO 8601' },
  )
  startTime: string;

  @ApiProperty({
    example: '2026-03-25T12:00:00.000Z',
    description: 'Конец брони (ISO 8601, UTC)',
  })
  @IsDateString({}, { message: 'endTime должен быть датой в формате ISO 8601' })
  endTime: string;
}
