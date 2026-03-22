// src/api/room-owner.api.ts
import api from "./axios";
import type {
  RoomSchedule,
  RoomBlockedSlot,
  RoomAnalytics,
  Booking,
  PaginatedResponse,
} from "@/types";

export const roomOwnerApi = {
  // ─── Расписание ───────────────────────────────────────────────────────────
  getSchedule: (roomId: string) =>
    api.get<RoomSchedule[]>(`/rooms/${roomId}/manage/schedule`),

  updateSchedule: (
    roomId: string,
    days: Omit<RoomSchedule, "id" | "roomId">[],
  ) => api.put<RoomSchedule[]>(`/rooms/${roomId}/manage/schedule`, { days }),

  // ─── Блокировки ───────────────────────────────────────────────────────────
  getBlockedSlots: (
    roomId: string,
    params?: { dateFrom?: string; dateTo?: string },
  ) =>
    api.get<RoomBlockedSlot[]>(`/rooms/${roomId}/manage/blocked-slots`, {
      params,
    }),

  blockSlot: (
    roomId: string,
    data: { startTime: string; endTime: string; reason?: string },
  ) =>
    api.post<{ blockedSlot: RoomBlockedSlot; cancelledBookings: number }>(
      `/rooms/${roomId}/manage/blocked-slots`,
      data,
    ),

  unblockSlot: (roomId: string, slotId: string) =>
    api.delete(`/rooms/${roomId}/manage/blocked-slots/${slotId}`),

  // ─── Брони ────────────────────────────────────────────────────────────────
  getRoomBookings: (
    roomId: string,
    params?: { page?: number; limit?: number },
  ) =>
    api.get<PaginatedResponse<Booking>>(`/rooms/${roomId}/manage/bookings`, {
      params,
    }),

  cancelBooking: (roomId: string, bookingId: string) =>
    api.delete(`/rooms/${roomId}/manage/bookings/${bookingId}`),

  // ─── Аналитика ────────────────────────────────────────────────────────────
  getAnalytics: (roomId: string) =>
    api.get<RoomAnalytics>(`/rooms/${roomId}/manage/analytics`),
};
