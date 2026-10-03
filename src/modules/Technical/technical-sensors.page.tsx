import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gauge, Power } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useMqttSubscribe, MQTT_TOPICS } from "@/lib/mqtt";
import axios from "@/lib/axios";

type GroupData = {
  groupId: number;
  pressureKpa: number;
  forceNewtons: number;
  pumpOn: boolean;
  valveClosed: boolean;
  pressureSensorAvailable: boolean;
  forceSensorAvailable: boolean;
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
};

const GROUP_COLORS = ["#1673c8", "#14a37f", "#f59e0b", "#8b5cf6"];

const defaultGroups: GroupData[] = [1, 2, 3, 4].map((id) => ({
  groupId: id,
  pressureKpa: 0,
  forceNewtons: 0,
  pumpOn: false,
  valveClosed: false,
  pressureSensorAvailable: true,
  forceSensorAvailable: true,
}));

export function TechnicalSensorsPage() {
  const telemetry = useMqttSubscribe<TelemetryPayload>(MQTT_TOPICS.telemetry);
  const [actuating, setActuating] = useState<number | null>(null);

  const groups: GroupData[] = telemetry?.groups?.length
    ? [1, 2, 3, 4].map((id) => {
        const g = telemetry.groups?.find((tg) => tg.groupId === id);
        return g
          ? {
              groupId: g.groupId,
              pressureKpa: g.pressureKpa ?? 0,
              forceNewtons: g.forceNewtons ?? 0,
              pumpOn: g.pumpOn ?? false,
              valveClosed: g.valveClosed ?? false,
              pressureSensorAvailable: g.pressureSensorAvailable !== false,
              forceSensorAvailable: g.forceSensorAvailable !== false,
            }
          : defaultGroups[id - 1];
      })
    : defaultGroups;

  const activePumps = groups.filter((g) => g.pumpOn).length;

  const togglePump = async (groupId: number) => {
    const group = groups.find((g) => g.groupId === groupId);
    if (!group) return;

    const willTurnOn = !group.pumpOn;

    if (willTurnOn && activePumps >= 2) {
      toast.error(
        "No es posible activar más de dos bombas simultáneamente por limitación de corriente del sistema."
      );
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
    const group = groups.find((g) => g.groupId === groupId);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-primary">Supervisión técnica</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            Sensores y actuadores
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lecturas en tiempo real y control manual de bombas y válvulas por grupo.
          </p>
        </div>
        <StatusBadge
          variant={activePumps >= 2 ? "warn" : "good"}
          label={`${activePumps}/2 bombas activas`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Card
            key={group.groupId}
            className="border-border/60"
            style={{ borderTopWidth: "3px", borderTopColor: GROUP_COLORS[group.groupId - 1] }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Gauge className="h-4 w-4 text-primary" />
                  Grupo {group.groupId}
                </CardTitle>
                <StatusBadge
                  variant={
                    group.pressureSensorAvailable && group.forceSensorAvailable
                      ? "good"
                      : "bad"
                  }
                  label={
                    group.pressureSensorAvailable && group.forceSensorAvailable
                      ? "Operativo"
                      : "Revisar"
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/60 bg-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      Presión
                    </span>
                    <StatusBadge
                      variant={group.pressureSensorAvailable ? "good" : "bad"}
                      label={group.pressureSensorAvailable ? "Normal" : "Revisar"}
                    />
                  </div>
                  <p className="font-mono text-xl font-bold tabular-nums">
                    {group.pressureKpa.toFixed(2)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      kPa
                    </span>
                  </p>
                </div>

                <div className="rounded-lg border border-border/60 bg-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      Fuerza
                    </span>
                    <StatusBadge
                      variant={group.forceSensorAvailable ? "good" : "bad"}
                      label={group.forceSensorAvailable ? "Normal" : "Revisar"}
                    />
                  </div>
                  <p className="font-mono text-xl font-bold tabular-nums">
                    {group.forceNewtons.toFixed(2)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">N</span>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-xs font-bold text-muted-foreground mb-2">
                  Control de actuadores
                </p>
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
                    <p className="text-[10px] text-center text-muted-foreground">
                      Bomba
                    </p>
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
                    <p className="text-[10px] text-center text-muted-foreground">
                      Válvula
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
