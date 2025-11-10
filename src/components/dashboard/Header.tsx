import React, { useMemo, useState } from "react";
import { Activity, BadgeCheck, Menu, Sun, Moon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/auth/useAuth";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { cn } from "@/lib/utils";

const navigationItems = [
  { name: "Dashboard", href: "/" },
  { name: "Doctores", href: "/doctor" },
  { name: "Pacientes", href: "/patients" },
  { name: "Datos en tiempo real", href: "/monitoring" },
];

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="px-4 sm:px-6">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
          {/* Brand + mobile menu */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir navegación</span>
            </Button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-semibold truncate">
                    VasoFlow · Panel de compresión
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <BadgeCheck className="h-3 w-3" />
                    Dispositivo conectado
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-muted-foreground truncate">
                  Sistema de control de banda neumática para extremidades
                </p>
              </div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs lg:text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side: theme + user + logout */}
          <div className="flex items-center gap-2 sm:gap-3">
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

            <div className="hidden sm:flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center">
                <span className="text-sm font-semibold">{initials}</span>
              </div>
              <div className="hidden lg:flex flex-col leading-tight">
                <span className="text-sm font-medium">
                  {user?.fullname ?? "Usuario"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Sesión activa
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile nav desplegable */}
      {mobileNavOpen && (
        <div className="border-t border-border bg-card md:hidden">
          <nav className="px-3 py-2 flex flex-col gap-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
