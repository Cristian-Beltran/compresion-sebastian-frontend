import { useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Fan,
  Gauge,
  Radio,
  ShieldCheck,
  Thermometer,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  DeviceStatus,
  DeviceTelemetry,
  GroupTelemetry,
  SystemLog,
} from "./admin.types";
import { useMqttStatus, useMqttSubscribe, MQTT_TOPICS } from "@/lib/mqtt";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { GroupOrb } from "@/components/ui/group-orb";

type Overview = {
  status: DeviceStatus;
  telemetry: DeviceTelemetry | null;
  history: DeviceTelemetry[];
  recentEvents: SystemLog[];
};

const chartColors = ["#1673c8", "#14a37f", "#f59e0b", "#8b5cf6"];

const stateLabel = (value?: string) =>
  ({
    MENU: "Menu",
    INFLA: "Inflando",
    MANTIENE: "Manteniendo",
    DESINFLA: "Liberando",
    LISTO: "Listo",
    ERROR: "Error",
    MANTENIMIENTO: "Mantenimiento",
    READY: "Listo",
    INFLATING: "Inflando",
    HOLDING: "Manteniendo",
    DEFLATING: "Liberando",
    DONE: "Completado",
    DISABLED: "Deshabilitado",
  })[value ?? ""] ?? value ?? "Sin datos";

