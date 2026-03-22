// src/api/rooms.api.ts
import api from "./axios";
import type { Room, PaginatedResponse } from "@/types";

export interface RoomFilters {
  page?: number;
  limit?: number;
  type?: string;
  minCapacity?: number;
  equipment?: string[];
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

export interface CreateRoomPayload {
  name: string;
  type: string;
  capacity: number;
  address: string;
  floor: number;
  equipment?: string[];
  photoUrl?: string;
  status?: string;
}

export const roomsApi = {
  getAll: (filters: RoomFilters = {}) => {
    // Сериализуем массив equipment как повторяющиеся параметры: equipment=X&equipment=Y
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else {
        params.append(key, String(value));
      }
    });
    return api.get<PaginatedResponse<Room>>(`/rooms?${params.toString()}`);
  },

  getOne: (id: string) => api.get<Room>(`/rooms/${id}`),

  create: (data: CreateRoomPayload) => api.post<Room>("/rooms", data),

  update: (id: string, data: Partial<CreateRoomPayload>) =>
    api.patch<Room>(`/rooms/${id}`, data),

  updateStatus: (id: string, status: string) =>
    api.patch<Room>(`/rooms/${id}/status`, { status }),

  delete: (id: string) => api.delete(`/rooms/${id}`),
};
