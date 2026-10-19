import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import axios from "@/lib/axios";
import { downloadExcelReport, downloadPdfReport } from "@/lib/reports";

export type TreatmentGroup = {
  groupId: number;
  zone: string;
  targetPressureKpa: number;
  cycleTarget: number;
  cycleCount?: number;
};

export type TreatmentSession = {
  id: string;
  patientId?: string | null;
  patientName?: string;
  sessionType?: "patient" | "manual";
  intensity?: string;
  status: string;
  cycleCount: number;
  cycleTarget?: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds?: number;
  medicalReport?: string | null;
  groups?: TreatmentGroup[] | null;
};

type TelemetryPoint = { groupId: number; pressureKpa: number; forceNewtons: number; recordedAt: string };
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatment: TreatmentSession | null;
  patientName?: string;
};

const zoneLabels: Record<string, string> = {
  pantorrilla_izquierda: "Pantorrilla izquierda",
  pantorrilla_derecha: "Pantorrilla derecha",
  pie_izquierdo: "Pie izquierdo",
  pie_derecho: "Pie derecho",
};
const statusLabel: Record<string, string> = { completed: "Completado", interrupted: "Interrumpido", running: "En curso", aborted: "Abortado" };

export function TreatmentSessionDetailDialog({ open, onOpenChange, treatment, patientName }: Props) {
  const [readings, setReadings] = useState<TelemetryPoint[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(false);

  useEffect(() => {
    if (!open || !treatment) return;
    setLoadingReadings(true);
    axios.get(`/doctor/treatments/${treatment.id}/telemetry`)
      .then((response) => setReadings(response.data))
      .catch(() => setReadings([]))
      .finally(() => setLoadingReadings(false));
  }, [open, treatment?.id]);

  const readingsByGroup = useMemo(() => {
    const grouped = new Map<number, TelemetryPoint[]>();
    readings.forEach((point) => grouped.set(point.groupId, [...(grouped.get(point.groupId) ?? []), point]));
    return grouped;
  }, [readings]);

  if (!treatment) return null;
  const groups = treatment.groups ?? [];
  const displayName = treatment.sessionType === "manual" ? "Manual · Sin paciente asociado" : (treatment.patientName ?? patientName ?? treatment.patientId ?? "Paciente");
  const detailRows = groups.map((group) => {
    const points = readingsByGroup.get(group.groupId) ?? [];
    const pressures = points.map((point) => point.pressureKpa);
    const forces = points.map((point) => point.forceNewtons);
    const average = (items: number[]) => items.length ? (items.reduce((sum, item) => sum + item, 0) / items.length).toFixed(2) : "—";
    return { zone: zoneLabels[group.zone] ?? `Grupo ${group.groupId}`, target: `${group.targetPressureKpa} kPa`, cycles: `${group.cycleCount ?? 0}/${group.cycleTarget}`, pressure: points.length ? `${Math.min(...pressures).toFixed(2)} – ${Math.max(...pressures).toFixed(2)} · prom. ${average(pressures)} kPa` : "Sin lecturas", force: points.length ? `${Math.min(...forces).toFixed(2)} – ${Math.max(...forces).toFixed(2)} · prom. ${average(forces)} N` : "Sin lecturas" };
  });
  const downloadExcel = () => void downloadExcelReport({ filename: `sesion-${treatment.id}`, title: "Reporte de sesión clínica", subtitle: displayName, section: "Telemetría registrada cada 2 segundos", filters: `Fecha: ${new Date(treatment.startedAt).toLocaleString()} · Estado: ${statusLabel[treatment.status] ?? treatment.status} · Protocolo: ${(treatment.intensity ?? "—").toUpperCase()}`, columns: [{ header: "Fecha y hora", key: "time", width: 22 }, { header: "Grupo", key: "group" }, { header: "Zona", key: "zone", width: 24 }, { header: "Presión (kPa)", key: "pressure" }, { header: "Fuerza (N)", key: "force" }], rows: readings.map((point) => ({ time: new Date(point.recordedAt).toLocaleString(), group: point.groupId, zone: zoneLabels[groups.find((group) => group.groupId === point.groupId)?.zone ?? ""] ?? `Grupo ${point.groupId}`, pressure: point.pressureKpa, force: point.forceNewtons })) });
  const downloadPdf = () => downloadPdfReport({ filename: `sesion-${treatment.id}`, title: "Reporte de sesión clínica", subtitle: displayName, section: "Resumen por zona", filters: `Fecha: ${new Date(treatment.startedAt).toLocaleString()} · ${statusLabel[treatment.status] ?? treatment.status} · Duración: ${treatment.durationSeconds ?? 0}s · Ciclos: ${treatment.cycleCount}/${treatment.cycleTarget ?? "—"} · Reporte: ${treatment.medicalReport ?? "Sin registro"}`, columns: [{ header: "Zona", key: "zone" }, { header: "Presión objetivo", key: "target" }, { header: "Ciclos", key: "cycles" }, { header: "Presión registrada", key: "pressure", width: 38 }, { header: "Fuerza registrada", key: "force", width: 38 }], rows: detailRows });

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Sesión · {displayName}</DialogTitle>
        <DialogDescription>{new Date(treatment.startedAt).toLocaleDateString()} a las {new Date(treatment.startedAt).toLocaleTimeString()}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pb-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardContent className="space-y-2 pt-4 text-sm">
            <Row label="Duración" value={`${treatment.durationSeconds ?? 0}s`} />
            <Row label="Zonas utilizadas" value={String(groups.length || 1)} />
            <Row label="Estado" value={statusLabel[treatment.status] ?? treatment.status} />
            <Row label="Ciclos" value={`${treatment.cycleCount} / ${treatment.cycleTarget ?? "-"}`} />
          </CardContent></Card>
          <Card><CardContent className="space-y-2 pt-4 text-sm">
            <Row label="Protocolo" value={(treatment.intensity ?? "-").toUpperCase()} />
            <Row label="Reporte médico" value={treatment.medicalReport ? "Con reporte" : "Sin reporte"} />
            {groups.map((group) => <Row key={group.groupId} label={zoneLabels[group.zone] ?? `Grupo ${group.groupId}`} value={`${group.targetPressureKpa} kPa`} />)}
          </CardContent></Card>
        </div>
        <Card className="border-primary/30 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-sm">Registro médico con seguimiento clínico</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{treatment.medicalReport ?? "No se registró una observación clínica para esta sesión."}</p></CardContent></Card>
        {groups.map((group) => {
          const data = (readingsByGroup.get(group.groupId) ?? []).map((point) => ({ ...point, time: new Date(point.recordedAt).toLocaleTimeString() }));
          return <Card key={group.groupId}><CardHeader className="pb-2"><CardTitle className="text-sm">{zoneLabels[group.zone] ?? `Grupo ${group.groupId}`} · presión y fuerza en el tiempo</CardTitle></CardHeader><CardContent className="h-56">
            {loadingReadings ? <p className="pt-20 text-center text-sm text-muted-foreground">Cargando lecturas…</p> : data.length === 0 ? <p className="pt-20 text-center text-sm text-muted-foreground">Esta sesión no cuenta con telemetría histórica.</p> : <ResponsiveContainer width="100%" height="100%"><LineChart data={data}><XAxis dataKey="time" minTickGap={32} fontSize={11} /><YAxis yAxisId="pressure" unit=" kPa" fontSize={11} /><YAxis yAxisId="force" orientation="right" unit=" N" fontSize={11} /><Tooltip /><Line yAxisId="pressure" type="monotone" dataKey="pressureKpa" name="Presión" stroke="#1673c8" strokeWidth={2} dot={false} /><Line yAxisId="force" type="monotone" dataKey="forceNewtons" name="Fuerza" stroke="#e85b63" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>}
          </CardContent></Card>;
        })}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={downloadExcel}>Descargar Excel</Button><Button onClick={downloadPdf}>Descargar PDF</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}
