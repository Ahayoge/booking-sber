// src/App.tsx
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router";
import { useAuthStore } from "@/store/auth.store";

// Layouts
import MainLayout from "@/components/layout/MainLayout";
import AuthLayout from "@/components/layout/AuthLayout";

// Страницы
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import RoomsPage from "@/pages/RoomsPage";
import RoomDetailPage from "@/pages/RoomDetailPage";
import BookingsPage from "@/pages/BookingsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import AdminRoomsPage from "@/pages/admin/AdminRoomsPage";
import AdminBookingsPage from "@/pages/admin/AdminBookingsPage";
import AdminAnalyticsPage from "@/pages/admin/AdminAnalyticsPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";

import RoomOwnerRoute from "@/components/RoomOwnerRoute";
import OwnerRoomPage from "@/pages/owner/OwnerRoomPage";

// Guard-компоненты
import PrivateRoute from "@/components/PrivateRoute";
import AdminRoute from "@/components/AdminRoute";

// Theme
import { useThemeStore } from "@/store/theme.store";

export default function App() {
  const { clearUser } = useAuthStore();
  const { isDark } = useThemeStore();

  useEffect(() => {
    document.body.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    // Слушаем событие разлогина из axios interceptor
    const handleLogout = () => clearUser();
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [clearUser]);

  return (
    <Routes>
      {/* Публичные маршруты */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Приватные маршруты — только для авторизованных */}
      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/rooms" replace />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/rooms/:id" element={<RoomDetailPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Маршруты только для Admin */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/rooms" element={<AdminRoomsPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
          <Route element={<RoomOwnerRoute />}>
            <Route path="/owner/rooms/:roomId" element={<OwnerRoomPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
