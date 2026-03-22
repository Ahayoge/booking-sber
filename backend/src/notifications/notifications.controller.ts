// src/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Список уведомлений текущего пользователя',
    description:
      'Возвращает уведомления с пагинацией и счётчиком непрочитанных',
  })
  @ApiResponse({
    status: 200,
    description:
      'Список уведомлений. meta.unreadCount — кол-во непрочитанных для бейджа',
  })
  findAll(
    @CurrentUser() user: { id: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.notificationsService.findAllForUser(user.id, pagination);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отметить все уведомления как прочитанные' })
  @ApiResponse({
    status: 200,
    description: '{ updated: N } — количество обновлённых',
  })
  markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отметить одно уведомление как прочитанное' })
  @ApiParam({ name: 'id', type: String, description: 'UUID уведомления' })
  @ApiResponse({ status: 403, description: 'Нет доступа к чужому уведомлению' })
  @ApiResponse({ status: 404, description: 'Уведомление не найдено' })
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
