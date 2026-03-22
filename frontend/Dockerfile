# frontend/Dockerfile

# ─── Этап 1: сборка React-приложения ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# В продакшн-сборке Vite proxy не работает — фронт будет обращаться напрямую к /api
# Переменная VITE_API_URL позволяет настроить базовый URL API
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build
# После этой команды в папке /app/dist лежат статические файлы: index.html, JS, CSS

# ─── Этап 2: раздача статики через Nginx ──────────────────────────────────────
# Nginx — лёгкий веб-сервер, идеально подходит для раздачи статики
FROM nginx:alpine AS production

# Копируем собранные статические файлы в папку раздачи Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем нашу конфигурацию Nginx (проксирование /api и SPA-роутинг)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]