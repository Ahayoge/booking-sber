// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Кастомный декоратор @CurrentUser() — извлекает пользователя из JWT payload
// JWT Guard записывает пользователя в request.user после валидации токена
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
