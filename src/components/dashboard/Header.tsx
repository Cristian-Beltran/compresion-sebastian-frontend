import React, { useEffect, useMemo, useState } from "react";
import { Sun, Moon, LogOut, WifiOff, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/auth/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { cn } from "@/lib/utils";
import axios from "@/lib/axios";

const pageLabels: Record<string, string> = {
  "/admin/dashboard": "Panel administrativo",
  "/admin/users": "Usuarios",
  "/admin/permissions": "Roles y permisos",
  "/admin/logs": "Registros",
  "/admin/reports": "Reportes",
  "/admin/settings": "Configuración",
  "/technical/dashboard": "Panel técnico",
  "/technical/control": "Control técnico",
  "/technical/sensors": "Sensores",
  "/technical/calibration": "Calibración",
  "/technical/alerts": "Alertas",
  "/technical/history": "Historial técnico",
  "/doctor/dashboard": "Panel principal",
  "/doctor/patients": "Pacientes",
  "/doctor/treatments/new": "Configuración de tratamiento",
  "/doctor/treatments/history": "Historial médico",
};

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const role = useAuthStore((state) => state.type);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [deviceOnline, setDeviceOnline] = useState<boolean | null>(null);

  const initials = useMemo(() => {
    const name = user?.fullname ?? "Usuario";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }, [user?.fullname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentPage = pageLabels[location.pathname] ?? "Panel";
  const roleLabelMap: Record<string, string> = {
    admin: "Administrador",
    technical: "Técnico Biomédico",
    doctor: "Médico / Enfermería",
  };
  const roleLabel = roleLabelMap[role ?? "doctor"] ?? "Usuario";

  const sessionUptime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }, [elapsedSeconds]);

  useEffect(() => {
    const startedAt = Number(localStorage.getItem("session_started_at") ?? Date.now());
    if (!localStorage.getItem("session_started_at")) {
      localStorage.setItem("session_started_at", String(startedAt));
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadStatus = () => {
      axios
        .get<{ online: boolean }>("/device/status")
        .then((response) => mounted && setDeviceOnline(Boolean(response.data.online)))
        .catch(() => mounted && setDeviceOnline(false));
    };
    loadStatus();
    const timer = window.setInterval(loadStatus, 5000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header className="sticky top-0 z-15 flex h-[72px] items-center justify-between border-b border-border/60 bg-card/94 px-6 backdrop-blur-xl">
      <div className="flex flex-col">
        <p className="eyebrow text-muted-foreground">
          Sebastian / {roleLabel}
        </p>
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          {currentPage}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold",
            deviceOnline
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {deviceOnline ? (
            <BadgeCheck className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {deviceOnline === null
            ? "Verificando"
            : deviceOnline
              ? "Equipo conectado"
              : "Sin conexion"}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={toggleTheme}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="sr-only">
            {theme === "light"
              ? "Activar modo oscuro"
              : "Activar modo claro"}
          </span>
        </Button>

        <div className="flex items-center gap-2.5">
          <div className="hidden text-right lg:block">
            <p className="text-sm font-semibold text-foreground">
              {user?.fullname ?? "Usuario"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Sesion {sessionUptime}
            </p>
          </div>
          <div
            className="grid h-10 w-10 place-items-center rounded-full text-sm font-extrabold text-white"
            style={{
              background: "#2c73a8",
              boxShadow: "inset 0 0 0 3px oklch(0.90 0.02 250)",
            }}
          >
            {initials}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Cerrar sesion</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