export function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [metric, setMetric] = useState<"pressure" | "force">("pressure");
  const [loadError, setLoadError] = useState(false);
  const mqttOnline = useMqttStatus();
  const mqttTelemetry = useMqttSubscribe<DeviceTelemetry>(MQTT_TOPICS.telemetry);
  const mqttStatus = useMqttSubscribe<Record<string, unknown>>(MQTT_TOPICS.status);
  const [telemetryHistory, setTelemetryHistory] = useState<DeviceTelemetry[]>([]);

  useEffect(() => {
    if (!mqttTelemetry) return;
    setTelemetryHistory((prev) => {
      const next = [...prev, mqttTelemetry];
      return next.length > 300 ? next.slice(-300) : next;
    });
  }, [mqttTelemetry]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [overviewRes, logsRes] = await Promise.all([
          axios.get<Overview>("/device/admin-overview"),
          axios.get<SystemLog[]>("/logs?limit=8"),
        ]);
        if (mounted) {
          setOverview({ ...overviewRes.data, recentEvents: logsRes.data });
          setLoadError(false);
        }
      } catch {
        if (mounted) setLoadError(true);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!mqttStatus) return;
    setOverview((prev) => prev ? {
      ...prev,
      status: {
        ...prev.status,
        online: Boolean(mqttStatus.online),
        connected: Boolean(mqttStatus.connected),
        brokerConnected: mqttOnline,
        state: String(mqttStatus.state ?? prev.status.state),
        treatmentRunning: Boolean(mqttStatus.treatmentRunning),
        maintenanceMode: Boolean(mqttStatus.maintenanceMode ?? prev.status.maintenanceMode),
        activeMask: Number(mqttStatus.activeMask ?? prev.status.activeMask),
        treatmentId: String(mqttStatus.treatmentId ?? prev.status.treatmentId ?? ""),
        wifiRssi: Number(mqttStatus.wifiRssi ?? prev.status.wifiRssi),
        calibrationVersion: Number(mqttStatus.calibrationVersion ?? prev.status.calibrationVersion),
        lastSeenAt: new Date().toISOString(),
      },
    } : prev);
  }, [mqttStatus, mqttOnline]);

  const status = overview?.status;
  const groups = Array.from({ length: 4 }, (_, index) =>
    status?.groups?.find((group) => group.groupId === index + 1),
  );
  const chartData = useMemo(
    () =>
      telemetryHistory.slice(-80).map((sample, index) => {
        const row: Record<string, number | string> = {
          index,
          time:
            typeof sample.timestamp === "string"
              ? new Date(sample.timestamp).toLocaleTimeString()
              : String(index),
        };
        sample.groups?.forEach((group) => {
          row[`g${group.groupId}`] = Number(
            metric === "pressure" ? group.pressureKpa : group.forceNewtons,
          );
        });
        return row;
      }),
    [metric, telemetryHistory],
  );

  const primaryGroup = groups.find((g) => g?.enabled) ?? groups[0];
  const primaryPressure = primaryGroup?.pressureKpa ?? 0;
  const primaryForce = primaryGroup?.forceNewtons ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-primary">Operacion en tiempo real</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            Centro tecnico Sebastian
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuatro circuitos neumaticos, sensores y estado termico del equipo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            variant={mqttOnline ? "good" : "bad"}
            label={mqttOnline ? "MQTT activo" : "MQTT offline"}
          />
          <StatusBadge
            variant={status?.brokerConnected ? "good" : "bad"}
            label={status?.brokerConnected ? "Broker activo" : "Broker offline"}
          />
          <StatusBadge
            variant={status?.online ? "good" : "bad"}
            label={status?.online ? "ESP32 online" : "ESP32 offline"}
          />
          {status?.maintenanceMode && (
            <StatusBadge variant="warn" label="Mantenimiento" />
          )}
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          No fue posible actualizar la telemetria. Se muestran los ultimos datos disponibles.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Presion principal"
          value={primaryPressure.toFixed(1)}
          unit="kPa"
          icon={<Gauge className="h-5 w-5" />}
          accentColor="primary"
        />
        <MetricCard
          label="Fuerza"
          value={primaryForce.toFixed(1)}
          unit="N"
          icon={<Activity className="h-5 w-5" />}
          accentColor="secondary"
        />
        <MetricCard
          label="Temperatura"
          value={status?.temperatureC != null ? Number(status.temperatureC).toFixed(1) : "--"}
          unit="°C"
          icon={<Thermometer className="h-5 w-5" />}
          accentColor="accent"
        />
        <MetricCard
          label="Ventilador"
          value={Number(status?.fanPowerPercent ?? 0).toFixed(0)}
          unit="%"
          icon={<Fan className="h-5 w-5" />}
          accentColor="primary"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {groups.map((group, index) => (
          <GroupCard key={index} groupId={index + 1} group={group} online={Boolean(status?.online)} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base font-bold">
                Senales de los cuatro grupos
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Ultimas 80 muestras recibidas
              </p>
            </div>
            <div className="flex rounded-lg border border-border/60 bg-muted/40 p-1 text-xs">
              <button
                className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${
                  metric === "pressure"
                    ? "bg-card shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMetric("pressure")}
              >
                Presion
              </button>
              <button
                className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${
                  metric === "force"
                    ? "bg-card shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMetric("force")}
              >
                Fuerza
              </button>
            </div>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="index" hide />
                <YAxis
                  unit={metric === "pressure" ? " kPa" : " N"}
                  width={55}
                  tick={{ fontSize: 11, fill: "#627184" }}
                  axisLine={{ stroke: "#dbe3ec" }}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => `Muestra ${value}`}
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #dbe3ec",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
                {[1, 2, 3, 4].map((groupId) => (
                  <Line
                    key={groupId}
                    type="monotone"
                    name={`Grupo ${groupId}`}
                    dataKey={`g${groupId}`}
                    stroke={chartColors[groupId - 1]}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Thermometer className="h-4 w-4 text-amber-500" />
                Sistema termico
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Metric label="Sensor 1" value={formatTemperature(status?.temperature1C)} />
              <Metric label="Sensor 2" value={formatTemperature(status?.temperature2C)} />
              <Metric label="Promedio" value={formatTemperature(status?.temperatureC)} />
              <Metric
                label="Ventilador"
                value={`${Number(status?.fanPowerPercent ?? 0).toFixed(0)} %`}
                icon={<Fan className="h-4 w-4" />}
              />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <ShieldCheck className="h-4 w-4 text-accent" />
                Estado operativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StatusRow label="Estado" value={stateLabel(status?.state)} />
              <StatusRow
                label="Sesion"
                value={status?.treatmentRunning ? "En ejecucion" : "Sin sesion activa"}
              />
              <StatusRow
                label="WiFi"
                value={status?.wifiRssi ? `${status.wifiRssi} dBm` : "Sin dato"}
              />
              <StatusRow
                label="Calibracion"
                value={`Version ${status?.calibrationVersion ?? 0}`}
              />
              <StatusRow
                label="Ultimo dato"
                value={
                  status?.lastSeenAt
                    ? new Date(status.lastSeenAt).toLocaleTimeString()
                    : "Nunca"
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Activity className="h-4 w-4" />
            Actividad reciente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {(overview?.recentEvents ?? []).map((event) => (
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
                  {event.category ?? event.source} ·{" "}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {!overview?.recentEvents?.length && (
            <p className="text-sm text-muted-foreground">
              Todavia no hay eventos registrados.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GroupCard({
  groupId,
  group,
  online,
}: {
  groupId: number;
  group?: GroupTelemetry;
  online: boolean;
}) {
  const health = online && Boolean(group?.pressureSensorAvailable);
  const progress = group?.cycleTarget
    ? Math.min(100, (group.cycleIndex / group.cycleTarget) * 100)
    : 0;

  const borderColors = ["#1673c8", "#14a37f", "#f59e0b", "#8b5cf6"];

  return (
    <Card
      className="relative overflow-hidden border-border/60"
      style={{ borderTopWidth: "3px", borderTopColor: borderColors[groupId - 1] }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">Grupo {groupId}</CardTitle>
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              health ? "bg-accent" : "bg-destructive"
            }`}
          />
        </div>
        <p className="text-xs font-semibold text-muted-foreground">
          {stateLabel(group?.state)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <GroupOrb
            pressure={group?.pressureKpa ?? 0}
            targetPressure={group?.targetPressureKpa ?? 0}
            state={group?.state ?? ""}
            size="md"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Fuerza"
            value={`${Number(group?.forceNewtons ?? 0).toFixed(2)} N`}
          />
          <Metric
            label="Ciclos"
            value={`${group?.cycleIndex ?? 0}/${group?.cycleTarget ?? 0}`}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Obj {Number(group?.targetPressureKpa ?? 0).toFixed(1)} kPa</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <div className="flex gap-2 text-[11px]">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${
              group?.pumpOn
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Bomba {group?.pumpOn ? "ON" : "OFF"}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${
              group?.valveClosed
                ? "bg-secondary/10 text-secondary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Valvula {group?.valveClosed ? "cerrada" : "abierta"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-bold tabular-nums">{value}</p>
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

function formatTemperature(value?: number | null) {
  return value == null || value < -100 ? "Sin dato" : `${Number(value).toFixed(1)} °C`;
}
