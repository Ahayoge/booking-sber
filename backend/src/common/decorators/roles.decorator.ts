// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from 'src/generated/prisma/enums';

export const ROLES_KEY = 'roles';
// Декоратор @Roles(Role.ADMIN) — устанавливает метаданные на endpoint
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
