// src/components/PrivateRoute.tsx
import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/store/auth.store";

// Если не авторизован — редиректим на /login
export default function PrivateRoute() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
