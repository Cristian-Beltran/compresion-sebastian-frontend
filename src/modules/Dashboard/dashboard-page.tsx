// src/app/dashboard/DashboardPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Activity,
  AlertTriangle,
  Gauge,
  Thermometer,
  RefreshCw,
  Cpu,
  Clock,
} from "lucide-react";

import { useAuthStore } from "@/auth/useAuth";
import { sessionService } from "@/modules/Session/data/session.service";
import type { Session, SessionData } from "@/modules/Session/session.interface";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// ===== Helpers comunes =====
function formatRelative(dateISO?: string) {
  if (!dateISO) return "Sin lecturas";
  const diffMs = Date.now() - new Date(dateISO).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Hace segundos";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} d`;
}

function latestRecordOfSession(s: Session): SessionData | undefined {
  return (s.records ?? []).reduce<SessionData | undefined>(
    (acc, r) =>
      !acc || new Date(r.recordedAt) > new Date(acc.recordedAt) ? r : acc,
    undefined,
  );
}

function latestGlobal(sessions: Session[]) {
  let rec: SessionData | undefined;
  let ses: Session | undefined;
  for (const s of sessions) {
    for (const r of s.records ?? []) {
      if (!rec || new Date(r.recordedAt) > new Date(rec.recordedAt)) {
        rec = r;
        ses = s;
      }
    }
  }
  return { rec, ses };
}

