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
  intensity?: string;
  inflateTimeSeconds?: number;
  holdTimeSeconds?: number;
  releaseTimeSeconds?: number;
};

export type TreatmentSession = {
  id: string;
  patientId?: string | null;
  patientName?: string;
  responsibleName?: string | null;
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
type PatientDetails = { id: string; fullname?: string; age?: number; sex?: string; document?: string; phone?: string; diagnosis?: string; mobilityLevel?: string };
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
const statusLabel: Record<string, string> = { starting: "Preparando equipo", completed: "Completado", interrupted: "Interrumpido", running: "En curso", aborted: "Abortado" };

export function TreatmentSessionDetailDialog({ open, onOpenChange, treatment, patientName }: Props) {
  const [readings, setReadings] = useState<TelemetryPoint[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [patient, setPatient] = useState<PatientDetails | null>(null);

  useEffect(() => {
    if (!open || !treatment) return;
    setLoadingReadings(true);
    axios.get(`/doctor/treatments/${treatment.id}/telemetry`)
      .then((response) => setReadings(response.data))
      .catch(() => setReadings([]))
      .finally(() => setLoadingReadings(false));
  }, [open, treatment?.id]);

  useEffect(() => {
    if (!open || !treatment?.patientId) { setPatient(null); return; }
    axios.get<PatientDetails[]>("/doctor/patients")
      .then((response) => setPatient(response.data.find((item) => item.id === treatment.patientId) ?? null))
      .catch(() => setPatient(null));
  }, [open, treatment?.patientId]);

  const readingsByGroup = useMemo(() => {
    const grouped = new Map<number, TelemetryPoint[]>();
    readings.forEach((point) => grouped.set(point.groupId, [...(grouped.get(point.groupId) ?? []), point]));
    return grouped;
  }, [readings]);

  if (!treatment) return null;
  const groups = treatment.groups ?? [];
  const displayName = treatment.sessionType === "manual" ? "Manual · Sin paciente asociado" : (treatment.patientName ?? patientName ?? treatment.patientId ?? "Paciente");
  const downloadExcel = () => void downloadExcelReport({ filename: `sesion-${treatment.id}`, title: "Reporte de sesión clínica", subtitle: displayName, section: "Telemetría registrada cada 2 segundos", filters: `Fecha: ${new Date(treatment.startedAt).toLocaleString()} · Estado: ${statusLabel[treatment.status] ?? treatment.status} · Protocolo: ${(treatment.intensity ?? "—").toUpperCase()}`, columns: [{ header: "Fecha y hora", key: "time", width: 22 }, { header: "Grupo", key: "group" }, { header: "Zona", key: "zone", width: 24 }, { header: "Presión (kPa)", key: "pressure" }, { header: "Fuerza (N)", key: "force" }], rows: readings.map((point) => ({ time: new Date(point.recordedAt).toLocaleString(), group: point.groupId, zone: zoneLabels[groups.find((group) => group.groupId === point.groupId)?.zone ?? ""] ?? `Grupo ${point.groupId}`, pressure: point.pressureKpa, force: point.forceNewtons })) });
  const downloadPdf = () => { const started = new Date(treatment.startedAt); const duration = Math.max(0, Math.round((treatment.durationSeconds ?? 0) / 60)); const sessionRows = [{ field: "Paciente", information: displayName }, { field: "CI", information: patient?.document ?? "No registrado" }, { field: "Edad / sexo", information: patient ? `${patient.age ?? "—"} años · ${patient.sex ?? "—"}` : "No registrado" }, { field: "Teléfono", information: patient?.phone ?? "No registrado" }, { field: "Diagnóstico", information: patient?.diagnosis ?? "No registrado" }, { field: "Movilidad", information: patient?.mobilityLevel ?? "No registrado" }, { field: "Responsable", information: treatment.responsibleName ?? "No registrado" }, { field: "Fecha y hora", information: started.toLocaleString() }, { field: "Duración", information: `${duration} min` }, { field: "Estado final", information: statusLabel[treatment.status] ?? treatment.status }, { field: "Interrupciones", information: treatment.status === "interrupted" ? "1 manual" : "0" }, { field: "Protocolo general", information: groups.length > 1 ? "Configuración mixta" : (treatment.intensity ?? "—").toUpperCase() }, { field: "Presión general", information: "Definida por zona" }, { field: "Ciclos", information: String(treatment.cycleCount) }, { field: "Zonas utilizadas", information: String(groups.length) }, { field: "Reporte clínico", information: treatment.medicalReport ?? "Sin reporte clínico registrado" }]; const parameterRows = groups.map((group) => ({ zone: zoneLabels[group.zone] ?? `Grupo ${group.groupId}`, protocol: group.intensity ?? treatment.intensity ?? "—", pressure: `${group.targetPressureKpa} kPa`, timing: `${group.inflateTimeSeconds ?? "—"}s / ${group.holdTimeSeconds ?? "—"}s / ${group.releaseTimeSeconds ?? "—"}s`, cycles: `${group.cycleCount ?? 0}/${group.cycleTarget}`, readings: String((readingsByGroup.get(group.groupId) ?? []).length) })); downloadPdfReport({ filename: `sesion-${treatment.id}`, title: "Registro de terapia", subtitle: `${displayName} · ${started.toLocaleString()}`, section: "Datos de la sesión", metadataFill: "FFFFFF", metadata: [["Paciente", displayName], ["Fecha de sesión", started.toLocaleDateString()], ["Hora", started.toLocaleTimeString()], ["Responsable", treatment.responsibleName ?? "No registrado"], ["Estado", statusLabel[treatment.status] ?? treatment.status], ["Generado", new Date().toLocaleString()]], columns: [{ header: "Campo", key: "field", width: 28 }, { header: "Información", key: "information", width: 90 }], rows: sessionRows, sections: [{ title: "Parámetros configurados por zona", columns: [{ header: "Zona", key: "zone" }, { header: "Protocolo", key: "protocol" }, { header: "Presión objetivo", key: "pressure" }, { header: "Tiempos I/S/L", key: "timing" }, { header: "Ciclos", key: "cycles" }, { header: "Lecturas", key: "readings" }], rows: parameterRows }], charts: groups.map((group) => ({ title: `${zoneLabels[group.zone] ?? `Grupo ${group.groupId}`} · presión y fuerza`, points: (readingsByGroup.get(group.groupId) ?? []).map((point) => ({ time: new Date(point.recordedAt).toLocaleTimeString(), pressure: point.pressureKpa, force: point.forceNewtons })) })) }); };

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
