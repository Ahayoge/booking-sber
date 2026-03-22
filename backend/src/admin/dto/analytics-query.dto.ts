// src/admin/dto/analytics-query.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';

// Периоды для агрегации аналитики
export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class AnalyticsQueryDto {
  @ApiProperty({
    enum: AnalyticsPeriod,
    example: AnalyticsPeriod.WEEK,
    description: 'Период агрегации',
  })
  @IsEnum(AnalyticsPeriod)
  period: AnalyticsPeriod;
}

export class AnalyticsDateRangeDto {
  @ApiPropertyOptional({
    example: '2026-03-01T00:00:00.000Z',
    description: 'Начало периода (по умолчанию — начало текущего месяца)',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-03-31T23:59:59.000Z',
    description: 'Конец периода (по умолчанию — текущий момент)',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
