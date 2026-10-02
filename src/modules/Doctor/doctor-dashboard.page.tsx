import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "@/lib/axios";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Gauge, Thermometer, Users, Zap } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";

function stateMeta(state?: string) {
  const value = (state ?? "-").toUpperCase();
  switch (value) {
    case "INFLA":
    case "INFLATING":
      return { label: "Inflando", variant: "info" as const };
    case "MANTIENE":
    case "HOLDING":
      return { label: "Manteniendo", variant: "good" as const };
    case "DESINFLA":
    case "DEFLATING":
      return { label: "Liberando", variant: "warn" as const };
    case "LISTO":
    case "DONE":
    case "MENU":
      return { label: "En espera", variant: "neutral" as const };
    case "ERROR":
      return { label: "Error", variant: "bad" as const };
    default:
      return { label: value, variant: "neutral" as const };
  }
}

export function DoctorDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [live, setLive] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const [s, l] = await Promise.all([
        axios.get("/doctor/dashboard/summary"),
        axios.get("/doctor/dashboard/live"),
      ]);
      setSummary(s.data);
      setLive(l.data);
    };
    void load();
    const timer = setInterval(() => void load(), 2000);
    return () => clearInterval(timer);
  }, []);

  const history =
    live?.history?.map((item: any, idx: number) => ({
      idx,
      pressure: Number(item.pressureKpa ?? 0),
      temp: Number(item.temperatureC ?? 0),
    })) ?? [];
  const phase = stateMeta(live?.status?.state);

  const primaryPressure = live?.status?.pressureKpa ?? 0;
  const primaryForce = live?.status?.forceNewtons ?? 0;
  const primaryTemp = live?.status?.temperatureC ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Panel clinico</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          Monitor de tratamiento
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado en tiempo real del sistema de compresion neumática.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground">
              Estado sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge variant={phase.variant} label={phase.label} />
          </CardContent>
        </Card>
        <MetricCard
          label="Presion"
          value={Number(primaryPressure).toFixed(1)}
          unit="kPa"
          icon={<Gauge className="h-5 w-5" />}
          accentColor="primary"
        />
        <MetricCard
          label="Temperatura"
          value={Number(primaryTemp).toFixed(1)}
          unit="°C"
          icon={<Thermometer className="h-5 w-5" />}
          accentColor="accent"
        />
        <MetricCard
          label="Fuerza"
          value={Number(primaryForce).toFixed(1)}
          unit="N"
          icon={<Zap className="h-5 w-5" />}
          accentColor="secondary"
        />
        <MetricCard
          label="Pacientes"
          value={summary?.patientsCount ?? 0}
          icon={<Users className="h-5 w-5" />}
          accentColor="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">
              Presion en tiempo real
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="idx" hide />
                <YAxis
                  unit=" kPa"
                  width={55}
                  tick={{ fontSize: 11, fill: "#627184" }}
                  axisLine={{ stroke: "#dbe3ec" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #dbe3ec",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pressure"
                  stroke="#1673c8"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">
              Temperatura en tiempo real
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="idx" hide />
                <YAxis
                  unit=" °C"
                  width={55}
                  tick={{ fontSize: 11, fill: "#627184" }}
                  axisLine={{ stroke: "#dbe3ec" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #dbe3ec",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#14a37f"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">
              Ultimos pacientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary?.latestPatients?.map((p: any) => (
              <div
                key={p.id}
                className="rounded-lg border border-border/60 p-3 text-sm font-semibold"
              >
                {p.fullname ?? p.user?.fullname}
              </div>
            ))}
            {(!summary?.latestPatients || summary.latestPatients.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No hay pacientes registrados.
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Activity className="h-4 w-4 text-primary" />
              Tratamiento activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.activeTreatment ? (
              <div className="space-y-2">
                <p className="text-sm font-bold">
                  Paciente {summary.activeTreatment.patientName}
                </p>
                <div className="flex gap-2">
                  <StatusBadge
                    variant="info"
                    label={(summary.activeTreatment.intensity ?? "-").toUpperCase()}
                  />
                  <StatusBadge
                    variant="good"
                    label={`${summary.activeTreatment.durationSeconds}s`}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay tratamiento activo
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">
            Ultimos tratamientos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary?.latestTreatments?.map((t: any) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3 text-sm"
            >
              <div>
                <p className="font-bold">{t.patientName}</p>
                <p className="text-xs text-muted-foreground">
                  {(t.intensity ?? "-").toUpperCase()} · {t.status}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{new Date(t.startedAt).toLocaleString()}</p>
                <p className="font-mono font-bold tabular-nums">
                  {t.durationSeconds}s
                </p>
              </div>
            </div>
          ))}
          {(!summary?.latestTreatments || summary.latestTreatments.length === 0) && (
            <p className="text-sm text-muted-foreground">
              No hay tratamientos registrados.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
