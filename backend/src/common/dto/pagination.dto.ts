// src/common/dto/pagination.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Переиспользуемый DTO для пагинации — используется во всех списках
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, description: 'Номер страницы' })
  @IsOptional()
  @Type(() => Number) // преобразуем строку из query в число
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 10,
    description: 'Количество элементов на странице',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // защита от слишком больших запросов
  limit?: number = 10;
}
