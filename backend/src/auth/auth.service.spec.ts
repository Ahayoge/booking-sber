// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// Мок PrismaService — не обращаемся к реальной БД в тестах
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Сбрасываем моки перед каждым тестом
    jest.clearAllMocks();
  });

  // ─── Тесты регистрации ─────────────────────────────────────────────────────

  describe('register()', () => {
    it('должен успешно зарегистрировать пользователя', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null); // email не занят
      mockPrismaService.user.create.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@sber.ru',
        name: 'Тест',
        department: 'IT',
        role: 'EMPLOYEE',
      });

      const result = await service.register({
        email: 'test@sber.ru',
        password: 'Password123',
        name: 'Тест',
        department: 'IT',
      });

      expect(result.email).toBe('test@sber.ru');
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
      // Проверяем что пароль НЕ сохраняется в открытом виде
      const createCall = mockPrismaService.user.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe('Password123');
    });

    it('должен выбросить ConflictException если email занят', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'existing@sber.ru',
          password: 'Password123',
          name: 'Тест',
          department: 'IT',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── Тесты входа ───────────────────────────────────────────────────────────

  describe('login()', () => {
    it('должен вернуть токены при верных данных', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@sber.ru',
        password: hashedPassword,
        name: 'Тест',
        role: 'EMPLOYEE',
      });
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);

      const result = await service.login({
        email: 'test@sber.ru',
        password: 'Password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('должен выбросить UnauthorizedException при неверном пароле', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@sber.ru',
        password: hashedPassword,
        role: 'EMPLOYEE',
      });

      await expect(
        service.login({ email: 'test@sber.ru', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('должен выбросить UnauthorizedException если пользователь не найден', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noone@sber.ru', password: 'Password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
