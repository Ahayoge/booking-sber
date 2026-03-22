#!/bin/sh
# backend/entrypoint.sh

set -e  # остановить скрипт при любой ошибке

echo "⏳ Применяем миграции базы данных..."

# migrate deploy — применяет pending миграции в продакшне
# В отличие от migrate dev — не создаёт новых миграций, только применяет существующие
npx prisma migrate deploy

echo "✅ Миграции применены"
echo "🚀 Запускаем NestJS приложение..."

# Запускаем собранное приложение
exec node dist/src/main