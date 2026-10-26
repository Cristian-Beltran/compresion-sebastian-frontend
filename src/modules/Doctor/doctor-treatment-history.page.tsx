import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import axios from "@/lib/axios";
import { TreatmentSessionDetailDialog } from "./treatment-session-detail-dialog";
import type { TreatmentSession } from "./treatment-session-detail-dialog";

const zoneLabels: Record<string, string> = { pantorrilla_izquierda: "Pantorrilla izquierda", pantorrilla_derecha: "Pantorrilla derecha", pie_izquierdo: "Pie izquierdo", pie_derecho: "Pie derecho" };
const statusLabel: Record<string, string> = { running: "En curso", completed: "Completado", interrupted: "Interrumpido", aborted: "Abortado" };

export function DoctorTreatmentHistoryPage() {
  const [items, setItems] = useState<TreatmentSession[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ search: "", status: "all", from: "", to: "" });
  const [detailTreatment, setDetailTreatment] = useState<TreatmentSession | null>(null);

  useEffect(() => { axios.get("/doctor/treatments/history").then((response) => setItems(response.data)); }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const started = new Date(item.startedAt);
    const matchesStatus = applied.status === "all" || item.status === applied.status;
    const matchesFrom = !applied.from || started >= new Date(`${applied.from}T00:00:00`);
    const matchesTo = !applied.to || started <= new Date(`${applied.to}T23:59:59.999`);
    const zones = item.groups?.map((group) => group.zone).join(" ") ?? "";
    const text = `${item.patientName ?? item.patientId ?? ""} ${item.intensity ?? ""} ${item.status} ${zones}`.toLowerCase();
    return matchesStatus && matchesFrom && matchesTo && text.includes(String(applied.search ?? "").toLowerCase());
  }), [items, applied]);

  return <div className="space-y-6">
    <div><p className="eyebrow text-primary">Trazabilidad clínica</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Historial médico</h2><p className="mt-1 text-sm text-muted-foreground">Consulte sesiones, resultados y eventos asociados a cada paciente.</p></div>
    <Card><CardHeader><CardTitle>Historial de sesiones</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="grid gap-2 md:grid-cols-5"><Input placeholder="Buscar por paciente, protocolo o estado" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="h-10 rounded-md border bg-background px-3" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos</option><option value="running">En curso</option><option value="completed">Completado</option><option value="interrupted">Interrumpido</option><option value="aborted">Abortado</option></select><Input type="date" aria-label="Desde" value={from} onChange={(event) => setFrom(event.target.value)} /><Input type="date" aria-label="Hasta" value={to} onChange={(event) => setTo(event.target.value)} /><Button onClick={() => setApplied({ search, status: statusFilter, from, to })}>Filtrar</Button></div>
      <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted/30 text-left"><tr><th className="px-4 py-3 font-semibold">Paciente</th><th className="px-4 py-3 font-semibold">Fecha y hora</th><th className="px-4 py-3 font-semibold">Protocolo</th><th className="px-4 py-3 font-semibold">Zonas</th><th className="px-4 py-3 font-semibold">Duración</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 font-semibold">Reporte</th><th className="px-4 py-3 font-semibold">Acción</th></tr></thead><tbody>
        {filtered.map((item) => <tr key={item.id} className="border-t hover:bg-muted/20"><td className="px-4 py-3 font-medium">{item.sessionType === "manual" ? "Manual · Sin paciente" : (item.patientName ?? item.patientId)}</td><td className="px-4 py-3">{new Date(item.startedAt).toLocaleDateString()}<br /><small className="text-muted-foreground">{new Date(item.startedAt).toLocaleTimeString()}</small></td><td className="px-4 py-3">{(item.intensity ?? "-").toUpperCase()}</td><td className="px-4 py-3">{item.groups?.length ? item.groups.map((group) => zoneLabels[group.zone] ?? `G${group.groupId}`).join(", ") : "-"}</td><td className="px-4 py-3">{item.durationSeconds ?? 0}s</td><td className="px-4 py-3"><span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{statusLabel[item.status] ?? item.status}</span></td><td className="px-4 py-3">{item.medicalReport ? <span className="text-emerald-600">Con reporte</span> : <span className="text-muted-foreground">Sin reporte</span>}</td><td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => setDetailTreatment(item)}>Abrir registro</Button></td></tr>)}
        {!filtered.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No se encontraron tratamientos</td></tr>}
      </tbody></table></div>
    </CardContent></Card>
    <TreatmentSessionDetailDialog open={Boolean(detailTreatment)} onOpenChange={(open) => !open && setDetailTreatment(null)} treatment={detailTreatment} />
  </div>;
}
