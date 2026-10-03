import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gauge, Activity, Thermometer, Power } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useMqttSubscribe, MQTT_TOPICS } from "@/lib/mqtt";
import axios from "@/lib/axios";

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

  const pressureSensors = telemetry?.groups?.map((g) => ({
    name: `P-Z${g.groupId}`,
    value: g.pressureKpa,
    status: g.pressureSensorAvailable !== false ? "normal" : "revisar",
  })) ?? [];

  const forceSensors = telemetry?.groups?.map((g) => ({
    name: `F-Z${g.groupId}`,
    value: g.forceNewtons,
    status: g.forceSensorAvailable !== false ? "normal" : "revisar",
  })) ?? [];

  const tempSensors = [
    {
      name: "T-REG1",
      value: telemetry?.temperature1C ?? 0,
      status: telemetry?.temperature1Valid !== false ? "normal" : "revisar",
    },
    {
      name: "T-REG2",
      value: telemetry?.temperature2C ?? 0,
      status: telemetry?.temperature2Valid !== false ? "normal" : "revisar",
    },
  ];

  const allSensors = [...pressureSensors, ...forceSensors, ...tempSensors];
  const normalCount = allSensors.filter((s) => s.status === "normal").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Diagnóstico y control</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">Sensores y actuadores</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lecturas en tiempo real y control manual de bombas y válvulas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Sensores normales"
          value={String(normalCount)}
          unit={`/ ${allSensors.length}`}
          icon={<Gauge className="h-5 w-5" />}
          accentColor="primary"
        />
        <MetricCard
          label="Presión promedio"
          value={(
            pressureSensors.reduce((acc, s) => acc + s.value, 0) / Math.max(1, pressureSensors.length)
          ).toFixed(1)}
          unit="kPa"
          icon={<Gauge className="h-5 w-5" />}
          accentColor="secondary"
        />
        <MetricCard
          label="Fuerza promedio"
          value={(
            forceSensors.reduce((acc, s) => acc + s.value, 0) / Math.max(1, forceSensors.length)
          ).toFixed(1)}
          unit="N"
          icon={<Activity className="h-5 w-5" />}
          accentColor="accent"
        />
        <MetricCard
          label="Temperatura promedio"
          value={(
            tempSensors.reduce((acc, s) => acc + s.value, 0) / Math.max(1, tempSensors.length)
          ).toFixed(1)}
          unit="°C"
          icon={<Thermometer className="h-5 w-5" />}
          accentColor="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {telemetry?.groups?.map((group) => {
          const pressureSensor = pressureSensors[group.groupId - 1];
          const forceSensor = forceSensors[group.groupId - 1];
          
          return (
            <Card key={group.groupId} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Gauge className="h-4 w-4 text-primary" />
                    Grupo {group.groupId}
                  </CardTitle>
                  <StatusBadge
                    variant={group.pressureSensorAvailable !== false && group.forceSensorAvailable !== false ? "good" : "bad"}
                    label={group.pressureSensorAvailable !== false && group.forceSensorAvailable !== false ? "Operativo" : "Revisar"}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">Presión</span>
                      <StatusBadge
                        variant={pressureSensor.status === "normal" ? "good" : "bad"}
                        label={pressureSensor.status === "normal" ? "Normal" : "Revisar"}
                      />
                    </div>
                    <p className="font-mono text-xl font-bold tabular-nums">
                      {pressureSensor.value.toFixed(2)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">kPa</span>
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 text-xs"
                      disabled={testRunning !== null}
                      onClick={() => runTest(pressureSensor.name)}
                    >
                      {testRunning === pressureSensor.name ? "Probando..." : "Realizar prueba"}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">Fuerza</span>
                      <StatusBadge
                        variant={forceSensor.status === "normal" ? "good" : "bad"}
                        label={forceSensor.status === "normal" ? "Normal" : "Revisar"}
                      />
                    </div>
                    <p className="font-mono text-xl font-bold tabular-nums">
                      {forceSensor.value.toFixed(2)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">N</span>
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 text-xs"
                      disabled={testRunning !== null}
                      onClick={() => runTest(forceSensor.name)}
                    >
                      {testRunning === forceSensor.name ? "Probando..." : "Realizar prueba"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="text-xs font-bold text-muted-foreground mb-2">Control de actuadores</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Button
                        size="sm"
                        variant={group.pumpOn ? "default" : "outline"}
                        className={`w-full ${
                          group.pumpOn
                            ? "bg-primary text-white hover:bg-primary/90"
                            : "border border-border bg-card text-foreground hover:bg-muted"
                        }`}
                        disabled={actuating !== null}
                        onClick={() => togglePump(group.groupId)}
                      >
                        <Power className="h-3 w-3 mr-1" />
                        {group.pumpOn ? "Bomba ON" : "Bomba OFF"}
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground">Bomba</p>
                    </div>
                    <div className="space-y-1">
                      <Button
                        size="sm"
                        variant={group.valveClosed ? "default" : "outline"}
                        className={`w-full ${
                          group.valveClosed
                            ? "bg-secondary text-white hover:bg-secondary/90"
                            : "border border-border bg-card text-foreground hover:bg-muted"
                        }`}
                        disabled={actuating !== null}
                        onClick={() => toggleValve(group.groupId)}
                      >
                        {group.valveClosed ? "Válvula C" : "Válvula A"}
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground">Válvula</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Thermometer className="h-4 w-4 text-amber-500" />
              Sensores de temperatura
            </CardTitle>
            <StatusBadge
              variant={tempSensors.every((s) => s.status === "normal") ? "good" : "warn"}
              label={`${tempSensors.filter((s) => s.status === "normal").length}/${tempSensors.length} normales`}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {tempSensors.map((sensor) => (
              <div
                key={sensor.name}
                className="rounded-lg border border-border/60 bg-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold">{sensor.name}</span>
                  <StatusBadge
                    variant={sensor.status === "normal" ? "good" : "bad"}
                    label={sensor.status === "normal" ? "Normal" : "Revisar"}
                  />
                </div>
                <p className="font-mono text-2xl font-bold tabular-nums">
                  {sensor.value.toFixed(1)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">°C</span>
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-3"
                  disabled={testRunning !== null}
                  onClick={() => runTest(sensor.name)}
                >
                  {testRunning === sensor.name ? "Probando..." : "Realizar prueba"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Estado de bombas activas</p>
              <p className="text-xs text-muted-foreground">
                Máximo 2 bombas simultáneas por limitación de corriente
              </p>
            </div>
            <StatusBadge
              variant={activePumps >= 2 ? "warn" : "good"}
              label={`${activePumps}/2 bombas activas`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
