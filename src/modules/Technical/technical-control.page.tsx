import { useEffect, useRef, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Hand,
  Play,
  Power,
  ShieldAlert,
  Square,
  Wrench,
} from "lucide-react";
import type { DeviceStatus, GroupTelemetry } from "../Admin/admin.types";
import { useMqttStatus, useMqttSubscribe, MQTT_TOPICS } from "@/lib/mqtt";
import { StatusBadge } from "@/components/ui/status-badge";
import { GroupOrb } from "@/components/ui/group-orb";

const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
  (error instanceof Error ? error.message : "Operacion fallida");

export function TechnicalControlPage() {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [selectedGroup, setSelectedGroup] = useState(1);
  const [pulseMs, setPulseMs] = useState(500);
  const [pending, setPending] = useState<string | null>(null);
  const leaseTimer = useRef<number | null>(null);
  const holding = useRef(false);
  const mqttOnline = useMqttStatus();
  const mqttTelemetry = useMqttSubscribe<Record<string, unknown>>(MQTT_TOPICS.telemetry);
  const mqttStatus = useMqttSubscribe<Record<string, unknown>>(MQTT_TOPICS.status);

  const load = async () => {
    const response = await axios.get<DeviceStatus>("/device/status");
    setStatus(response.data);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      window.clearInterval(timer);
      if (leaseTimer.current) window.clearInterval(leaseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!mqttTelemetry || !mqttStatus) return;
    setStatus((prev) => prev ? {
      ...prev,
      online: Boolean(mqttStatus.online),
      connected: Boolean(mqttStatus.connected),
      state: String(mqttStatus.state ?? prev.state),
      treatmentRunning: Boolean(mqttStatus.treatmentRunning),
      maintenanceMode: Boolean(mqttStatus.maintenanceMode ?? prev.maintenanceMode),
      activeMask: Number(mqttStatus.activeMask ?? prev.activeMask),
      treatmentId: String(mqttStatus.treatmentId ?? prev.treatmentId ?? ""),
      temperatureC: mqttTelemetry.temperatureC != null ? Number(mqttTelemetry.temperatureC) : prev.temperatureC,
      temperature1C: mqttTelemetry.temperature1C != null ? Number(mqttTelemetry.temperature1C) : prev.temperature1C,
      temperature2C: mqttTelemetry.temperature2C != null ? Number(mqttTelemetry.temperature2C) : prev.temperature2C,
      fanPowerPercent: mqttTelemetry.fanPowerPercent != null ? Number(mqttTelemetry.fanPowerPercent) : prev.fanPowerPercent,
      wifiRssi: mqttTelemetry.wifiRssi != null ? Number(mqttTelemetry.wifiRssi) : prev.wifiRssi,
      groups: (mqttTelemetry.groups as DeviceStatus["groups"]) ?? prev.groups,
      lastSeenAt: new Date().toISOString(),
    } : prev);
  }, [mqttTelemetry, mqttStatus]);

  const command = async (label: string, action: () => Promise<unknown>) => {
    setPending(label);
    try {
      await action();
      toast.success(`${label}: confirmado por el ESP32`);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const actuate = async (
    payload: { pumpOn: boolean; valveClosed: boolean; durationMs: number },
    silent = false,
  ) => {
    try {
      await axios.post(`/device/groups/${selectedGroup}/actuate`, payload);
      if (!silent) toast.success(`Pulso confirmado en grupo ${selectedGroup}`);
    } catch (error) {
      if (!silent) toast.error(errorMessage(error));
      stopHold(false);
    }
  };

  const startHold = (pumpOn: boolean, valveClosed: boolean) => {
    if (!controlsEnabled || holding.current) return;
    holding.current = true;
    const renew = () => void actuate({ pumpOn, valveClosed, durationMs: 1000 }, true);
    renew();
    leaseTimer.current = window.setInterval(renew, 600);
  };

  const stopHold = (sendSafe = true) => {
    holding.current = false;
    if (leaseTimer.current) window.clearInterval(leaseTimer.current);
    leaseTimer.current = null;
    if (sendSafe && status?.maintenanceMode) {
      void actuate({ pumpOn: false, valveClosed: false, durationMs: 100 }, true);
    }
  };

  const controlsEnabled = Boolean(
    status?.online && status.maintenanceMode && !status.treatmentRunning,
  );
  const groups = Array.from({ length: 4 }, (_, index) =>
    status?.groups?.find((group) => group.groupId === index + 1),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow text-primary">Mantenimiento técnico</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            Control técnico
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pruebas manuales de actuadores exclusivamente para mantenimiento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            variant={mqttOnline ? "good" : "bad"}
            label={mqttOnline ? "MQTT conectado" : "MQTT offline"}
          />
          <StatusBadge
            variant={status?.online ? "good" : "bad"}
            label={status?.online ? "ESP32 online" : "ESP32 offline"}
          />
          <StatusBadge
            variant={status?.maintenanceMode ? "warn" : "neutral"}
            label={status?.maintenanceMode ? "Mantenimiento activo" : "Modo normal"}
          />
          {status?.treatmentRunning && (
            <StatusBadge variant="bad" label="Sesion activa" />
          )}
        </div>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold">Interbloqueo de seguridad</p>
              <p className="text-sm text-muted-foreground">
                El control manual se bloquea durante tratamientos y se libera automaticamente tras cinco minutos.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!status?.maintenanceMode ? (
              <Button
                className="btn-biomed bg-primary text-white"
                disabled={!status?.online || status?.treatmentRunning || pending !== null}
                onClick={() => void command("Modo mantenimiento", () => axios.post("/device/maintenance/enter"))}
              >
                <Wrench className="h-4 w-4" /> Activar mantenimiento
              </Button>
            ) : (
              <Button
                className="btn-biomed border border-border bg-card text-foreground"
                variant="outline"
                disabled={pending !== null}
                onClick={() => void command("Salida de mantenimiento", () => axios.post("/device/maintenance/exit"))}
              >
                Finalizar mantenimiento
              </Button>
            )}
            <Button
              className="btn-biomed bg-destructive text-white"
              variant="destructive"
              disabled={!status?.brokerConnected || pending !== null}
              onClick={() => void command("Parada de emergencia", () => axios.post("/device/emergency-stop"))}
            >
              <Power className="h-4 w-4" /> Parada global
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {groups.map((group, index) => (
          <GroupSelector
            key={index}
            groupId={index + 1}
            group={group}
            selected={selectedGroup === index + 1}
            onClick={() => setSelectedGroup(index + 1)}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Hand className="h-5 w-5 text-primary" />
              Accionamiento · Grupo {selectedGroup}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                className="btn-biomed h-24 select-none flex-col gap-2 bg-primary text-white"
                disabled={!controlsEnabled}
                onPointerDown={() => startHold(true, true)}
                onPointerUp={() => stopHold()}
                onPointerCancel={() => stopHold()}
                onPointerLeave={() => stopHold()}
              >
                <Play className="h-5 w-5" /> Mantener para inflar
                <span className="text-xs font-normal opacity-75">Lease renovable de 1 segundo</span>
              </Button>
              <Button
                className="btn-biomed h-24 select-none flex-col gap-2 bg-secondary text-white"
                variant="secondary"
                disabled={!controlsEnabled}
                onPointerDown={() => startHold(false, true)}
                onPointerUp={() => stopHold()}
                onPointerCancel={() => stopHold()}
                onPointerLeave={() => stopHold()}
              >
                <Square className="h-5 w-5" /> Mantener valvula cerrada
                <span className="text-xs font-normal opacity-75">Sin encender la bomba</span>
              </Button>
            </div>

            <div className="rounded-xl border border-border/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-bold">Pulso temporizado</p>
                  <p className="text-xs text-muted-foreground">El ESP libera los actuadores al terminar.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-24 font-mono"
                    type="number"
                    min={100}
                    max={5000}
                    value={pulseMs}
                    onChange={(event) => setPulseMs(Math.min(5000, Math.max(100, Number(event.target.value))))}
                  />
                  <span className="text-sm text-muted-foreground">ms</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[250, 500, 1000].map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    className="btn-biomed border border-border bg-card text-foreground"
                    variant="outline"
                    onClick={() => setPulseMs(value)}
                  >
                    {value} ms
                  </Button>
                ))}
                <Button
                  className="btn-biomed bg-primary text-white"
                  disabled={!controlsEnabled}
                  onClick={() => void actuate({ pumpOn: true, valveClosed: true, durationMs: pulseMs })}
                >
                  Ejecutar pulso
                </Button>
                <Button
                  className="btn-biomed border border-border bg-card text-foreground"
                  variant="outline"
                  disabled={!controlsEnabled}
                  onClick={() => void actuate({ pumpOn: false, valveClosed: false, durationMs: 100 })}
                >
                  Liberar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">Diagnostico y respuesta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="btn-biomed w-full border border-border bg-card text-foreground"
              variant="outline"
              disabled={!controlsEnabled || pending !== null}
              onClick={() => void command(`Diagnostico del grupo ${selectedGroup}`, () => axios.post(`/device/groups/${selectedGroup}/diagnostic`))}
            >
              <ActivityIcon /> Ejecutar prueba automatica
            </Button>
            <div className="rounded-xl border border-border/60 p-4 text-sm">
              <p className="mb-3 font-bold">Ultima confirmacion</p>
              {status?.lastAck ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-accent">
                    <CheckCircle2 className="h-4 w-4" />
                    {String(status.lastAck.command ?? "Comando")}
                  </p>
                  <p className="text-muted-foreground">
                    Resultado: {String(status.lastAck.result ?? "-")}
                  </p>
                  <p className="break-all font-mono text-[11px] text-muted-foreground">
                    {String(status.lastAck.requestId ?? "Sin requestId")}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">Aun no se recibio ningun ACK.</p>
              )}
            </div>
            {!controlsEnabled && (
              <div className="flex gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                {!status?.online
                  ? "Conecte el ESP32 para continuar."
                  : status.treatmentRunning
                    ? "Finalice la sesion clinica antes del mantenimiento."
                    : "Active el modo mantenimiento."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GroupSelector({ groupId, group, selected, onClick }: { groupId: number; group?: GroupTelemetry; selected: boolean; onClick: () => void }) {
  const borderColors = ["#1673c8", "#14a37f", "#f59e0b", "#8b5cf6"];
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border/60 bg-card hover:border-primary/40"
      }`}
      style={{ borderTopWidth: "3px", borderTopColor: borderColors[groupId - 1] }}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold">Grupo {groupId}</span>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            group?.pressureSensorAvailable ? "bg-accent" : "bg-destructive"
          }`}
        />
      </div>
      <div className="mt-3 flex justify-center">
        <GroupOrb
          pressure={group?.pressureKpa ?? 0}
          targetPressure={group?.targetPressureKpa ?? 0}
          state={group?.state ?? ""}
          size="sm"
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Gauge className="h-3 w-3" />
          {Number(group?.pressureKpa ?? 0).toFixed(2)} kPa
        </span>
        <span>{Number(group?.forceNewtons ?? 0).toFixed(2)} N</span>
        <span>Bomba {group?.pumpOn ? "ON" : "OFF"}</span>
        <span>Valvula {group?.valveClosed ? "C" : "A"}</span>
      </div>
    </button>
  );
}

function ActivityIcon() {
  return (
    <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}