function countTodaySessions(sessions: Session[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return sessions.filter((s) => {
    const d = new Date(s.startedAt);
    return d >= start && d <= end;
  }).length;
}

function countActiveSessions(sessions: Session[]) {
  return sessions.filter((s) => !s.endedAt).length;
}

function distinctPatientCount(sessions: Session[]) {
  const set = new Set<string>();
  sessions.forEach((s) => s.patient?.id && set.add(s.patient.id));
  return set.size;
}

function safeNum(n: unknown) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function pct(now: number | null, min: number, max: number) {
  if (now == null || max <= min) return 0;
  return Math.max(0, Math.min(100, ((now - min) / (max - min)) * 100));
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionService.findAll();
      setSessions(data ?? []);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las sesiones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Derivados
  const { rec: latestRecord, ses: latestSession } = useMemo(
    () => latestGlobal(sessions),
    [sessions],
  );

  const lastUpdate = useMemo(
    () => formatRelative(latestRecord?.recordedAt),
    [latestRecord],
  );

  const latestPatientName = latestSession?.patient
    ? `${latestSession.patient.firstName ?? ""} ${
        latestSession.patient.lastName ?? ""
      }`.trim() || latestSession.patient.id
    : "Paciente";

  const patientsCount = useMemo(
    () => distinctPatientCount(sessions),
    [sessions],
  );
  const todayCount = useMemo(() => countTodaySessions(sessions), [sessions]);
  const activeCount = useMemo(() => countActiveSessions(sessions), [sessions]);

  // Para ahora, marcamos críticas en 0 (puedes enchufar reglas luego)
  const criticalCount = 0;

  // Mapa de pacientes recientes (por última lectura)
  const recentPatients = useMemo(() => {
    const map = new Map<string, { name: string; lastISO: string }>();
    sessions.forEach((s) => {
      const r = latestRecordOfSession(s);
      if (!r || !s.patient?.id) return;
      const name = s.patient.firstName
        ? `${s.patient.firstName} ${s.patient.lastName ?? ""}`.trim()
        : s.patient.id;
      const cur = map.get(s.patient.id);
      if (!cur || new Date(r.recordedAt) > new Date(cur.lastISO)) {
        map.set(s.patient.id, { name, lastISO: r.recordedAt });
      }
    });
    return Array.from(map.values())
      .sort(
        (a, b) => new Date(b.lastISO).getTime() - new Date(a.lastISO).getTime(),
      )
      .slice(0, 5)
      .map((p) => ({ name: p.name, last: formatRelative(p.lastISO) }));
  }, [sessions]);

  // Valores de la última lectura (nuevo modelo)
  const vPressure = safeNum(latestRecord?.measuredPressure);
  const vTemp = safeNum(latestRecord?.temperature);
  const vTarget = safeNum(latestSession?.targetPressure);

  const rPressure = {
    min: 0,
    max: Math.max(
      10,
      (vTarget ?? 0) > 0 ? (vTarget as number) * 1.4 : (vPressure ?? 40) * 1.4,
    ),
  };
  const rTemp = { min: 20, max: 45 }; // banda de referencia para temperatura

  const pressureProgress = pct(vPressure, rPressure.min, rPressure.max);
  const tempProgress = pct(vTemp, rTemp.min, rTemp.max);
  const toTargetProgress =
    vPressure != null && vTarget != null ? pct(vPressure, 0, vTarget) : 0;

  // KPIs
  const kpis = [
    {
      label: "Pacientes",
      value: patientsCount,
      icon: Users,
      badgeVariant: "outline" as const,
    },
    {
      label: "Sesiones hoy",
      value: todayCount,
      icon: Activity,
      badgeVariant: "secondary" as const,
    },
    {
      label: "Sesiones activas",
      value: activeCount,
      icon: Cpu,
      badgeVariant: "default" as const,
    },
    {
      label: "Críticas",
      value: criticalCount,
      icon: AlertTriangle,
      badgeVariant: "destructive" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-2xl font-semibold tracking-tight">
            Tablero de compresión
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Visibilidad ejecutiva del uso de la banda, sesiones y condiciones
            térmicas.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          title="Recargar"
          className="shrink-0"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {loading ? "Actualizando..." : "Recargar"}
        </Button>
      </div>

      {/* Bienvenida / usuario */}
      <div className="text-xs text-muted-foreground">
        Operador:{" "}
        <span className="font-medium">
          {user?.fullname ?? "Usuario del sistema"}
        </span>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-destructive">
              Error al cargar datos
            </CardTitle>
            <CardDescription className="text-xs">{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* KPIs, con look distinto */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card
            key={k.label}
            className="border-dashed bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-muted-foreground">
                  {k.label}
                </div>
                <div className="text-xl font-semibold">{k.value}</div>
              </div>
              <Badge variant={k.badgeVariant} className="gap-1">
                <k.icon className="h-4 w-4" />
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Layout principal dividido */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(280px,1fr)] items-start">
        {/* Columna izquierda: última sesión y mapa térmico */}
        <div className="space-y-4">
          {/* Última lectura / sesión */}
          <Card className="bg-card/70 backdrop-blur border-dotted">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Última lectura registrada
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {latestSession ? (
                      <>
                        Paciente{" "}
                        <span className="font-medium">{latestPatientName}</span>{" "}
                        · {lastUpdate}
                      </>
                    ) : (
                      "Aún no se han registrado lecturas en el sistema."
                    )}
                  </CardDescription>
                </div>
                {latestSession && (
                  <Badge
                    variant={latestSession.endedAt ? "outline" : "default"}
                    className="text-[10px]"
                  >
                    {latestSession.endedAt ? "Sesión cerrada" : "Sesión activa"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <VitalTile
                  title="Presión medida"
                  value={vPressure}
                  unit="kPa"
                  icon={<Gauge className="h-4 w-4" />}
                  progress={pressureProgress}
                  hint={
                    rPressure.max
                      ? `0 – ${rPressure.max.toFixed(1)}`
                      : undefined
                  }
                />
                <VitalTile
                  title="Temperatura"
                  value={vTemp}
                  unit="°C"
                  icon={<Thermometer className="h-4 w-4" />}
                  progress={tempProgress}
                  hint={`${rTemp.min} – ${rTemp.max}°C`}
                />
                <VitalTile
                  title="Presión objetivo"
                  value={vTarget}
                  unit="kPa"
                  icon={<Activity className="h-4 w-4" />}
                  progress={toTargetProgress}
                  hint={
                    vTarget != null && vPressure != null
                      ? `${vPressure.toFixed(1)} / ${vTarget.toFixed(1)} kPa`
                      : undefined
                  }
                />
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-2 text-xs text-muted-foreground">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Metadata de sesión</span>
                  </div>
                  {latestSession ? (
                    <>
                      <p>
                        Inicio:{" "}
                        {new Date(latestSession.startedAt).toLocaleString(
                          "es-ES",
                        )}
                      </p>
                      {latestSession.endedAt && (
                        <p>
                          Cierre:{" "}
                          {new Date(latestSession.endedAt).toLocaleString(
                            "es-ES",
                          )}
                        </p>
                      )}
                      <p>
                        Lecturas:{" "}
                        <span className="font-medium">
                          {latestSession.records?.length ?? 0}
                        </span>
                      </p>
                    </>
                  ) : (
                    <p>No hay sesión asociada a la última lectura.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    <span>Comportamiento reciente</span>
                  </div>
                  <p>
                    Intervalo de muestreo teórico:{" "}
                    <span className="font-medium">1s</span> (según módulo).
                  </p>
                  <p>
                    La banda ejecuta inflado, mantenimiento y desinflado en
                    ciclos hasta cierre de sesión.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sesiones recientes (resumen comprimido) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Sesiones recientes
              </CardTitle>
              <CardDescription className="text-xs">
                Últimas 6 sesiones registradas en el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sessions
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.startedAt).getTime() -
                    new Date(a.startedAt).getTime(),
                )
                .slice(0, 6)
                .map((s) => {
                  const name = s.patient?.firstName
                    ? `${s.patient.firstName} ${
                        s.patient.lastName ?? ""
                      }`.trim()
                    : (s.patient?.id ?? "Paciente");
                  const avgPressure = safeNum(
                    s.records && s.records.length
                      ? s.records.reduce(
                          (acc, x) => acc + (x.measuredPressure ?? 0),
                          0,
                        ) / s.records.length
                      : null,
                  );
                  return (
                    <Card key={s.id} className="border-muted/70 bg-muted/30">
                      <CardContent className="py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold truncate max-w-[70%]">
                            {name}
                          </div>
                          <Badge
                            variant={s.endedAt ? "outline" : "default"}
                            className="text-[10px]"
                          >
                            {s.endedAt ? "Cerrada" : "Activa"}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(s.startedAt).toLocaleString("es-ES")}
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <MiniMetric
                            label="Target"
                            value={safeNum(s.targetPressure)}
                            unit="kPa"
                          />
                          <MiniMetric
                            label="Promedio"
                            value={avgPressure}
                            unit="kPa"
                          />
                          <MiniMetric
                            label="Muestras"
                            value={s.records?.length ?? 0}
                            unit=""
                          />
                          <MiniMetric
                            label="Ciclos"
                            value={
                              s.records?.reduce<number>(
                                (acc, x) =>
                                  x.cycleIndex != null && x.cycleIndex > acc
                                    ? x.cycleIndex
                                    : acc,
                                0,
                              ) ?? 0
                            }
                            unit=""
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              {sessions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No existen sesiones registradas en el sistema.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: pacientes recientes / estado global */}
        <div className="space-y-4">
          {/* Pacientes recientes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Pacientes recientes
              </CardTitle>
              <CardDescription className="text-xs">
                Últimos pacientes con lectura registrada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentPatients.length ? (
                recentPatients.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium truncate max-w-[180px]">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.last}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Monitoreado
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  Todavía no se han monitorizado pacientes.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Estado del sistema */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Estado del sistema
              </CardTitle>
              <CardDescription className="text-xs">
                Indicadores de carga y estabilidad operacional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <SystemRow
                label="Cobertura de pacientes monitorizados"
                value={`${patientsCount} paciente(s)`}
                progress={
                  patientsCount === 0 ? 0 : Math.min(100, patientsCount * 10)
                }
              />
              <SystemRow
                label="Sesiones activas versus totales"
                value={`${activeCount}/${sessions.length}`}
                progress={
                  sessions.length === 0
                    ? 0
                    : Math.min(100, (activeCount / sessions.length) * 100)
                }
              />
              <SystemRow
                label="Sesiones con incidentes críticos"
                value={`${criticalCount}`}
                progress={criticalCount > 0 ? 100 : 0}
                danger={criticalCount > 0}
              />
              <Separator />
              <div className="text-[11px] text-muted-foreground">
                Este tablero consolida información histórica básica. El detalle
                clínico y analítico se consume desde los módulos de sesiones y
                monitoreo en tiempo real.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ===== UI auxiliares =====
function VitalTile({
  title,
  value,
  unit,
  icon,
  progress,
  hint,
}: {
  title: string;
  value: number | null;
  unit: string;
  icon: React.ReactNode;
  progress: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium">{title}</span>
        </div>
        <Badge variant="outline" className="font-mono text-[11px]">
          {value == null ? "—" : `${value.toFixed(1)} ${unit}`}
        </Badge>
      </div>
      <Progress value={progress} className="h-1.5" />
      {hint && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          Rango de referencia: {hint}
        </div>
      )}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-2 py-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[12px]">
        {value == null ? "—" : `${value.toFixed(1)}${unit}`}
      </span>
    </div>
  );
}

function SystemRow({
  label,
  value,
  progress,
  danger,
}: {
  label: string;
  value: string;
  progress: number;
  danger?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-medium">{value}</span>
      </div>
      <Progress
        value={progress}
        className="h-1.5"
        // no custom colors, solo el default del tema
      />
      {danger && (
        <div className="text-[10px] text-destructive">
          Revisar sesiones marcadas como críticas.
        </div>
      )}
    </div>
  );
}
