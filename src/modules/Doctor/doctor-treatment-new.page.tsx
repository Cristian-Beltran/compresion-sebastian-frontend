import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "@/lib/axios";
import { toast } from "sonner";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PatientRow = { id: string; fullname: string; status: string };
type Intensity = "low" | "medium" | "high";
type TreatmentMode = "preset" | "custom";
type TreatmentZone = "pantorrilla_izquierda" | "pantorrilla_derecha";
type MobilityLevel = "independiente" | "movilidad_reducida" | "inmovil";
type LiveReading = {
  state?: string;
  pressureKpa?: number | string | null;
  targetPressureKpa?: number | string | null;
  forceNewtons?: number | string | null;
  temperatureC?: number | string | null;
  cycleIndex?: number | string | null;
  pumpOn?: boolean;
  valveClosed?: boolean;
  holdRemainingMs?: number | string | null;
  configuredHoldTimeMs?: number | string | null;
  configuredReleaseTimeMs?: number | string | null;
  configuredCycleTarget?: number | string | null;
  lastAck?: {
    command?: string;
    result?: string;
  } | null;
};

const INTENSITIES: Array<{ key: Intensity; title: string; desc: string }> = [
  { key: "low", title: "Baja intensidad", desc: "Compresion suave y continua" },
  { key: "medium", title: "Media intensidad", desc: "Balance clinico estandar" },
  { key: "high", title: "Alta intensidad", desc: "Compresion avanzada" },
];

function stateMeta(state?: string) {
  const value = (state ?? "-").toUpperCase();
  switch (value) {
    case "INFLA":
      return { label: "Inflando", className: "bg-cyan-500/15 text-cyan-400" };
    case "MANTIENE":
      return { label: "Manteniendo", className: "bg-emerald-500/15 text-emerald-400" };
    case "DESINFLA":
      return { label: "Desinflando", className: "bg-amber-500/15 text-amber-400" };
    case "LISTO":
      return { label: "Listo", className: "bg-emerald-500/15 text-emerald-400" };
    case "ERROR":
      return { label: "Error", className: "bg-red-500/15 text-red-400" };
    case "MENU":
      return { label: "En espera", className: "bg-zinc-500/15 text-zinc-300" };
    default:
      return { label: value, className: "bg-zinc-500/15 text-zinc-300" };
  }
}

