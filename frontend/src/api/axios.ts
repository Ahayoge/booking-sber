// src/api/axios.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

// Создаём отдельный инстанс — не засоряем глобальный axios
const api = axios.create({
  // В dev-режиме Vite proxy перенаправит /api → localhost:3000/api
  baseURL: "/api",
  // Включаем отправку cookie (нужно для refresh token)
  withCredentials: true,
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Автоматически добавляем access token к каждому запросу
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Флаг: идёт ли сейчас процесс обновления токена
// Нужен чтобы не запустить несколько параллельных запросов /auth/refresh
let isRefreshing = false;

// Очередь запросов, ожидающих обновления токена
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

// Выполняем все запросы из очереди с новым токеном
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// ─── Response Interceptor ─────────────────────────────────────────────────────
// Перехватываем 401 и автоматически обновляем access token
api.interceptors.response.use(
  // Успешный ответ — просто возвращаем
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Обрабатываем только 401 и только один раз для каждого запроса
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Если уже идёт refresh — добавляем в очередь и ждём
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      // Помечаем запрос чтобы не попасть в бесконечный цикл
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Запрашиваем новый access token по refresh token из httpOnly cookie
        const response = await axios.post(
          "/api/auth/refresh",
          {},
          { withCredentials: true },
        );

        const newToken = response.data.accessToken;
        localStorage.setItem("accessToken", newToken);

        // Разблокируем всю очередь с новым токеном
        processQueue(null, newToken);

        // Повторяем оригинальный запрос с новым токеном
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh токен тоже истёк — разлогиниваем пользователя
        processQueue(refreshError, null);
        localStorage.removeItem("accessToken");
        // Редиректим на логин через событие (не через router — нет доступа здесь)
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
