import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Power, Settings2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useMqttSubscribe, MQTT_TOPICS } from "@/lib/mqtt";
import axios from "@/lib/axios";

type GroupData = { groupId:number; pressureKpa:number; forceNewtons:number; pumpOn:boolean; valveClosed:boolean; pressureSensorAvailable:boolean; forceSensorAvailable:boolean; };
type TelemetryPayload = { treatmentRunning?:boolean; temperatureC?:number; temperature1C?:number; temperature2C?:number; groups?:Partial<GroupData>[] };
const fallback:GroupData[] = [1,2,3,4].map((groupId) => ({groupId,pressureKpa:0,forceNewtons:0,pumpOn:false,valveClosed:false,pressureSensorAvailable:false,forceSensorAvailable:false}));

export function TechnicalSensorsPage() {
  const telemetry = useMqttSubscribe<TelemetryPayload>(MQTT_TOPICS.telemetry);
  const [selected, setSelected] = useState(1);
  const [busy, setBusy] = useState(false);
  const groups = [1,2,3,4].map((id) => ({...fallback[id-1], ...(telemetry?.groups?.find((item) => item.groupId === id) ?? {})}));
  const current = groups[selected-1];
  const blocked = Boolean(telemetry?.treatmentRunning || busy);
  const setActuator = async (patch:Partial<Pick<GroupData,"pumpOn"|"valveClosed">>) => { setBusy(true); try { await axios.post(`/device/groups/${selected}/actuate`, {pumpOn:patch.pumpOn ?? current.pumpOn, valveClosed:patch.valveClosed ?? current.valveClosed, persistent:true}); toast.success("Estado confirmado por el equipo"); } catch { toast.error("No se pudo actualizar el actuador"); } finally { setBusy(false); } };
  return <div className="space-y-6"><header><p className="eyebrow text-primary">Supervisión técnica</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Sensores y control</h2><p className="mt-1 text-sm text-muted-foreground">Las lecturas y el accionamiento del equipo están separados para una operación clara.</p></header>
    <section className="space-y-3"><div><h3 className="font-bold">Sensores</h3><p className="text-sm text-muted-foreground">Valores en tiempo real por zona.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{groups.map((group) => <Card key={group.groupId}><CardHeader className="pb-2"><div className="flex justify-between"><CardTitle className="text-base">Grupo {group.groupId}</CardTitle><StatusBadge variant={group.pressureSensorAvailable && group.forceSensorAvailable ? "good" : "bad"} label={group.pressureSensorAvailable && group.forceSensorAvailable ? "Operativo" : "Sin dato"}/></div></CardHeader><CardContent className="grid grid-cols-2 gap-3"><Reading label="Presión" value={group.pressureKpa} unit="kPa"/><Reading label="Fuerza" value={group.forceNewtons} unit="N"/></CardContent></Card>)}</div><div className="grid gap-3 sm:grid-cols-3"><Reading label="Temperatura 1" value={Number(telemetry?.temperature1C ?? 0)} unit="°C"/><Reading label="Temperatura 2" value={Number(telemetry?.temperature2C ?? 0)} unit="°C"/><Reading label="Promedio térmico" value={Number(telemetry?.temperatureC ?? 0)} unit="°C"/></div></section>
    <section className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><Card><CardHeader><CardTitle>Zona a controlar</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2">{groups.map((group) => <Button key={group.groupId} variant={selected===group.groupId?"default":"outline"} onClick={() => setSelected(group.groupId)}>Grupo {group.groupId}</Button>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary"/>Bombas y válvulas · Grupo {selected}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Cada control es persistente e independiente. Se libera automáticamente ante terapia, parada o desconexión.</p><div className="grid gap-3 sm:grid-cols-2"><Control label="Bomba" enabled={current.pumpOn} disabled={blocked} onClick={() => void setActuator({pumpOn:!current.pumpOn})}/><Control label="Válvula cerrada" enabled={current.valveClosed} disabled={blocked} onClick={() => void setActuator({valveClosed:!current.valveClosed})}/></div>{telemetry?.treatmentRunning && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">El control se bloquea mientras hay una terapia activa.</p>}</CardContent></Card></section>
  </div>;
}
function Reading({label,value,unit}:{label:string;value:number;unit:string}) { return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-mono text-xl font-bold">{Number(value).toFixed(2)} <small className="text-xs text-muted-foreground">{unit}</small></p></div>; }
function Control({label,enabled,disabled,onClick}:{label:string;enabled:boolean;disabled:boolean;onClick:()=>void}) { return <div className="rounded-xl border p-4"><p className="font-bold">{label}</p><p className="mb-3 text-sm text-muted-foreground">{enabled?"Encendido":"Apagado"}</p><Button className="w-full" disabled={disabled} variant={enabled?"destructive":"default"} onClick={onClick}><Power className="mr-2 h-4 w-4"/>{enabled?"Apagar":"Encender"}</Button></div>; }
