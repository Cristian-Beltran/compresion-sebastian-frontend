import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, SlidersHorizontal } from "lucide-react";

type ConfigRow = { id:string; intensity:"low"|"medium"|"high"; targetPressureKpa:number; inflateTimeSeconds:number; holdTimeSeconds:number; releaseTimeSeconds:number; cycleTarget:number; };
const label = (value: ConfigRow["intensity"]) => value === "low" ? "Intensidad baja" : value === "medium" ? "Intensidad media" : "Intensidad alta";
const message = (error: unknown) => (error as {response?:{data?:{message?:string}}})?.response?.data?.message ?? "No se pudo guardar el perfil";

export function AdminCalibrationPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const load = async () => setConfigs((await axios.get<ConfigRow[]>("/configurations")).data);
  useEffect(() => { void load().catch((error) => toast.error(message(error))); }, []);
  const update = (id:string, key:keyof ConfigRow, value:number) => setConfigs((items) => items.map((item) => item.id === id ? {...item, [key]: value} : item));
  const save = async (item:ConfigRow) => { setSaving(item.id); try { await axios.patch(`/configurations/${item.intensity}`, {targetPressureKpa:item.targetPressureKpa, inflateTimeSeconds:item.inflateTimeSeconds, holdTimeSeconds:item.holdTimeSeconds, releaseTimeSeconds:item.releaseTimeSeconds, cycleTarget:item.cycleTarget}); toast.success(`Perfil ${label(item.intensity)} actualizado`); await load(); } catch (error) { toast.error(message(error)); } finally { setSaving(null); } };
  return <div className="space-y-6"><header><p className="eyebrow text-primary">Configuración clínica</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Perfiles de terapia</h2><p className="mt-1 text-sm text-muted-foreground">Parámetros reutilizables para tratamientos neumáticos secuenciales.</p></header><div className="grid gap-4 lg:grid-cols-3">{configs.map((item) => <Card key={item.id}><CardHeader><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary"/>{label(item.intensity)}</CardTitle></CardHeader><CardContent className="space-y-4"><Field label="Presión objetivo" unit="kPa" value={item.targetPressureKpa} min={1} max={40} step={0.5} onChange={(value) => update(item.id,"targetPressureKpa",value)}/><Field label="Tiempo de inflado" unit="s" value={item.inflateTimeSeconds} min={1} max={60} onChange={(value) => update(item.id,"inflateTimeSeconds",value)}/><Field label="Mantenimiento" unit="s" value={item.holdTimeSeconds} min={1} max={60} onChange={(value) => update(item.id,"holdTimeSeconds",value)}/><Field label="Liberación" unit="s" value={item.releaseTimeSeconds} min={1} max={60} onChange={(value) => update(item.id,"releaseTimeSeconds",value)}/><Field label="Ciclos" unit="" value={item.cycleTarget} min={1} max={100} onChange={(value) => update(item.id,"cycleTarget",value)}/><Button className="w-full" disabled={saving === item.id} onClick={() => void save(item)}><Save className="mr-2 h-4 w-4"/>{saving === item.id ? "Guardando…" : "Guardar perfil"}</Button></CardContent></Card>)}</div></div>;
}
function Field({label,unit,value,min,max,step=1,onChange}:{label:string;unit:string;value:number;min:number;max:number;step?:number;onChange:(value:number)=>void}) { return <label className="grid gap-1 text-sm"><span className="flex justify-between text-muted-foreground"><span>{label}</span><b className="font-mono text-foreground">{value} {unit}</b></span><Input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))}/></label>; }
