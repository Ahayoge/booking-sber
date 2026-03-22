import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { MulterModule } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';

// Создаём папку uploads/rooms при старте если её нет
mkdirSync('./uploads/rooms', { recursive: true });

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [FilesController],
})
export class FilesModule {}
