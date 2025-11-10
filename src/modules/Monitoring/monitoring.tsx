import { useEffect, useMemo, useRef, useState } from "react";
import { sessionService } from "@/modules/Session/data/session.service";
import { patientService } from "@/modules/Patient/data/patient.service";
import type { Session } from "@/modules/Session/session.interface";
import type { Patient } from "@/modules/Patient/patient.interface";

import {
  isWebSerialSupported,
  getAuthorizedPorts,
  requestPort,
  openPort,
  writeLine,
  type SerialIO,
} from "./serialAdapter";

import type { SerialPort } from "./serial.interface";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Play,
  Square,
  RefreshCw,
  Link2,
  Link2Off,
  Usb,
  User,
  Gauge,
  Thermometer,
  Check,
  AlertTriangle,
  Settings2,
} from "lucide-react";

type RealtimeRow = {
  timestamp: string;
  measuredPressure: number; // kPa o la unidad que uses
  temperature: number; // °C
  cycleIndex?: number;
};

function fmtTime(iso?: string) {
  return iso
    ? new Date(iso).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Esperamos líneas en JSON, por ejemplo:
 * {"pressure": 23.4, "temperature": 32.1, "cycle": 1}
 */
function parseLine(line: string): RealtimeRow | null {
  const ts = new Date().toISOString();
  const s = line.trim();
  if (!s || !s.startsWith("{") || !s.endsWith("}")) return null;

  try {
    const obj = JSON.parse(s) as Partial<Record<string, unknown>>;

    const pressure = Number(
      obj.pressure ?? obj.measuredPressure ?? obj.p ?? obj.pr,
    );
    const temp = Number(obj.temperature ?? obj.temp ?? obj.t);
    const cycle = obj.cycle ?? obj.cycleIndex;

    if (Number.isFinite(pressure) && Number.isFinite(temp)) {
      return {
        timestamp: ts,
        measuredPressure: pressure,
        temperature: temp,
        cycleIndex:
          typeof cycle === "number"
            ? cycle
            : Number.isFinite(Number(cycle))
              ? Number(cycle)
              : undefined,
      };
    }
  } catch {
    // línea inválida: se descarta
  }
  return null;
}

export default function MonitoringPage() {
  // Dominio
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);

  // Configuración de sesión (lo que se graba en backend)
  const [targetPressure, setTargetPressure] = useState<number>(30); // kPa
  const [holdTimeSeconds, setHoldTimeSeconds] = useState<number>(10); // seg

  // Serial
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [selectedPortIdx, setSelectedPortIdx] = useState<number>(-1);
  const [io, setIo] = useState<SerialIO | null>(null);

  // Flags
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [startedFromDevice, setStartedFromDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Datos en tiempo real
  const [realtime, setRealtime] = useState<RealtimeRow[]>([]);

  // Control de envío a backend
  const lastSentRef = useRef<number>(0);
  const closeLoopRef = useRef<boolean>(false);

  // Cargar pacientes
  useEffect(() => {
    (async () => {
      try {
        const data = await patientService.findAll();
        setPatients(data ?? []);
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.message
            : "No se pudieron cargar los pacientes.";
        setErr(message);
      }
    })();
  }, []);

  // Cargar puertos autorizados
  useEffect(() => {
    (async () => {
      if (!isWebSerialSupported()) return;
      const list = await getAuthorizedPorts();
      setPorts(list);
    })();
  }, []);

  // Derivados UI / reglas
  const canCreateSession =
    !!patientId && !session && targetPressure > 0 && holdTimeSeconds > 0;
  const canPickDevice = !!session && !isMonitoring;
  const isConnected = io !== null;
  const canConnect = !!session && selectedPortIdx >= 0 && !isConnected;
  const canStart = !!session && isConnected && !isMonitoring;
  const canStop = !!session && isMonitoring;
  const canReset = !isMonitoring && (!!session || !!patientId);

  // Acciones
  const handleCreateSession = async (): Promise<void> => {
    if (!patientId) return;
    setLoading(true);
    setErr(null);
    try {
      const s = await sessionService.create({
        patientId,
        targetPressure,
        holdTimeSeconds,
      });
      setSession(s);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Error creando la sesión.";
      setErr(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPort = async (): Promise<void> => {
    setErr(null);
    try {
      const p = await requestPort();
      const list = await getAuthorizedPorts();
      setPorts(list);
      const idx = list.findIndex((x) => x === p);
      setSelectedPortIdx(idx >= 0 ? idx : -1);
    } catch {
      // cancelado por el usuario
    }
  };

  const handleConnect = async (): Promise<void> => {
    if (selectedPortIdx < 0) return;
    setErr(null);
    try {
      const connected = await openPort(ports[selectedPortIdx], 115200);
      setIo(connected);
      closeLoopRef.current = false;
      void readLoop(connected);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No se pudo abrir el puerto serial.";
      setErr(message);
    }
  };

  const handleDisconnect = async (): Promise<void> => {
    if (!io) return;
    closeLoopRef.current = true;
    try {
      await io.close();
    } catch {
      // silencioso
    }
    setIo(null);
  };

  const handleStart = async (): Promise<void> => {
    if (!io || !session) return;
    setErr(null);
    setStartedFromDevice(false);
    // Comando para iniciar en el ESP (ajusta si usas otro)
    await writeLine(io.writer, "I");
    setIsMonitoring(true);
  };

  const handleStop = async (): Promise<void> => {
    if (!io || !session) return;
    setErr(null);
    // Comando para detener en el ESP
    await writeLine(io.writer, "S");
    setIsMonitoring(false);
    // NO llamamos a closeSession en backend porque no existe update
  };

  const handleReset = async (): Promise<void> => {
    if (isMonitoring) return;
    await handleDisconnect();
    setRealtime([]);
    setStartedFromDevice(false);
    setSession(null);
    setPatientId("");
    setErr(null);
    setSelectedPortIdx(-1);
    setTargetPressure(30);
    setHoldTimeSeconds(10);
  };

  // Bucle de lectura
  const readLoop = async (connected: SerialIO): Promise<void> => {
    while (!closeLoopRef.current) {
      try {
        const { value, done } = await connected.reader.read();
        if (done) break;
        if (!value) continue;

        const reading = parseLine(value);
        if (!reading) continue;

        // Si el dispositivo empezó solo (ej. botón físico), marcamos monitoring
        if (session && !isMonitoring) {
          setIsMonitoring(true);
          setStartedFromDevice(true);
        }

        setRealtime((prev) => {
          const up = [...prev, reading];
          return up.slice(-200);
        });

        // Envío al backend cada 1s
        const now = Date.now();
        if (session && now - lastSentRef.current >= 1000) {
          lastSentRef.current = now;
          try {
            await sessionService.addData(session.id, {
              measuredPressure: clamp(reading.measuredPressure, 0, 200),
              temperature: clamp(reading.temperature, 0, 80),
              cycleIndex: reading.cycleIndex,
            });
          } catch {
            // toleramos fallos intermitentes
          }
        }
      } catch (e: unknown) {
        if (closeLoopRef.current) break;
        const message =
          e instanceof Error
            ? e.message
            : "Error leyendo datos del dispositivo.";
        setErr(message);
        break;
      }
    }
  };

  const totalReads = realtime.length;
  const last = realtime.at(-1);

  const steps = useMemo(
    () => [
      { label: "Paciente", done: !!patientId },
      {
        label: "Protocolo",
        done: targetPressure > 0 && holdTimeSeconds > 0,
      },
      { label: "Sesión creada", done: !!session },
      { label: "Dispositivo", done: selectedPortIdx >= 0 },
      { label: "Conexión", done: isConnected },
      { label: "Ciclos activos", done: isMonitoring },
    ],
    [
      patientId,
      targetPressure,
      holdTimeSeconds,
      session,
      selectedPortIdx,
      isConnected,
      isMonitoring,
    ],
  );

  return (
    <div className="space-y-4">
      {/* Encabezado compacto */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
            Control de banda de compresión
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Orquesta el protocolo, sincroniza el dispositivo y registra la
            presión y temperatura en tiempo real.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!canReset}
          className="shrink-0"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reiniciar
        </Button>
      </div>

      {/* Barra de pasos horizontal */}
      <Card className="border-dashed">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            {steps.map((step, index) => (
              <div key={step.label} className="flex items-center gap-2 text-xs">
                <div
                  className={
                    "inline-flex items-center gap-1 rounded-full border px-2 py-1 " +
                    (step.done
                      ? "bg-background text-foreground"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {step.done ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  <span className="font-medium">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <span className="text-[10px] text-muted-foreground">···</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {err && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-destructive">
              Error de monitoreo
            </CardTitle>
            <CardDescription className="text-xs">{err}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Layout principal dividido */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1.1fr)] items-start">
        {/* Columna izquierda: panel en vivo */}
        <div className="space-y-4">
          {/* Estado actual */}
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Panel en vivo
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Última lectura: {fmtTime(last?.timestamp)} · Registros:{" "}
                    {totalReads}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {isConnected ? "Conectado" : "Desconectado"}
                  </Badge>
                  {isMonitoring && (
                    <Badge variant="outline" className="text-[11px]">
                      Ciclos en ejecución
                    </Badge>
                  )}
                  {isMonitoring && startedFromDevice && (
                    <Badge variant="outline" className="text-[11px]">
                      Inicio desde dispositivo
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Métricas grandes */}
              <div className="grid gap-4 md:grid-cols-2">
                <MetricBox
                  title="Presión medida"
                  value={last?.measuredPressure}
                  unit="kPa"
                  icon={<Gauge className="h-4 w-4" />}
                  maxBar={100}
                />
                <MetricBox
                  title="Temperatura"
                  value={last?.temperature}
                  unit="°C"
                  icon={<Thermometer className="h-4 w-4" />}
                  maxBar={80}
                />
              </div>

              <Separator />

              {/* Historial vertical tipo timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Historial reciente
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Últimos 12 registros
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute left-[10px] top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-2 pl-5">
                    {realtime.slice(-12).map((r, i) => (
                      <div
                        key={`${r.timestamp}-${i}`}
                        className="relative flex gap-3 rounded-md border bg-card/60 px-3 py-2 text-xs"
                      >
                        <div className="absolute -left-[10px] top-2 h-2 w-2 rounded-full bg-primary" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {fmtTime(r.timestamp)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 h-5"
                            >
                              Ciclo {r.cycleIndex ?? "—"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Chip
                              label="Presión"
                              value={r.measuredPressure}
                              unit="kPa"
                            />
                            <Chip
                              label="Temp."
                              value={r.temperature}
                              unit="°C"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {realtime.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Aún no hay lecturas. Inicia el protocolo para comenzar a
                        recibir datos del dispositivo.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: configuración y control */}
        <div className="space-y-4">
          {/* Configuración de sesión */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Configuración de sesión
              </CardTitle>
              <CardDescription className="text-xs">
                Define el paciente y los parámetros del protocolo de compresión.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Paciente */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Paciente</span>
                </div>
                <select
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  disabled={!!session || loading}
                >
                  <option value="">— Selecciona paciente —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.user.fullname}
                    </option>
                  ))}
                </select>
              </div>

              {/* Protocolo */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    Protocolo de compresión
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">
                      Presión objetivo
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        step={0.5}
                        className="h-8 text-xs"
                        value={targetPressure}
                        onChange={(e) =>
                          setTargetPressure(Number(e.target.value) || 0)
                        }
                        disabled={!!session}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        kPa
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">
                      Tiempo de mantenimiento
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        className="h-8 text-xs"
                        value={holdTimeSeconds}
                        onChange={(e) =>
                          setHoldTimeSeconds(Number(e.target.value) || 0)
                        }
                        disabled={!!session}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        seg
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleCreateSession}
                  disabled={!canCreateSession || loading}
                >
                  <Usb className="h-4 w-4 mr-2" /> Crear sesión
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dispositivo y control de ciclos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Dispositivo y ciclos
              </CardTitle>
              <CardDescription className="text-xs">
                Gestiona la conexión al ESP32 y la ejecución de ciclos de
                inflado/mantenimiento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dispositivo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Usb className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">Dispositivo</span>
                  </div>
                  <Badge
                    variant={isWebSerialSupported() ? "outline" : "destructive"}
                    className="text-[10px]"
                  >
                    {isWebSerialSupported()
                      ? "WebSerial disponible"
                      : "WebSerial no soportado"}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_auto]">
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={selectedPortIdx}
                    onChange={(e) => setSelectedPortIdx(Number(e.target.value))}
                    disabled={!canPickDevice}
                  >
                    <option value={-1}>— Selecciona dispositivo —</option>
                    {ports.map((_p, idx) => (
                      <option key={idx} value={idx}>
                        Dispositivo #{idx + 1}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRequestPort}
                    disabled={!canPickDevice || !isWebSerialSupported()}
                  >
                    Escanear
                  </Button>
                </div>
              </div>

              {/* Conexión */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {isConnected ? "Conectado" : "Desconectado"}
                  </Badge>
                  {session && (
                    <span className="text-[11px] text-muted-foreground">
                      Sesión #{session.id.slice(0, 8)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {isConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnect}
                    >
                      <Link2Off className="h-4 w-4 mr-1" />
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleConnect}
                      disabled={!canConnect}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Conectar
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Start / Stop */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">
                    Control de ciclos
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    El ESP ejecuta inflado, mantenimiento y desinflado en bucle
                    hasta detener la sesión.
                  </span>
                </div>
                <div className="flex gap-2">
                  {isMonitoring ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStop}
                      disabled={!canStop}
                    >
                      <Square className="h-4 w-4 mr-1" /> Detener
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleStart}
                      disabled={!canStart}
                    >
                      <Play className="h-4 w-4 mr-1" /> Iniciar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// UI helpers
function MetricBox({
  title,
  value,
  unit,
  icon,
  maxBar,
}: {
  title: string;
  value?: number;
  unit: string;
  icon: React.ReactNode;
  maxBar: number;
}) {
  const v = Number.isFinite(value) ? Number(value) : null;
  const pct = v === null ? 0 : Math.max(0, Math.min(100, (v / maxBar) * 100));
  return (
    <div className="rounded-xl border bg-card/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium">{title}</span>
        </div>
        <Badge variant="outline" className="font-mono text-[11px]">
          {v === null ? "—" : `${v.toFixed(1)} ${unit}`}
        </Badge>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function Chip({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  const v = Number.isFinite(value) ? Number(value) : null;
  return (
    <div className="flex items-center justify-between rounded-md border px-2 py-1 bg-muted/40 min-w-[110px]">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[12px]">
        {v === null ? "—" : `${v.toFixed(1)} ${unit}`}
      </span>
    </div>
  );
}
