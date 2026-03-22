import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from 'src/generated/prisma/enums';

export class RegisterDto {
  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'ivan@sber.ru' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'Отдел разработки' })
  @IsString()
  @IsOptional()
  department?: string;

  // ✅ Роль опциональна — если не передана, по умолчанию EMPLOYEE
  @ApiPropertyOptional({ enum: Role, default: Role.EMPLOYEE })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
