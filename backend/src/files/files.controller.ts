import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Req,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync } from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';
import type { Request } from 'express';

// Разрешённые форматы изображений
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@ApiTags('Files')
@Controller('files')
export class FilesController {
  @Post('upload/room-image')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ROOM_OWNER)
  @ApiOperation({ summary: 'Загрузить изображение помещения' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/rooms', // папка относительно dist/
        filename: (req, file, cb) => {
          // Генерируем уникальное имя: timestamp + случайное число + расширение
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `room-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return cb(
            new BadRequestException(
              `Недопустимый формат. Разрешены: ${ALLOWED_EXTENSIONS.join(', ')}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadRoomImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не был загружен');
    }

    const protocol = req.protocol; // http или https
    const host = req.get('host'); // localhost:3000
    const fullUrl = `${protocol}://${host}/api/files/rooms/${file.filename}`;

    // Возвращаем публичный URL по которому фронт будет показывать картинку
    return {
      url: fullUrl,
      filename: file.filename,
      size: file.size,
    };
  }

  // Раздаём загруженные файлы
  @Get('rooms/:filename')
  @ApiOperation({ summary: 'Получить изображение помещения' })
  serveRoomImage(@Param('filename') filename: string, @Res() res: Response) {
    // Защита от path traversal атак — имя файла не должно содержать ../ или /
    if (filename.includes('..') || filename.includes('/')) {
      throw new BadRequestException('Недопустимое имя файла');
    }

    const filePath = join(process.cwd(), 'uploads', 'rooms', filename);

    if (!existsSync(filePath)) {
      return res.status(404).json({ message: 'Файл не найден' });
    }

    return res.sendFile(filePath);
  }
}
