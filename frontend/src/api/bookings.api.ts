// src/api/bookings.api.ts
import api from "./axios";
import type { Booking, PaginatedResponse } from "@/types";

export interface CreateBookingPayload {
  roomId: string;
  startTime: string;
  endTime: string;
}

export interface BookingFilters {
  page?: number;
  limit?: number;
  status?: string;
  roomId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const bookingsApi = {
  getAll: (filters: BookingFilters = {}) =>
    api.get<PaginatedResponse<Booking>>("/bookings", { params: filters }),

  getOne: (id: string) => api.get<Booking>(`/bookings/${id}`),

  create: (data: CreateBookingPayload) => api.post<Booking>("/bookings", data),

  cancel: (id: string) => api.patch<Booking>(`/bookings/${id}/cancel`),
};
