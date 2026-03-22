// src/store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
}

// persist — сохраняет стор в localStorage при перезагрузке страницы
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      clearUser: () => {
        localStorage.removeItem("accessToken");
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-store", // ключ в localStorage
      // Сохраняем только user, accessToken хранится отдельно
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
