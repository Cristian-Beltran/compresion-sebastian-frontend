import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Power, Settings2 } from "lucide-react";
import type { DeviceStatus, GroupTelemetry } from "./admin.types";
import { useMqttStatus, useMqttSubscribe, MQTT_TOPICS } from "@/lib/mqtt";
import { StatusBadge } from "@/components/ui/status-badge";

const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
  (error instanceof Error ? error.message : "Operación fallida");

export function AdminControlPage() {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [selectedGroup, setSelectedGroup] = useState(1);
  const [pending, setPending] = useState<string | null>(null);
  const mqttOnline = useMqttStatus();
  const mqttTelemetry = useMqttSubscribe<Record<string, unknown>>(MQTT_TOPICS.telemetry);
  const mqttStatus = useMqttSubscribe<Record<string, unknown>>(MQTT_TOPICS.status);
  const load = async () => setStatus((await axios.get<DeviceStatus>("/device/status")).data);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mqttTelemetry && !mqttStatus) return;
    setStatus((prev) => prev ? {
      ...prev,
      online: Boolean(mqttStatus?.online ?? prev.online),
      connected: Boolean(mqttStatus?.connected ?? prev.connected),
      state: String(mqttStatus?.state ?? prev.state),
      treatmentRunning: Boolean(mqttStatus?.treatmentRunning ?? prev.treatmentRunning),
      temperatureC: mqttTelemetry?.temperatureC != null ? Number(mqttTelemetry.temperatureC) : prev.temperatureC,
      temperature1C: mqttTelemetry?.temperature1C != null ? Number(mqttTelemetry.temperature1C) : prev.temperature1C,
      temperature2C: mqttTelemetry?.temperature2C != null ? Number(mqttTelemetry.temperature2C) : prev.temperature2C,
      groups: (mqttTelemetry?.groups as DeviceStatus["groups"]) ?? prev.groups,
      lastSeenAt: new Date().toISOString(),
    } : prev);
  }, [mqttTelemetry, mqttStatus]);

  const controlsEnabled = Boolean(status?.online && !status.treatmentRunning && !pending);
  const group = status?.groups?.find((item) => item.groupId === selectedGroup);
  const groups = Array.from({ length: 4 }, (_, index) => status?.groups?.find((item) => item.groupId === index + 1));
  const actuate = async (patch: Partial<Pick<GroupTelemetry, "pumpOn" | "valveClosed">>) => {
    if (!group) return;
    const label = patch.pumpOn !== undefined ? "Bomba" : "Válvula";
    setPending(label);
    try {
      await axios.post(`/device/groups/${selectedGroup}/actuate`, {
        pumpOn: patch.pumpOn ?? Boolean(group.pumpOn),
        valveClosed: patch.valveClosed ?? Boolean(group.valveClosed),
        persistent: true,
      });
      toast.success(`${label} actualizada en grupo ${selectedGroup}`);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="eyebrow text-primary">Supervisión técnica</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Sensores y control</h2><p className="mt-1 text-sm text-muted-foreground">Lecturas del equipo y accionamiento persistente por zona.</p></div>
      <div className="flex flex-wrap gap-2"><StatusBadge variant={mqttOnline ? "good" : "bad"} label={mqttOnline ? "MQTT conectado" : "MQTT offline"}/><StatusBadge variant={status?.online ? "good" : "bad"} label={status?.online ? "Equipo conectado" : "Equipo sin conexión"}/>{status?.treatmentRunning && <StatusBadge variant="bad" label="Terapia activa"/>}</div>
    </header>

    <section className="space-y-3"><div><h3 className="font-bold">Sensores</h3><p className="text-sm text-muted-foreground">Lectura en vivo, sin accionamiento.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{groups.map((item, index) => <SensorCard key={index} groupId={index + 1} group={item}/>)}</div>
      <Card><CardContent className="grid gap-3 pt-6 sm:grid-cols-3"><Metric label="Temperatura 1" value={status?.temperature1C} unit="°C"/><Metric label="Temperatura 2" value={status?.temperature2C} unit="°C"/><Metric label="Promedio" value={status?.temperatureC} unit="°C"/></CardContent></Card>
    </section>

    <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <Card><CardHeader><CardTitle className="text-base">Seleccionar zona</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2">{groups.map((item, index) => <Button key={index} variant={selectedGroup === index + 1 ? "default" : "outline"} onClick={() => setSelectedGroup(index + 1)}>Grupo {index + 1}{item?.active ? " · Activo" : ""}</Button>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4 text-primary"/>Accionamiento persistente · Grupo {selectedGroup}</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Bomba y válvula se controlan por separado. El equipo los apaga ante parada, inicio de terapia o pérdida de conexión.</p>
        <div className="grid gap-3 sm:grid-cols-2"><ActuatorControl label="Bomba" enabled={Boolean(group?.pumpOn)} disabled={!controlsEnabled} onChange={(enabled) => void actuate({pumpOn: enabled})}/><ActuatorControl label="Válvula cerrada" enabled={Boolean(group?.valveClosed)} disabled={!controlsEnabled} onChange={(enabled) => void actuate({valveClosed: enabled})}/></div>
        {!controlsEnabled && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{!status?.online ? "Conecte el equipo para continuar." : "El control queda bloqueado mientras hay una terapia activa."}</p>}
        <Button variant="destructive" disabled={!status?.online || pending !== null} onClick={async () => { setPending("Parada"); try { await axios.post("/device/emergency-stop"); toast.success("Parada global confirmada"); await load(); } catch (error) { toast.error(errorMessage(error)); } finally { setPending(null); } }}><Power className="mr-2 h-4 w-4"/>Parada global</Button>
      </CardContent></Card>
    </section>
  </div>;
}

function SensorCard({groupId, group}: {groupId:number; group?:GroupTelemetry}) { return <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Zona {groupId}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p className="text-2xl font-bold">{Number(group?.pressureKpa ?? 0).toFixed(2)} <small className="text-xs text-muted-foreground">kPa</small></p><p>Fuerza: <b>{Number(group?.forceNewtons ?? 0).toFixed(2)} N</b></p><p className="text-xs text-muted-foreground">Sensor de presión {group?.pressureSensorAvailable ? "disponible" : "sin dato"}</p></CardContent></Card>; }
function Metric({label, value, unit}:{label:string; value?:number|null; unit:string}) { return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold">{value == null ? "—" : Number(value).toFixed(1)} {unit}</p></div>; }
function ActuatorControl({label, enabled, disabled, onChange}:{label:string; enabled:boolean; disabled:boolean; onChange:(value:boolean)=>void}) { return <div className="rounded-xl border p-4"><p className="font-bold">{label}</p><p className="mb-3 text-sm text-muted-foreground">{enabled ? "Encendido" : "Apagado"}</p><Button className="w-full" variant={enabled ? "destructive" : "default"} disabled={disabled} onClick={() => onChange(!enabled)}>{enabled ? "Apagar" : "Encender"}</Button></div>; }
