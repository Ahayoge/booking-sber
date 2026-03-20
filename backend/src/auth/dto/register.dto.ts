// src/auth/dto/register.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'ivan.ivanov@sber.ru' })
  @IsEmail({}, { message: 'Некорректный email' })
  email: string;

  @ApiProperty({ example: 'SecurePass123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не менее 8 символов' })
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Отдел разработки' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  department: string;
}
