// src/api/admin.api.ts
import api from "./axios";
import type { User, Booking, PaginatedResponse, RoomOwnership } from "@/types";

export const adminApi = {
  // Пользователи
  getUsers: (params: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) => api.get<PaginatedResponse<User>>("/admin/users", { params }),

  updateUserRole: (id: string, role: string) =>
    api.patch<User>(`/admin/users/${id}/role`, { role }),

  // Брони
  getAllBookings: (params: object) =>
    api.get<PaginatedResponse<Booking>>("/admin/bookings", { params }),

  // Аналитика
  getTopRooms: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get("/admin/analytics/top-rooms", { params }),

  getLoadByTime: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get("/admin/analytics/load-by-time", { params }),

  getBookingsCount: (period: "day" | "week" | "month") =>
    api.get("/admin/analytics/bookings-count", { params: { period } }),

  getCancellationRate: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get("/admin/analytics/cancellation-rate", { params }),

  // src/api/admin.api.ts — добавляем в конец существующего объекта adminApi

  // ─── Управление владельцами помещений ─────────────────────────────────────
  getRoomOwners: (roomId: string) =>
    api.get<RoomOwnership[]>(`/admin/rooms/${roomId}/owners`),

  assignRoomOwner: (roomId: string, userId: string) =>
    api.post(`/admin/rooms/${roomId}/owners/${userId}`),

  removeRoomOwner: (roomId: string, userId: string) =>
    api.delete(`/admin/rooms/${roomId}/owners/${userId}`),
};
