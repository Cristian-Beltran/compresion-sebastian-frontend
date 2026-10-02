// auth/ProtectedRoute.tsx
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "./useAuth";
import Cookies from "js-cookie";

interface Props {
  children: ReactNode;
}

export const AuthProvider = ({ children }: Props) => {
  const { loadFromStorage, verifyToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = Cookies.get("auth_token");
        if (!token) {
          throw new Error("No authentication token found");
        }
        
        loadFromStorage();
        await verifyToken();
        
        const { user } = useAuthStore.getState();
        if (!user?.id) {
          throw new Error("No user ID after verification");
        }
        
        if (mounted) {
          setIsAuthenticated(true);
          setLoading(false);
        }
      } catch (err) {
        useAuthStore.getState().logout();
        console.error("Auth error:", err);
        if (mounted) {
          setIsAuthenticated(false);
          setLoading(false);
        }
        navigate("/login", { replace: true });
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
