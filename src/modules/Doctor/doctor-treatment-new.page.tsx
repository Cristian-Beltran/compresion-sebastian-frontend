import {
  Activity,
  Check,
  Play,
  Settings2,
  Square,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {
  useEffect,
  forwardRef,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "@/lib/axios";
import { isAxiosError } from "axios";
import { toast } from "sonner";

type PatientRow = { id: string; fullname: string; status: string };
type Intensity = "low" | "medium" | "high" | "custom";
type MobilityLevel = "independiente" | "movilidad_reducida" | "inmovil";
type ZoneKey = "leftCalf" | "rightCalf" | "leftFoot" | "rightFoot";
type TreatmentZone =
  | "pantorrilla_izquierda"
  | "pantorrilla_derecha"
  | "pie_izquierdo"
  | "pie_derecho";

type GroupConfig = {
  groupId: 1 | 2 | 3 | 4;
  zone: TreatmentZone;
  intensity: Intensity;
  targetPressureKpa: number;
  inflateTimeSeconds: number;
  holdTimeSeconds: number;
  releaseTimeSeconds: number;
  cycleTarget: number;
};

type DeviceGroup = {
  groupId: number;
  enabled: boolean;
  state: string;
  pressureKpa: number;
  targetPressureKpa: number;
  forceNewtons: number;
  cycleIndex: number;
  cycleTarget: number;
  pumpOn: boolean;
  valveClosed: boolean;
  holdRemainingMs: number;
};

type Preset = {
  intensity: Exclude<Intensity, "custom">;
  targetPressureKpa: number;
  holdTimeSeconds: number;
  releaseTimeSeconds: number;
  cycleTarget: number;
};

type ContextMenu = { zone: ZoneKey; x: number; y: number } | null;
type TelemetryReading = {
  state?: string;
  temperatureC?: number | string | null;
  groups?: DeviceGroup[];
};
type ActiveTreatment = {
  id: string;
  patientId: string;
  patientName?: string;
  groups?: GroupConfig[];
};
type LiveResponse = {
  status?: {
    online?: boolean;
    connected?: boolean;
    state?: string;
    groups?: DeviceGroup[];
  };
  telemetry?: TelemetryReading | null;
  history?: TelemetryReading[];
  activeTreatment?: ActiveTreatment | null;
};

const ZONES: Record<
  ZoneKey,
  { groupId: 1 | 2 | 3 | 4; name: string; zone: TreatmentZone; path: string }
> = {
  leftCalf: {
    groupId: 1,
    name: "Pantorrilla izquierda",
    zone: "pantorrilla_izquierda",
    path: "M104 55c-5 44-4 89 1 134l8 111c1 15 8 26 19 31l28-1c7-6 10-14 10-26l-2-111c4-49 2-95-5-138z",
  },
  rightCalf: {
    groupId: 2,
    name: "Pantorrilla derecha",
    zone: "pantorrilla_derecha",
    path: "M267 55c-7 43-9 89-5 138l-2 111c0 12 3 20 10 26l28 1c11-5 18-16 19-31l8-111c5-45 6-90 1-134z",
  },
  leftFoot: {
    groupId: 3,
    name: "Pie izquierdo",
    zone: "pie_izquierdo",
    path: "M117 338c-6 23-14 43-24 61-5 9-1 16 10 18l65 2c9-1 13-6 10-15l-13-65z",
  },
  rightFoot: {
    groupId: 4,
    name: "Pie derecho",
    zone: "pie_derecho",
    path: "M265 339l-13 65c-3 9 1 14 10 15l65-2c11-2 15-9 10-18-10-18-18-38-24-61z",
  },
};

const DEFAULT_PRESETS: Record<Exclude<Intensity, "custom">, Preset> = {
  low: {
    intensity: "low",
    targetPressureKpa: 3,
    holdTimeSeconds: 8,
    releaseTimeSeconds: 4,
    cycleTarget: 20,
  },
  medium: {
    intensity: "medium",
    targetPressureKpa: 5,
    holdTimeSeconds: 10,
    releaseTimeSeconds: 5,
    cycleTarget: 25,
  },
  high: {
    intensity: "high",
    targetPressureKpa: 7,
    holdTimeSeconds: 12,
    releaseTimeSeconds: 6,
    cycleTarget: 30,
  },
};

const GROUP_COLORS = ["#1673c8", "#14805e", "#ca7b28", "#8b5cf6"];

function configFromPreset(
  zone: ZoneKey,
  preset: Preset = DEFAULT_PRESETS.medium,
): GroupConfig {
  const meta = ZONES[zone];
  return {
    groupId: meta.groupId,
    zone: meta.zone,
    intensity: preset.intensity,
    targetPressureKpa: preset.targetPressureKpa,
    inflateTimeSeconds: 15,
    holdTimeSeconds: preset.holdTimeSeconds,
    releaseTimeSeconds: preset.releaseTimeSeconds,
    cycleTarget: preset.cycleTarget,
  };
}

function stateLabel(state?: string) {
  const labels: Record<string, string> = {
    READY: "Preparado",
    INFLATING: "Inflando",
    INFLA: "Inflando",
    HOLDING: "Manteniendo",
    MANTIENE: "Manteniendo",
    DEFLATING: "Desinflando",
    DESINFLA: "Desinflando",
    DONE: "Finalizado",
    LISTO: "Finalizado",
    MENU: "En espera",
    ERROR: "Error",
    DISABLED: "Inactivo",
  };
  return labels[(state ?? "").toUpperCase()] ?? state ?? "Sin datos";
}

function numeric(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

export function DoctorTreatmentNewPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [patientId, setPatientId] = useState("");
  const [mobilityLevel, setMobilityLevel] = useState<MobilityLevel | "">("");
  const [groups, setGroups] = useState<Partial<Record<ZoneKey, GroupConfig>>>(
    {},
  );
  const [presets, setPresets] =
    useState<Record<Exclude<Intensity, "custom">, Preset>>(DEFAULT_PRESETS);
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [activeTreatment, setActiveTreatment] =
    useState<ActiveTreatment | null>(null);
  const [starting, setStarting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [patientsResult, liveResult, configurationsResult] =
      await Promise.all([
        axios.get("/doctor/patients"),
        axios.get("/doctor/dashboard/live"),
        axios.get("/configurations"),
      ]);
    setPatients(patientsResult.data);
    setLive(liveResult.data);
    setActiveTreatment(liveResult.data?.activeTreatment ?? null);

    if (Array.isArray(configurationsResult.data)) {
      const next = { ...DEFAULT_PRESETS };
      for (const row of configurationsResult.data) {
        if (
          row.intensity === "low" ||
          row.intensity === "medium" ||
          row.intensity === "high"
        ) {
          const intensity = row.intensity as Exclude<Intensity, "custom">;
          next[intensity] = {
            intensity,
            targetPressureKpa: numeric(row.targetPressureKpa),
            holdTimeSeconds: numeric(row.holdTimeSeconds),
            releaseTimeSeconds: numeric(row.releaseTimeSeconds),
            cycleTarget: numeric(row.cycleTarget),
          };
        }
      }
      setPresets(next);
    }
  };

  useEffect(() => {
    void load().catch(() =>
      toast.error("No se pudo cargar la información clínica"),
    );
    const timer = window.setInterval(
      () => void load().catch(() => undefined),
      2000,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node))
        setContextMenu(null);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  const selectedEntries = useMemo(
    () =>
      (Object.entries(groups) as Array<[ZoneKey, GroupConfig]>).sort(
        (left, right) => left[1].groupId - right[1].groupId,
      ),
    [groups],
  );

  const telemetryHistory = Array.isArray(live?.history) ? live.history : [];
  const latestTelemetry = live?.telemetry ?? telemetryHistory.at(-1) ?? null;
  const deviceGroups: DeviceGroup[] = Array.isArray(latestTelemetry?.groups)
    ? latestTelemetry.groups
    : Array.isArray(live?.status?.groups)
      ? live.status.groups
      : [];
  const online = Boolean(live?.status?.online ?? live?.status?.connected);
  const currentPatient =
    patients.find((patient) => patient.id === activeTreatment?.patientId)
      ?.fullname ??
    activeTreatment?.patientName ??
    "-";

  const chartData = telemetryHistory
    .slice(-80)
    .map((reading, index: number) => {
      const point: Record<string, number> = { index };
      if (Array.isArray(reading.groups)) {
        for (const group of reading.groups) {
          point["g" + group.groupId] = numeric(group.pressureKpa);
        }
      }
      return point;
    });

  const toggleZone = (zone: ZoneKey) => {
    if (activeTreatment) return;
    setGroups((current) => {
      const next = { ...current };
      if (next[zone]) delete next[zone];
      else next[zone] = configFromPreset(zone, presets.medium);
      return next;
    });
  };

  const openConfiguration = (
    event: ReactMouseEvent<Element>,
    zone: ZoneKey,
  ) => {
    event.preventDefault();
    if (activeTreatment) return;
    setGroups((current) =>
      current[zone]
        ? current
        : { ...current, [zone]: configFromPreset(zone, presets.medium) },
    );
    const width = 360;
    const height = 590;
    setContextMenu({
      zone,
      x: Math.max(
        12,
        Math.min(event.clientX + 10, window.innerWidth - width - 12),
      ),
      y: Math.max(
        12,
        Math.min(event.clientY + 10, window.innerHeight - height - 12),
      ),
    });
  };

  const updateGroup = (zone: ZoneKey, patch: Partial<GroupConfig>) => {
    setGroups((current) => ({
      ...current,
      [zone]: {
        ...(current[zone] ?? configFromPreset(zone, presets.medium)),
        ...patch,
      },
    }));
  };

  const changePreset = (
    zone: ZoneKey,
    intensity: Exclude<Intensity, "custom">,
  ) => {
    const preset = presets[intensity];
    updateGroup(zone, {
      intensity,
      targetPressureKpa: preset.targetPressureKpa,
      holdTimeSeconds: preset.holdTimeSeconds,
      releaseTimeSeconds: preset.releaseTimeSeconds,
      cycleTarget: preset.cycleTarget,
    });
  };

  const start = async () => {
    if (!patientId || !mobilityLevel || selectedEntries.length === 0) {
      toast.error("Selecciona paciente, movilidad y al menos un compresor");
      return;
    }

    setStarting(true);
    try {
      await axios.post("/doctor/treatments/start", {
        patientId,
        mobilityLevel,
        intensity: selectedEntries.every(
          ([, item]) => item.intensity === selectedEntries[0][1].intensity,
        )
          ? selectedEntries[0][1].intensity
          : "custom",
        groups: selectedEntries.map(([, item]) => item),
      });
      toast.success("Sesión enviada a los compresores seleccionados");
      setContextMenu(null);
      await load();
    } catch (error: unknown) {
      toast.error(
        (isAxiosError(error) && error.response?.data?.message) ||
          "No se pudo iniciar la sesión",
      );
    } finally {
      setStarting(false);
    }
  };

  const stop = async () => {
    if (!activeTreatment) return;
    try {
      await axios.post("/doctor/treatments/" + activeTreatment.id + "/stop");
      toast.success("Orden de detención enviada");
      await load();
    } catch {
      toast.error("No se pudo detener la sesión");
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#1673c8]">
            Terapia neumática secuencial
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
            Nueva sesión
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clic para seleccionar varios grupos. Clic derecho para configurar
            cada compresor.
          </p>
        </div>
        <div
          className={
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold " +
            (online
              ? "bg-emerald-500/15 text-emerald-600"
              : "bg-red-500/15 text-red-600")
          }
        >
          {online ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          ESP32 {online ? "conectado" : "sin conexión"}
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(430px,1.2fr)_minmax(330px,.8fr)]">
        <Card className="overflow-hidden border-[#dbe3ec] shadow-[0_12px_32px_rgba(21,49,80,.08)]">
          <CardHeader className="border-b bg-white dark:bg-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Seleccione las zonas de tratamiento</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  La selección es múltiple e independiente.
                </p>
              </div>
              <span className="rounded-full bg-[#e9f4ff] px-3 py-1 text-xs font-bold text-[#0b5cab]">
                {selectedEntries.length} de 4 seleccionadas
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="relative grid min-h-[430px] place-items-center overflow-hidden rounded-xl border bg-[radial-gradient(circle_at_50%_35%,#f8fbfd_0,#eff4f8_70%)]">
              <span className="absolute left-4 top-3 text-[10px] font-extrabold tracking-[.14em] text-slate-400">
                VISTA FRONTAL
              </span>
              <svg
                className="h-[400px] w-full max-w-[430px]"
                viewBox="0 0 430 470"
                role="img"
                aria-label="Selector de cuatro grupos de compresión"
              >
                <path
                  className="fill-[#e9edf1] stroke-[#cbd5df] stroke-2"
                  d="M98 35c-7 50-7 104-1 157l9 118c2 22 13 38 32 41l29-2c9-4 14-15 15-31l-3-124c5-56 2-109-7-159z"
                />
                <path
                  className="fill-[#e9edf1] stroke-[#cbd5df] stroke-2"
                  d="M258 35c-9 50-12 103-7 159l-3 124c1 16 6 27 15 31l29 2c19-3 30-19 32-41l9-118c6-53 6-107-1-157z"
                />
                <path
                  className="fill-[#e9edf1] stroke-[#cbd5df] stroke-2"
                  d="M108 323c-5 27-13 51-27 76-8 16-1 28 17 30l73 2c17 0 24-10 20-25l-15-74z"
                />
                <path
                  className="fill-[#e9edf1] stroke-[#cbd5df] stroke-2"
                  d="M254 332l-15 74c-4 15 3 25 20 25l73-2c18-2 25-14 17-30-14-25-22-49-27-76z"
                />
                {(
                  Object.entries(ZONES) as Array<
                    [ZoneKey, (typeof ZONES)[ZoneKey]]
                  >
                ).map(([key, zone]) => {
                  const selected = Boolean(groups[key]);
                  return (
                    <path
                      key={key}
                      d={zone.path}
                      tabIndex={0}
                      aria-label={zone.name}
                      className={
                        "cursor-pointer stroke-white stroke-[3] transition-all duration-200 hover:brightness-95 " +
                        (selected
                          ? "fill-[#39aa82] drop-shadow-[0_7px_7px_rgba(24,70,110,.18)]"
                          : "fill-[#d7dee5] hover:fill-[#ef8e92]")
                      }
                      onClick={() => toggleZone(key)}
                      onContextMenu={(event) => openConfiguration(event, key)}
                    >
                      <title>{zone.name}</title>
                    </path>
                  );
                })}
                <text
                  x="138"
                  y="454"
                  textAnchor="middle"
                  fill="#7f8e9c"
                  fontSize="12"
                >
                  Izquierda
                </text>
                <text
                  x="292"
                  y="454"
                  textAnchor="middle"
                  fill="#7f8e9c"
                  fontSize="12"
                >
                  Derecha
                </text>
              </svg>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                Object.entries(ZONES) as Array<
                  [ZoneKey, (typeof ZONES)[ZoneKey]]
                >
              ).map(([key, zone]) => {
                const selected = groups[key];
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggleZone(key)}
                    onContextMenu={(event) => openConfiguration(event, key)}
                    disabled={Boolean(activeTreatment)}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold transition hover:border-[#8ab8df]"
                  >
                    <span
                      className={
                        "h-2.5 w-2.5 rounded-full " +
                        (selected ? "bg-[#14805e]" : "bg-slate-300")
                      }
                    />
                    <span>{zone.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {selected ? "Configurada" : "Sin seleccionar"}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-[#dbe3ec] shadow-[0_12px_32px_rgba(21,49,80,.08)]">
            <CardHeader>
              <CardTitle>Paciente y sesión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="grid gap-1.5 text-sm font-bold">
                Paciente
                <select
                  className="h-11 rounded-lg border bg-background px-3 font-normal"
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  disabled={Boolean(activeTreatment)}
                >
                  <option value="">Buscar o seleccionar paciente…</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullname}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Movilidad
                <select
                  className="h-11 rounded-lg border bg-background px-3 font-normal"
                  value={mobilityLevel}
                  onChange={(event) =>
                    setMobilityLevel(event.target.value as MobilityLevel | "")
                  }
                  disabled={Boolean(activeTreatment)}
                >
                  <option value="">Seleccionar nivel…</option>
                  <option value="independiente">Independiente</option>
                  <option value="movilidad_reducida">Movilidad reducida</option>
                  <option value="inmovil">Inmóvil</option>
                </select>
              </label>

              {!activeTreatment ? (
                <Button
                  className="h-12 w-full bg-[#0b5cab] font-extrabold hover:bg-[#1673c8]"
                  onClick={() => void start()}
                  disabled={starting || selectedEntries.length === 0}
                >
                  <Play className="h-4 w-4" />
                  {starting ? "ENVIANDO…" : "COMENZAR TRATAMIENTO"}
                </Button>
              ) : (
                <Button
                  className="h-12 w-full font-extrabold"
                  variant="destructive"
                  onClick={() => void stop()}
                >
                  <Square className="h-4 w-4" />
                  DETENER TRATAMIENTO
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#dbe3ec]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4 text-[#1673c8]" />
                Configuración seleccionada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedEntries.length === 0 ? (
                <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                  Selecciona una zona y usa clic derecho para editar sus
                  parámetros.
                </p>
              ) : (
                selectedEntries.map(([key, config]) => (
                  <button
                    key={key}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:border-[#8ab8df]"
                    onClick={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setContextMenu({
                        zone: key,
                        x: Math.min(rect.right + 8, window.innerWidth - 372),
                        y: Math.min(rect.top, window.innerHeight - 602),
                      });
                    }}
                  >
                    <span
                      className="grid h-8 w-8 place-items-center rounded-lg text-xs font-extrabold text-white"
                      style={{ background: GROUP_COLORS[config.groupId - 1] }}
                    >
                      G{config.groupId}
                    </span>
                    <span>
                      <strong className="block text-sm">
                        {ZONES[key].name}
                      </strong>
                      <small className="text-muted-foreground">
                        {config.targetPressureKpa} kPa · {config.cycleTarget}{" "}
                        ciclos
                      </small>
                    </span>
                    <Check className="ml-auto h-4 w-4 text-emerald-600" />
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {activeTreatment && (
        <section className="space-y-4">
          <Card className="border-0 bg-[#0d4773] text-white">
            <CardContent className="grid gap-4 p-5 md:grid-cols-[1.3fr_repeat(3,1fr)]">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#aaccE7]">
                  Sesión activa
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  {currentPatient}
                </h2>
                <p className="text-xs text-[#b9d9f1]">{activeTreatment.id}</p>
              </div>
              <MonitorStat
                label="Grupos"
                value={String(
                  activeTreatment.groups?.length ??
                    deviceGroups.filter((item) => item.enabled).length,
                )}
              />
              <MonitorStat
                label="Temperatura"
                value={
                  numeric(latestTelemetry?.temperatureC).toFixed(1) + " °C"
                }
              />
              <MonitorStat
                label="Estado"
                value={stateLabel(
                  latestTelemetry?.state ?? live?.status?.state,
                )}
              />
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {deviceGroups
              .filter((group) => group.enabled)
              .map((group) => (
                <Card
                  key={group.groupId}
                  className="border-t-4"
                  style={{ borderTopColor: GROUP_COLORS[group.groupId - 1] }}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <strong>Grupo {group.groupId}</strong>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600">
                        {stateLabel(group.state)}
                      </span>
                    </div>
                    <div className="text-2xl font-extrabold">
                      {numeric(group.pressureKpa).toFixed(2)}
                      <small className="ml-1 text-xs font-bold text-muted-foreground">
                        kPa
                      </small>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width:
                            Math.min(
                              100,
                              (numeric(group.pressureKpa) /
                                Math.max(1, numeric(group.targetPressureKpa))) *
                                100,
                            ) + "%",
                          background: GROUP_COLORS[group.groupId - 1],
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>
                        Fuerza{" "}
                        <b className="text-foreground">
                          {numeric(group.forceNewtons).toFixed(1)} N
                        </b>
                      </span>
                      <span>
                        Ciclos{" "}
                        <b className="text-foreground">
                          {group.cycleIndex}/{group.cycleTarget}
                        </b>
                      </span>
                      <span>
                        Bomba{" "}
                        <b className="text-foreground">
                          {group.pumpOn ? "ON" : "OFF"}
                        </b>
                      </span>
                      <span>
                        Válvula{" "}
                        <b className="text-foreground">
                          {group.valveClosed ? "Cerrada" : "Abierta"}
                        </b>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-[#1673c8]" />
                Presión en tiempo real por grupo
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="index" />
                  <YAxis />
                  <Tooltip />
                  {[1, 2, 3, 4].map((groupId) => (
                    <Line
                      key={groupId}
                      type="monotone"
                      dataKey={"g" + groupId}
                      name={"Grupo " + groupId}
                      stroke={GROUP_COLORS[groupId - 1]}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      )}

      {contextMenu && groups[contextMenu.zone] && (
        <GroupConfigurator
          ref={popoverRef}
          context={contextMenu}
          config={groups[contextMenu.zone]!}
          presets={presets}
          onChange={(patch) => updateGroup(contextMenu.zone, patch)}
          onPreset={(intensity) => changePreset(contextMenu.zone, intensity)}
          onClose={() => setContextMenu(null)}
          onRemove={() => {
            setGroups((current) => {
              const next = { ...current };
              delete next[contextMenu.zone];
              return next;
            });
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}

function MonitorStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-white/20 pl-4">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#aaccE7]">
        {label}
      </span>
      <strong className="mt-1 block text-base">{value}</strong>
    </div>
  );
}

type ConfiguratorProps = {
  context: NonNullable<ContextMenu>;
  config: GroupConfig;
  presets: Record<Exclude<Intensity, "custom">, Preset>;
  onChange: (patch: Partial<GroupConfig>) => void;
  onPreset: (intensity: Exclude<Intensity, "custom">) => void;
  onClose: () => void;
  onRemove: () => void;
};

const GroupConfigurator = forwardRef<HTMLDivElement, ConfiguratorProps>(
  ({ context, config, onChange, onPreset, onClose, onRemove }, ref) => (
    <div
      ref={ref}
      className="fixed z-[100] w-[350px] max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl border border-[#cbd6e2] bg-popover p-4 text-popover-foreground shadow-[0_24px_70px_rgba(7,22,36,.28)]"
      style={{ left: context.x, top: context.y }}
      role="dialog"
      aria-label={"Configurar " + ZONES[context.zone].name}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#1673c8]">
            Grupo {config.groupId}
          </p>
          <h3 className="font-extrabold">{ZONES[context.zone].name}</h3>
          <p className="text-xs text-muted-foreground">
            Configuración independiente
          </p>
        </div>
        <button className="rounded-md p-1 hover:bg-muted" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        <button
          className={
            "rounded-md px-2 py-2 text-xs font-extrabold " +
            (config.intensity !== "custom"
              ? "bg-background text-[#0b5cab] shadow-sm"
              : "text-muted-foreground")
          }
          onClick={() => onPreset("medium")}
        >
          Predefinida
        </button>
        <button
          className={
            "rounded-md px-2 py-2 text-xs font-extrabold " +
            (config.intensity === "custom"
              ? "bg-background text-[#0b5cab] shadow-sm"
              : "text-muted-foreground")
          }
          onClick={() => onChange({ intensity: "custom" })}
        >
          Personalizada
        </button>
      </div>

      {config.intensity !== "custom" && (
        <label className="mt-3 grid gap-1 text-xs font-bold">
          Protocolo
          <select
            className="h-10 rounded-lg border bg-background px-2 font-normal"
            value={config.intensity}
            onChange={(event) =>
              onPreset(event.target.value as Exclude<Intensity, "custom">)
            }
          >
            <option value="low">Baja intensidad</option>
            <option value="medium">Media intensidad</option>
            <option value="high">Alta intensidad</option>
          </select>
        </label>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <NumberField
          label="Presión objetivo"
          unit="kPa"
          min={1}
          max={40}
          step={0.5}
          value={config.targetPressureKpa}
          onChange={(value) =>
            onChange({ targetPressureKpa: value, intensity: "custom" })
          }
        />
        <NumberField
          label="Inflado"
          unit="s"
          min={1}
          max={60}
          value={config.inflateTimeSeconds}
          onChange={(value) =>
            onChange({ inflateTimeSeconds: value, intensity: "custom" })
          }
        />
        <NumberField
          label="Mantenimiento"
          unit="s"
          min={1}
          max={60}
          value={config.holdTimeSeconds}
          onChange={(value) =>
            onChange({ holdTimeSeconds: value, intensity: "custom" })
          }
        />
        <NumberField
          label="Desinflado"
          unit="s"
          min={1}
          max={60}
          value={config.releaseTimeSeconds}
          onChange={(value) =>
            onChange({ releaseTimeSeconds: value, intensity: "custom" })
          }
        />
        <NumberField
          label="Número de ciclos"
          unit=""
          min={1}
          max={100}
          value={config.cycleTarget}
          onChange={(value) =>
            onChange({ cycleTarget: Math.round(value), intensity: "custom" })
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <Button className="bg-[#14805e] hover:bg-[#116b50]" onClick={onClose}>
          <Check className="h-4 w-4" />
          Guardar grupo
        </Button>
        <Button variant="outline" onClick={onRemove}>
          Quitar
        </Button>
      </div>
    </div>
  ),
);
GroupConfigurator.displayName = "GroupConfigurator";

function NumberField({
  label,
  unit,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-[11px] font-bold">
      {label}
      <span className="relative">
        <input
          className="h-10 w-full rounded-lg border bg-background px-2 pr-9 font-mono text-sm font-normal"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <small className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
          {unit}
        </small>
      </span>
    </label>
  );
}