function asNumber(value: unknown, fallback = 0) {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function DoctorTreatmentNewPage() {
  const [patientId, setPatientId] = useState("");
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [mode, setMode] = useState<TreatmentMode>("preset");
  const [treatmentZone, setTreatmentZone] = useState<TreatmentZone | "">("");
  const [mobilityLevel, setMobilityLevel] = useState<MobilityLevel | "">("");
  const [customConfig, setCustomConfig] = useState({
    targetPressureKpa: 5,
    holdTimeSeconds: 10,
    releaseTimeSeconds: 5,
    cycleTarget: 25,
  });
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [live, setLive] = useState<any>(null);
  const [activeTreatment, setActiveTreatment] = useState<any>(null);

  const load = async () => {
    const [patientsRes, liveRes] = await Promise.all([
      axios.get("/doctor/patients"),
      axios.get("/doctor/dashboard/live"),
    ]);
    setPatients(patientsRes.data);
    setLive(liveRes.data);
    setActiveTreatment(liveRes.data?.activeTreatment ?? null);
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 2000);
    return () => clearInterval(timer);
  }, []);

  const currentPatientName = useMemo(() => {
    const row = patients.find((p) => p.id === activeTreatment?.patientId);
    return row?.fullname ?? activeTreatment?.patientName ?? activeTreatment?.patientId ?? "-";
  }, [patients, activeTreatment]);

  const telemetryHistory = Array.isArray(live?.history) ? live.history : [];
  const latestTelemetry = (telemetryHistory[telemetryHistory.length - 1] ??
    live?.telemetry ??
    null) as LiveReading | null;
  const liveStatus = (live?.status ?? null) as LiveReading | null;
  const monitorStatus: LiveReading = {
    ...(liveStatus ?? {}),
    ...(latestTelemetry ?? {}),
    state: latestTelemetry?.state ?? liveStatus?.state,
    lastAck: liveStatus?.lastAck ?? null,
  };
  const history =
    telemetryHistory.map((item: any, idx: number) => ({
      idx,
      pressure: asNumber(item.pressureKpa),
      temp: asNumber(item.temperatureC),
    }));
  const phase = stateMeta(monitorStatus.state);
  const holdSeconds = Math.max(0, Math.floor(asNumber(monitorStatus.holdRemainingMs) / 1000));
  const configuredHoldSeconds = Math.floor(asNumber(monitorStatus.configuredHoldTimeMs) / 1000);
  const configuredReleaseSeconds = Math.floor(
    asNumber(monitorStatus.configuredReleaseTimeMs) / 1000,
  );

  const start = async () => {
    if (!patientId || !treatmentZone || !mobilityLevel) {
      toast.error("Selecciona paciente, zona y movilidad");
      return;
    }
    if (mode === "preset" && !intensity) {
      toast.error("Selecciona una intensidad");
      return;
    }
    try {
      await axios.post("/doctor/treatments/start", {
        patientId,
        treatmentZone,
        mobilityLevel,
        intensity: mode === "custom" ? "custom" : intensity,
        ...(mode === "custom" ? customConfig : {}),
      });
      toast.success("Tratamiento iniciado");
      await load();
    } catch {
      toast.error("No se pudo iniciar el tratamiento");
    }
  };

  const stop = async () => {
    if (!activeTreatment) return;
    try {
      await axios.post(`/doctor/treatments/${activeTreatment.id}/stop`);
      toast.success("Tratamiento detenido");
      await load();
    } catch {
      toast.error("No se pudo detener");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Sistema de tratamiento</h2>

      <Card className="border-cyan-300/20 bg-gradient-to-br from-card to-card/70">
        <CardHeader><CardTitle>Seleccion del protocolo</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(value) => setMode(value as TreatmentMode)}>
            <TabsList className="grid h-14 w-full grid-cols-2 rounded-md">
              <TabsTrigger value="preset" className="text-base">
                Terapia predefinida
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-base">
                Terapia custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preset" className="mt-4 grid gap-3 md:grid-cols-3">
              {INTENSITIES.map((item) => (
                <button
                  key={item.key}
                  className={
                    "rounded-md border p-5 text-left transition-all " +
                    (intensity === item.key
                      ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(0,212,255,0.15)]"
                      : "border-border hover:border-cyan-500/40")
                  }
                  onClick={() => setIntensity(item.key)}
                  disabled={!!activeTreatment}
                >
                  <p className="text-lg font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </button>
              ))}
            </TabsContent>

            <TabsContent value="custom" className="mt-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  {
                    key: "targetPressureKpa",
                    label: "Presion objetivo",
                    min: 1,
                    max: 12,
                    step: 0.5,
                    unit: "kPa",
                  },
                  {
                    key: "holdTimeSeconds",
                    label: "Tiempo de mantenimiento",
                    min: 1,
                    max: 60,
                    step: 1,
                    unit: "s",
                  },
                  {
                    key: "releaseTimeSeconds",
                    label: "Tiempo de liberacion",
                    min: 1,
                    max: 60,
                    step: 1,
                    unit: "s",
                  },
                  {
                    key: "cycleTarget",
                    label: "Ciclos",
                    min: 1,
                    max: 80,
                    step: 1,
                    unit: "",
                  },
                ].map((item) => {
                  const key = item.key as keyof typeof customConfig;
                  return (
                    <div key={item.key} className="rounded-md border p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="font-mono text-sm text-cyan-500">
                          {customConfig[key]} {item.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={item.min}
                        max={item.max}
                        step={item.step}
                        value={customConfig[key]}
                        onChange={(event) =>
                          setCustomConfig((current) => ({
                            ...current,
                            [key]: Number(event.target.value),
                          }))
                        }
                        disabled={!!activeTreatment}
                        className="w-full accent-cyan-500"
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Paciente y accion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select
              className="h-11 w-full rounded-md border bg-background px-3"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={!!activeTreatment}
            >
              <option value="">Selecciona paciente</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullname} - {patient.id}
                </option>
              ))}
            </select>

            <select
              className="h-11 w-full rounded-md border bg-background px-3"
              value={treatmentZone}
              onChange={(e) => setTreatmentZone(e.target.value as TreatmentZone | "")}
              disabled={!!activeTreatment}
            >
              <option value="">Selecciona zona del tratamiento</option>
              <option value="pantorrilla_izquierda">Pantorrilla izquierda</option>
              <option value="pantorrilla_derecha">Pantorrilla derecha</option>
            </select>

            <select
              className="h-11 w-full rounded-md border bg-background px-3"
              value={mobilityLevel}
              onChange={(e) => setMobilityLevel(e.target.value as MobilityLevel | "")}
              disabled={!!activeTreatment}
            >
              <option value="">Selecciona movilidad</option>
              <option value="independiente">Independiente</option>
              <option value="movilidad_reducida">Movilidad reducida</option>
              <option value="inmovil">Inmovil</option>
            </select>

            {!activeTreatment && (
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={() => void start()}>
                Comenzar tratamiento
              </Button>
            )}
            {activeTreatment && (
              <Button className="w-full" variant="destructive" onClick={() => void stop()}>
                Parar tratamiento activo
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Monitor en tiempo real</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>Paciente activo</span><span>{currentPatientName}</span></div>
            <div className="flex items-center justify-between"><span>Tipo</span><span className="uppercase">{activeTreatment?.intensity ?? "-"}</span></div>
            <div className="flex items-center justify-between"><span>Zona</span><span>{activeTreatment?.treatmentZone?.replaceAll("_", " ") ?? "-"}</span></div>
            <div className="flex items-center justify-between"><span>Movilidad</span><span>{activeTreatment?.mobilityLevel?.replaceAll("_", " ") ?? "-"}</span></div>
            <div className="flex items-center justify-between"><span>Estado</span><span className={`rounded-full px-2 py-1 text-xs ${phase.className}`}>{phase.label}</span></div>
            <div className="flex items-center justify-between"><span>Presion</span><span>{asNumber(monitorStatus.pressureKpa).toFixed(2)} kPa</span></div>
            <div className="flex items-center justify-between"><span>Temperatura</span><span>{asNumber(monitorStatus.temperatureC).toFixed(1)} C</span></div>
            <div className="flex items-center justify-between"><span>Fuerza</span><span>{asNumber(monitorStatus.forceNewtons).toFixed(2)} N</span></div>
            <div className="flex items-center justify-between"><span>Ciclos realizados</span><span>{asNumber(monitorStatus.cycleIndex ?? activeTreatment?.cycleCount)}</span></div>
            <div className="flex items-center justify-between"><span>Config hold/release</span><span>{configuredHoldSeconds}s / {configuredReleaseSeconds}s</span></div>
            <div className="flex items-center justify-between"><span>Config ciclos</span><span>{asNumber(monitorStatus.configuredCycleTarget)}</span></div>
            <div className="flex items-center justify-between"><span>Bomba</span><span>{monitorStatus.pumpOn ? "ON" : "OFF"}</span></div>
            <div className="flex items-center justify-between"><span>Valvula</span><span>{monitorStatus.valveClosed ? "CERRADA" : "ABIERTA"}</span></div>
            <div className="flex items-center justify-between"><span>Hold restante</span><span>{holdSeconds} s</span></div>
            <div className="flex items-center justify-between"><span>ACK</span><span className="text-xs">{monitorStatus.lastAck?.command ? `${monitorStatus.lastAck.command} ${monitorStatus.lastAck.result ?? ""}` : "-"}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Grafica de presion</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="idx" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="pressure" stroke="#00d4ff" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Grafica de temperatura</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="idx" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="temp" stroke="#22c55e" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
