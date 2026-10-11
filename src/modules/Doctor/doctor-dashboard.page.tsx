import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, CalendarDays, Clock3, Users } from "lucide-react";
import axios from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

const statusMeta = (state?: string, running?: boolean) => {
  if (!running) return {label:"Equipo disponible", variant:"good" as const};
  const labels: Record<string,string> = {INFLA:"Inflando", MANTIENE:"Manteniendo", DESINFLA:"Desinflando", PAUSADA:"Terapia pausada", ERROR:"Error del equipo"};
  return {label:labels[String(state ?? "").toUpperCase()] ?? "Terapia en curso", variant:String(state).toUpperCase() === "ERROR" ? "bad" as const : "info" as const};
};
const date = (value?: string) => value ? new Date(value).toLocaleString("es-BO", {dateStyle:"medium", timeStyle:"short"}) : "Sin registros";

export function DoctorDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const load = async () => setSummary((await axios.get("/doctor/dashboard/summary")).data);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 5000); return () => clearInterval(timer); }, []);
  const state = statusMeta(summary?.mqtt?.state, summary?.mqtt?.treatmentRunning);
  const last = summary?.lastTreatment;
  return <div className="space-y-6">
    <header><p className="eyebrow text-primary">Panel clínico</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Resumen de atención</h2><p className="mt-1 text-sm text-muted-foreground">Información clínica y trazabilidad de terapias VenoFlow.</p></header>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Estado del equipo</CardTitle></CardHeader><CardContent><StatusBadge variant={state.variant} label={state.label}/></CardContent></Card><Metric title="Pacientes registrados" value={summary?.patientsCount ?? 0} icon={<Users className="h-5 w-5"/>}/><Metric title="Tratamientos de hoy" value={summary?.treatmentsToday ?? 0} icon={<CalendarDays className="h-5 w-5"/>}/><Metric title="Tratamientos esta semana" value={summary?.treatmentsThisWeek ?? 0} icon={<Activity className="h-5 w-5"/>}/></div>
    <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4 text-primary"/>Último tratamiento</CardTitle></CardHeader><CardContent>{last ? <div className="space-y-2"><p className="font-bold">{last.sessionType === "manual" ? "Manual · Sin paciente asociado" : last.patientName}</p><p className="text-sm text-muted-foreground">{date(last.startedAt)}</p><StatusBadge variant="info" label={String(last.status ?? "").toUpperCase()}/></div> : <p className="text-sm text-muted-foreground">Aún no hay tratamientos registrados.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Terapia activa</CardTitle></CardHeader><CardContent>{summary?.activeTreatment ? <div className="space-y-2"><p className="font-bold">{summary.activeTreatment.sessionType === "manual" ? "Manual · Sin paciente asociado" : summary.activeTreatment.patientName}</p><p className="text-sm text-muted-foreground">Inicio: {date(summary.activeTreatment.startedAt)}</p><StatusBadge variant="info" label={`${summary.activeTreatment.groups?.length ?? 0} zonas configuradas`}/></div> : <p className="text-sm text-muted-foreground">No hay terapia activa.</p>}</CardContent></Card></div>
    <div className="grid gap-4 lg:grid-cols-2"><List title="Últimos pacientes registrados" empty="No hay pacientes registrados." items={summary?.latestPatients} render={(item:any) => <><p className="font-bold">{item.fullname ?? item.user?.fullname}</p><p className="text-xs text-muted-foreground">Registro clínico activo</p></>}/><List title="Últimos tratamientos" empty="No hay tratamientos registrados." items={summary?.latestTreatments} render={(item:any) => <><p className="font-bold">{item.sessionType === "manual" ? "Manual · Sin paciente asociado" : item.patientName}</p><p className="text-xs text-muted-foreground">{date(item.startedAt)} · {String(item.status).toUpperCase()}</p></>}/></div>
  </div>;
}
function Metric({title,value,icon}:{title:string;value:number;icon:ReactNode}) { return <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{title}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{value}</p></CardContent></Card>; }
function List({title,empty,items,render}:{title:string;empty:string;items?:any[];render:(item:any)=>ReactNode}) { return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="space-y-2">{items?.length ? items.map((item:any) => <div className="rounded-lg border p-3 text-sm" key={item.id}>{render(item)}</div>) : <p className="text-sm text-muted-foreground">{empty}</p>}</CardContent></Card>; }
