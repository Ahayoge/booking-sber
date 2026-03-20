// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/generated/prisma/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Читаем роли, установленные декоратором @Roles(...)
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Если декоратор @Roles не установлен — доступ открыт
    if (!requiredRoles) return true;

    // Сравниваем роль пользователя из JWT с требуемыми ролями
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
