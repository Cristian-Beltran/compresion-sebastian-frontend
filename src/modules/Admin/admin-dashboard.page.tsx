import { useEffect, useState, type ReactNode } from "react";
import axios from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  BarChart3,
  Heart,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";

export function AdminDashboardPage() {
  const [usersCount, setUsersCount] = useState(0);
  const [patientsCount, setPatientsCount] = useState(0);
  const [treatmentsCount, setTreatmentsCount] = useState(0);
  const [deviceOnline, setDeviceOnline] = useState(false);
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: string;
    message: string;
    category?: string;
    createdAt: string;
    level: string;
  }>>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [usersRes, patientsRes, treatmentsRes, deviceRes, logsRes] = await Promise.all([
          axios.get("/admin/users"),
          axios.get("/doctor/patients"),
          axios.get("/doctor/treatments/history"),
          axios.get("/device/status"),
          axios.get("/logs?limit=10"),
        ]);
        if (mounted) {
          setUsersCount(Array.isArray(usersRes.data) ? usersRes.data.length : 0);
          setPatientsCount(Array.isArray(patientsRes.data) ? patientsRes.data.length : 0);
          setTreatmentsCount(Array.isArray(treatmentsRes.data) ? treatmentsRes.data.length : 0);
          setDeviceOnline(Boolean(deviceRes.data.online));
          setRecentActivities(Array.isArray(logsRes.data) ? logsRes.data : []);
        }
      } catch {}
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  const weeklyData = [
    { day: "Lun", treatments: 12, completed: 10 },
    { day: "Mar", treatments: 18, completed: 15 },
    { day: "Mié", treatments: 14, completed: 12 },
    { day: "Jue", treatments: 22, completed: 19 },
    { day: "Vie", treatments: 16, completed: 14 },
    { day: "Sáb", treatments: 8, completed: 7 },
    { day: "Dom", treatments: 5, completed: 4 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-primary">Gestión de plataforma</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            Panel administrativo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Indicadores globales de usuarios, actividad y disponibilidad.
          </p>
        </div>
        <StatusBadge
          variant={deviceOnline ? "good" : "bad"}
          label={deviceOnline ? "Dispositivo conectado" : "Sin conexión"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Usuarios activos"
          value={String(usersCount)}
          unit=""
          icon={<Users className="h-5 w-5" />}
          accentColor="primary"
        />
        <MetricCard
          label="Pacientes registrados"
          value={String(patientsCount)}
          unit=""
          icon={<Heart className="h-5 w-5" />}
          accentColor="secondary"
        />
        <MetricCard
          label="Tratamientos realizados"
          value={String(treatmentsCount)}
          unit=""
          icon={<BarChart3 className="h-5 w-5" />}
          accentColor="accent"
        />
        <MetricCard
          label="Dispositivo"
          value={deviceOnline ? "1 de 1" : "0 de 1"}
          unit=""
          icon={<ShieldCheck className="h-5 w-5" />}
          accentColor="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">
              Tratamientos por día
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Actividad de la última semana
            </p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #dbe3ec",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="treatments" fill="#1673c8" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="completed" fill="#14a37f" radius={[4, 4, 0, 0]} name="Completados" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">
              Resumen operativo
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Estado de la plataforma
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusRow label="Alertas recientes" value="3" />
            <StatusRow label="Accesos hoy" value="14" />
            <StatusRow label="Sesiones clínicas" value={String(treatmentsCount)} />
            <StatusRow label="Actividad técnica" value="5" />
            <StatusRow label="Disponibilidad" value="99.8%" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Activity className="h-4 w-4" />
            Últimas actividades del sistema
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Acciones relevantes de todos los perfiles
          </p>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {recentActivities.map((event) => (
            <div
              key={event.id}
              className="flex gap-3 rounded-xl border border-border/60 bg-card p-3"
            >
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  event.level === "error"
                    ? "bg-destructive"
                    : event.level === "warn"
                      ? "bg-amber-500"
                      : "bg-accent"
                }`}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{event.message}</p>
                <p className="text-xs text-muted-foreground">
                  {event.category ?? "sistema"} ·{" "}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {!recentActivities.length && (
            <p className="text-sm text-muted-foreground">
              Todavía no hay eventos registrados.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
