// src/api/notifications.api.ts
import api from "./axios";
import type { Notification, PaginatedResponse } from "@/types";

export const notificationsApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<Notification>>("/notifications", {
      params: { page, limit },
    }),

  markAsRead: (id: string) =>
    api.patch<Notification>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch<{ updated: number }>("/notifications/read-all"),
};
