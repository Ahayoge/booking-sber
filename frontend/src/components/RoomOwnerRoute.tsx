// src/components/RoomOwnerRoute.tsx
import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/store/auth.store";

// Пропускаем ROOM_OWNER и ADMIN
export default function RoomOwnerRoute() {
  const { user } = useAuthStore();
  const allowed = user?.role === "ROOM_OWNER" || user?.role === "ADMIN";
  return allowed ? <Outlet /> : <Navigate to="/rooms" replace />;
}
