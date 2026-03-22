// src/components/AdminRoute.tsx
import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/store/auth.store";

// Если не Admin — редиректим на главную
export default function AdminRoute() {
  const { user } = useAuthStore();
  return user?.role === "ADMIN" ? <Outlet /> : <Navigate to="/rooms" replace />;
}
