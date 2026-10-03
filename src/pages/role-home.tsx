import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/auth/useAuth";

export default function RoleHomePage() {
  const role = useAuthStore((state) => state.type);
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (role === "technical") return <Navigate to="/technical/dashboard" replace />;
  return <Navigate to="/doctor/dashboard" replace />;
}
