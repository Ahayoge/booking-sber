// src/api/auth.api.ts
import api from "./axios";
import { type User } from "@/types";

export interface LoginPayload {
  email: string;
  password: string;
}
export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  department: string;
  role?: string;
}
export interface AuthResponse {
  user: User;
  accessToken: string;
}

export const authApi = {
  register: (data: RegisterPayload) => api.post<User>("/auth/register", data),

  login: async (data: LoginPayload): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/login", data);
    // Сохраняем access token в localStorage
    localStorage.setItem("accessToken", res.data.accessToken);
    return res.data;
  },

  logout: async () => {
    await api.post("/auth/logout");
    localStorage.removeItem("accessToken");
  },

  refresh: () => api.post<{ accessToken: string }>("/auth/refresh"),
};
