import { Activity, AlertTriangle, Gauge, History, LayoutGrid, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/auth/useAuth";
import { Link, useLocation } from "react-router-dom";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutGrid },
  { label: "Control", href: "/admin/control", icon: Wrench },
  { label: "Calibracion", href: "/admin/calibration", icon: Gauge },
  { label: "Historial", href: "/admin/history", icon: History },
  { label: "Alertas", href: "/admin/alerts", icon: AlertTriangle },
  { label: "Usuarios", href: "/admin/users", icon: Users },
];

const doctorNav: NavItem[] = [
  { label: "Panel", href: "/doctor/dashboard", icon: LayoutGrid },
  { label: "Pacientes", href: "/doctor/patients", icon: Users },
  { label: "Nuevo tratamiento", href: "/doctor/treatments/new", icon: Activity },
  { label: "Historial", href: "/doctor/treatments/history", icon: History },
];

export function Sidebar() {
  const type = useAuthStore((state) => state.type);
  const location = useLocation();
  const nav = type === "admin" ? adminNav : doctorNav;
  const roleLabel = type === "admin" ? "Administrador" : "Medico";

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-[260px] flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <Activity className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Sebastian</p>
          <p className="text-[11px] font-bold uppercase tracking-widest text-sidebar-foreground/60">
            {roleLabel}
          </p>
        </div>
      </div>

      <div className="px-4 pt-2 pb-3">
        <p className="px-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-sidebar-foreground/50">
          Navegacion
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn("sidebar-nav-item", isActive && "active")}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border/50 px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
            <Activity className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">Equipo</p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">esp32-01</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
