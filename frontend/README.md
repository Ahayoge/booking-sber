# Office Booking — Платформа бронирования помещений

Внутренний корпоративный сервис для бронирования переговорных комнат,
коворкингов, медиастудий и спортзалов.

## Стек

| Слой     | Технология                                      |
| -------- | ----------------------------------------------- |
| Frontend | React 19 + Vite + Ant Design 6 + Zustand        |
| Backend  | NestJS + Prisma 7 + PostgreSQL 16               |
| Очередь  | BullMQ + Redis 7                                |
| Auth     | JWT (access 15м) + httpOnly cookie (refresh 7д) |

## Быстрый старт

### 1. Клонируем и настраиваем окружение

```bash
git clone <repo>
cd booking
```

**backend/.env:**
