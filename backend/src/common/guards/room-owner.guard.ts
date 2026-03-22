import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoomOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const roomId = request.params.roomId ?? request.params.id;

    if (user.role === 'ADMIN') return true;

    if (!roomId) throw new ForbiddenException('roomId не найден в параметрах');

    const ownership = await this.prisma.roomOwnership.findUnique({
      where: { userId_roomId: { userId: user.id, roomId } },
    });

    if (!ownership) {
      throw new ForbiddenException(
        'Вы не являетесь владельцем этого помещения',
      );
    }

    return true;
  }
}
