// src/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ─── Регистрация ────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    // Проверяем, не занят ли email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Хэшируем пароль — rounds=12 это баланс безопасности и производительности
    // Никогда не храним пароль в открытом виде!
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        department: dto.department,
      },
      // select — никогда не возвращаем хэш пароля клиенту!
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        role: true,
      },
    });

    return user;
  }

  // ─── Вход в систему ─────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Важно: одно и то же сообщение для "нет пользователя" и "неверный пароль"
    // — чтобы злоумышленник не мог определить, существует ли email в системе
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Генерируем пару токенов
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ─── Обновление access token по refresh token ────────────────────────────────
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token не предоставлен');
    }

    // Ищем все активные refresh токены пользователя и проверяем хэш
    // Мы не можем искать напрямую по хэшу bcrypt (он разный каждый раз),
    // поэтому находим кандидатов и проверяем через bcrypt.compare
    const tokenRecord = await this.findRefreshToken(refreshToken);

    if (!tokenRecord) {
      throw new UnauthorizedException('Недействительный refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      // Удаляем истёкший токен
      await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      throw new UnauthorizedException('Refresh token истёк. Войдите снова.');
    }

    const user = tokenRecord.user;

    // Ротация токена: удаляем старый, создаём новый
    // Это защищает от replay-атак с украденным refresh token
    await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ─── Выход из системы ───────────────────────────────────────────────────────
  async logout(refreshToken: string) {
    if (!refreshToken) return;

    const tokenRecord = await this.findRefreshToken(refreshToken);
    if (tokenRecord) {
      await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
    }
  }

  // ─── Приватные вспомогательные методы ───────────────────────────────────────

  // Генерирует access + refresh токены и сохраняет refresh в БД
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    // Явно приводим строку из .env к типу StringValue через as
    // StringValue — это брендированный тип из библиотеки ms (парсер времени)
    // Примеры валидных значений: '15m', '7d', '1h', '3600s'
    // process.env возвращает string | undefined, поэтому нужен fallback и приведение типа
    const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ??
      '15m') as StringValue;

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: accessExpiresIn,
    });

    // Refresh token — случайная строка, не JWT
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const hashedToken = await bcrypt.hash(rawRefreshToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  // Ищет refresh token в БД, проверяя хэш bcrypt
  private async findRefreshToken(rawToken: string) {
    // Получаем все токены (в реальном приложении лучше хранить prefix для быстрого поиска,
    // но для дипломного проекта достаточно этого подхода)
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        expiresAt: { gt: new Date() }, // только не истёкшие
      },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    // Проверяем каждый хэш — bcrypt.compare медленный намеренно
    for (const tokenRecord of tokens) {
      const isMatch = await bcrypt.compare(rawToken, tokenRecord.token);
      if (isMatch) return tokenRecord;
    }

    return null;
  }
}
