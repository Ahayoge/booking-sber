// src/admin/dto/filter-users.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { Role } from 'src/generated/prisma/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterUsersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    example: 'Иван',
    description: 'Поиск по имени или email',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
