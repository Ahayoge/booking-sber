import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Оборачивает стандартный Passport JWT Guard в NestJS-injectable Guard
// Используется как: @UseGuards(JwtAuthGuard) на контроллерах
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
