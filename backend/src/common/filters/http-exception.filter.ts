// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

// @Catch() без аргументов — перехватываем ВСЕ исключения, включая непойманные
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;
        // class-validator возвращает массив ошибок — берём первую
        message = Array.isArray(res.message) ? res.message[0] : res.message;
        error = res.error || error;
      }
    } else if (exception instanceof Error) {
      // Обрабатываем конфликт сериализации PostgreSQL (двойное бронирование)
      if ((exception as any).code === '40001') {
        statusCode = HttpStatus.CONFLICT;
        message = 'Помещение уже занято на это время. Попробуйте другое время.';
        error = 'Conflict';
      } else {
        message = exception.message;
      }
    }

    // Единый формат ответа для всех ошибок
    response.status(statusCode).json({
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
