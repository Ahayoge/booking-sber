// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { type Response, type Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Auth') // группировка в Swagger
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового сотрудника' })
  @ApiResponse({
    status: 201,
    description: 'Сотрудник успешно зарегистрирован',
  })
  @ApiResponse({ status: 409, description: 'Email уже используется' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK) // по умолчанию POST возвращает 201, нам нужен 200
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({
    status: 200,
    description: 'Успешный вход, возвращает accessToken',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response, // passthrough — NestJS сам отправит ответ
  ) {
    const result = await this.authService.login(dto);

    // Refresh token кладём в httpOnly cookie — JavaScript на фронте НЕ сможет его прочитать
    // Это защита от XSS-атак
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, // недоступен через document.cookie
      secure: process.env.NODE_ENV === 'production', // только HTTPS в проде
      sameSite: 'lax', // защита от CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней в миллисекундах
    });

    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление access token по refresh token из cookie',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Читаем refresh token из httpOnly cookie
    const refreshToken = req.cookies?.refreshToken;
    const result = await this.authService.refresh(refreshToken);

    // Устанавливаем новый refresh token (ротация)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard) // logout доступен только авторизованным
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выход из системы' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    await this.authService.logout(refreshToken);

    // Очищаем cookie
    res.clearCookie('refreshToken');
    return { message: 'Выход выполнен успешно' };
  }
}
