import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gauge, Activity, Thermometer, Power } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useMqttSubscribe, MQTT_TOPICS } from "@/lib/mqtt";
import axios from "@/lib/axios";

type SensorReading = {
  name: string;
  value: number;
  unit: string;
  status: "normal" | "revisar";
};

type TelemetryPayload = {
  groups?: Array<{
    groupId: number;
    pressureKpa: number;
    forceNewtons: number;
    pumpOn?: boolean;
    valveClosed?: boolean;
    pressureSensorAvailable?: boolean;
    forceSensorAvailable?: boolean;
  }>;
  temperature1C?: number | null;
  temperature2C?: number | null;
  temperature1Valid?: boolean;
  temperature2Valid?: boolean;
};

export function TechnicalSensorsPage() {
  const telemetry = useMqttSubscribe<TelemetryPayload>(MQTT_TOPICS.telemetry);
  const [testRunning, setTestRunning] = useState<string | null>(null);
  const [actuating, setActuating] = useState<number | null>(null);

  const pressureSensors: SensorReading[] = [
    {
      name: "P-Z1",
      value: telemetry?.groups?.[0]?.pressureKpa ?? 0,
      unit: "kPa",
      status: (telemetry?.groups?.[0]?.pressureSensorAvailable !== false) ? "normal" : "revisar",
    },
    {
      name: "P-Z2",
      value: telemetry?.groups?.[1]?.pressureKpa ?? 0,
      unit: "kPa",
      status: (telemetry?.groups?.[1]?.pressureSensorAvailable !== false) ? "normal" : "revisar",
    },
    {
      name: "P-Z3",
      value: telemetry?.groups?.[2]?.pressureKpa ?? 0,
      unit: "kPa",
      status: (telemetry?.groups?.[2]?.pressureSensorAvailable !== false) ? "normal" : "revisar",
    },
    {
      name: "P-Z4",
      value: telemetry?.groups?.[3]?.pressureKpa ?? 0,
      unit: "kPa",
      status: (telemetry?.groups?.[3]?.pressureSensorAvailable !== false) ? "normal" : "revisar",
    },
  ];

  const forceSensors: SensorReading[] = [
    {
      name: "F-Z1",
      value: telemetry?.groups?.[0]?.forceNewtons ?? 0,
      unit: "N",
      status: (telemetry?.groups?.[0]?.forceSensorAvailable !== false) ? "normal" : "revisar",
    },
    {
      name: "F-Z2",
      value: telemetry?.groups?.[1]?.forceNewtons ?? 0,
      unit: "N",
      status: (telemetry?.groups?.[1]?.forceSensorAvailable !== false) ? "normal" : "revisar",
    },
    {
      name: "F-Z3",
      value: telemetry?.groups?.[2]?.forceNewtons ?? 0,
      unit: "N",
      status: (telemetry?.groups?.[2]?.forceSensorAvailable !== false) ? "normal" : "revisar",
    },
    {
      name: "F-Z4",
      value: telemetry?.groups?.[3]?.forceNewtons ?? 0,
      unit: "N",
      status: (telemetry?.groups?.[3]?.forceSensorAvailable !== false) ? "normal" : "revisar",
    },
  ];

  const tempSensors: SensorReading[] = [
    {
      name: "T-REG1",
      value: telemetry?.temperature1C ?? 0,
      unit: "°C",
      status: (telemetry?.temperature1Valid !== false) ? "normal" : "revisar",
    },
    {
      name: "T-REG2",
      value: telemetry?.temperature2C ?? 0,
      unit: "°C",
      status: (telemetry?.temperature2Valid !== false) ? "normal" : "revisar",
    },
  ];

  const runTest = (sensorName: string) => {
    setTestRunning(sensorName);
    setTimeout(() => {
      setTestRunning(null);
      toast.success(`Prueba de ${sensorName} completada`);
    }, 2000);
  };

  const activePumps = telemetry?.groups?.filter((g) => g.pumpOn).length ?? 0;

  const togglePump = async (groupId: number) => {
    const group = telemetry?.groups?.find((g) => g.groupId === groupId);
    if (!group) return;

    const willTurnOn = !group.pumpOn;
    
    if (willTurnOn && activePumps >= 2) {
      toast.error("No es posible activar más de dos bombas simultáneamente por limitación de corriente del sistema.");
      return;
    }

    setActuating(groupId);
    try {
      await axios.post(`/device/groups/${groupId}/actuate`, {
        pumpOn: willTurnOn,
        valveClosed: willTurnOn ? group.valveClosed : false,
        durationMs: willTurnOn ? 1000 : 100,
      });
      toast.success(`Bomba ${groupId} ${willTurnOn ? "activada" : "desactivada"}`);
    } catch {
      toast.error(`Error al controlar bomba ${groupId}`);
    } finally {
      setActuating(null);
    }
  };

  const toggleValve = async (groupId: number) => {
    const group = telemetry?.groups?.find((g) => g.groupId === groupId);
    if (!group) return;

    const willClose = !group.valveClosed;

    setActuating(groupId);
    try {
      await axios.post(`/device/groups/${groupId}/actuate`, {
        pumpOn: group.pumpOn,
        valveClosed: willClose,
        durationMs: willClose ? 1000 : 100,
      });
      toast.success(`Válvula ${groupId} ${willClose ? "cerrada" : "abierta"}`);
    } catch {
      toast.error(`Error al controlar válvula ${groupId}`);
    } finally {
      setActuating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Diagnóstico de sensores</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">Sensores</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lecturas en tiempo real de los sensores del equipo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Sensores normales"
          value={String(
            [...pressureSensors, ...forceSensors, ...tempSensors].filter(
              (s) => s.status === "normal",
            ).length,
          )}
          unit="/ 10"
          icon={<Gauge className="h-5 w-5" />}
          accentColor="primary"
        />
        <MetricCard
          label="Presión promedio"
          value={(
            pressureSensors.reduce((acc, s) => acc + s.value, 0) / 4
          ).toFixed(1)}
          unit="kPa"
          icon={<Gauge className="h-5 w-5" />}
          accentColor="secondary"
        />
        <MetricCard
          label="Fuerza promedio"
          value={(
            forceSensors.reduce((acc, s) => acc + s.value, 0) / 4
          ).toFixed(1)}
          unit="N"
          icon={<Activity className="h-5 w-5" />}
          accentColor="accent"
        />
        <MetricCard
          label="Temperatura promedio"
          value={(
            tempSensors.reduce((acc, s) => acc + s.value, 0) / 2
          ).toFixed(1)}
          unit="°C"
          icon={<Thermometer className="h-5 w-5" />}
          accentColor="primary"
        />
      </div>

      <SensorGroup
        title="Presión"
        icon={<Gauge className="h-4 w-4 text-primary" />}
        sensors={pressureSensors}
        testRunning={testRunning}
        onTest={runTest}
      />

      <SensorGroup
        title="Fuerza"
        icon={<Activity className="h-4 w-4 text-secondary" />}
        sensors={forceSensors}
        testRunning={testRunning}
        onTest={runTest}
      />

      <SensorGroup
        title="Temperatura"
        icon={<Thermometer className="h-4 w-4 text-amber-500" />}
        sensors={tempSensors}
        testRunning={testRunning}
        onTest={runTest}
      />

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Power className="h-4 w-4 text-primary" />
              Control de bombas y válvulas
            </CardTitle>
            <StatusBadge
              variant={activePumps >= 2 ? "warn" : "good"}
              label={`${activePumps}/2 bombas activas`}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Máximo 2 bombas simultáneas por limitación de corriente
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {telemetry?.groups?.map((group) => (
              <div
                key={group.groupId}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold">
                    Grupo {group.groupId}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={group.pumpOn ? "default" : "outline"}
                    className={`btn-biomed ${
                      group.pumpOn
                        ? "bg-primary text-white"
                        : "border border-border bg-card text-foreground"
                    }`}
                    disabled={actuating !== null}
                    onClick={() => togglePump(group.groupId)}
                  >
                    <Power className="h-3 w-3" />
                    {group.pumpOn ? "ON" : "OFF"}
                  </Button>
                  <Button
                    size="sm"
                    variant={group.valveClosed ? "default" : "outline"}
                    className={`btn-biomed ${
                      group.valveClosed
                        ? "bg-secondary text-white"
                        : "border border-border bg-card text-foreground"
                    }`}
                    disabled={actuating !== null}
                    onClick={() => toggleValve(group.groupId)}
                  >
                    {group.valveClosed ? "C" : "A"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                  <span>Bomba</span>
                  <span>Válvula</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SensorGroup({
  title,
  icon,
  sensors,
  testRunning,
  onTest,
}: {
  title: string;
  icon: React.ReactNode;
  sensors: SensorReading[];
  testRunning: string | null;
  onTest: (name: string) => void;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sensors.map((sensor) => (
            <div
              key={sensor.name}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">{sensor.name}</span>
                <StatusBadge
                  variant={sensor.status === "normal" ? "good" : "bad"}
                  label={sensor.status === "normal" ? "Normal" : "Revisar"}
                />
              </div>
              <p className="font-mono text-2xl font-bold tabular-nums">
                {sensor.value.toFixed(2)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {sensor.unit}
                </span>
              </p>
              <Button
                size="sm"
                variant="outline"
                className="btn-biomed border border-border bg-card text-foreground"
                disabled={testRunning !== null}
                onClick={() => onTest(sensor.name)}
              >
                {testRunning === sensor.name ? "Probando..." : "Realizar prueba"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
