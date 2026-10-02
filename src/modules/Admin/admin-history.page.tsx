import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FlaskConical, History, ListFilter } from "lucide-react";
import type { Calibration, SystemLog, TreatmentHistory } from "./admin.types";

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export function AdminHistoryPage() {
  const [events, setEvents] = useState<Paged<SystemLog>>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [sessions, setSessions] = useState<TreatmentHistory[]>([]);
  const [calibrations, setCalibrations] = useState<Paged<Calibration>>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("all");
  const [groupId, setGroupId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventPage, setEventPage] = useState(1);
  const [calibrationPage, setCalibrationPage] = useState(1);

  const loadEvents = useCallback(async () => {
    const params = new URLSearchParams({ page: String(eventPage), pageSize: "20" });
    if (query) params.set("search", query);
    if (level !== "all") params.set("level", level);
    if (category !== "all") params.set("category", category);
    if (groupId !== "all") params.set("groupId", groupId);
    if (dateFrom) params.set("dateFrom", new Date(`${dateFrom}T00:00:00`).toISOString());
    if (dateTo) params.set("dateTo", new Date(`${dateTo}T23:59:59`).toISOString());
    const response = await axios.get<Paged<SystemLog>>(`/logs/search?${params}`);
    setEvents(response.data);
  }, [category, dateFrom, dateTo, eventPage, groupId, level, query]);

  const loadCalibrations = useCallback(async () => {
    const params = new URLSearchParams({ page: String(calibrationPage), pageSize: "20" });
    if (groupId !== "all") params.set("groupId", groupId);
    const response = await axios.get<Paged<Calibration>>(`/calibrations?${params}`);
    setCalibrations(response.data);
  }, [calibrationPage, groupId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEvents(), 250);
    return () => window.clearTimeout(timer);
  }, [loadEvents]);

  useEffect(() => {
    void loadCalibrations();
  }, [loadCalibrations]);

  useEffect(() => {
    axios.get<TreatmentHistory[]>("/doctor/treatments/history").then((response) => setSessions(response.data));
  }, []);

  useEffect(() => {
    setEventPage(1);
    setCalibrationPage(1);
  }, [query, level, category, groupId, dateFrom, dateTo]);

  const filteredSessions = useMemo(() => sessions.filter((session) => {
    const text = `${session.patientName ?? ""} ${session.patientId} ${session.status}`.toLowerCase();
    const matchesText = text.includes(query.toLowerCase());
    const matchesGroup = groupId === "all" || session.groups?.some((group) => String(group.groupId) === groupId);
    const started = new Date(session.startedAt).getTime();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
    return matchesText && matchesGroup && started >= from && started <= to;
  }), [dateFrom, dateTo, groupId, query, sessions]);

  const filters = (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
      <Input className="xl:col-span-2" placeholder="Buscar evento, paciente o estado" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select className="h-10 rounded-md border bg-background px-3 text-sm" value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">Todos los niveles</option><option value="info">Información</option><option value="warn">Advertencia</option><option value="error">Error</option></select>
      <select className="h-10 rounded-md border bg-background px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas las categorías</option><option value="connection">Conexión</option><option value="telemetry">Telemetría</option><option value="session">Sesiones</option><option value="control">Control</option><option value="calibration">Calibración</option><option value="alert">Alertas</option></select>
      <select className="h-10 rounded-md border bg-background px-3 text-sm" value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="all">Todos los grupos</option>{[1,2,3,4].map((value) => <option key={value} value={value}>Grupo {value}</option>)}</select>
      <div className="grid grid-cols-2 gap-2"><Input aria-label="Fecha desde" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /><Input aria-label="Fecha hasta" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Auditoría</p>
          <h2 className="text-2xl font-semibold tracking-tight">Historial operativo</h2>
          <p className="text-sm text-muted-foreground">Eventos reales, sesiones clínicas y cambios de calibración.</p>
        </div>
        <Badge variant="outline" className="w-fit">Retención técnica: 180 días</Badge>
      </div>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ListFilter className="h-4 w-4" />Filtros</CardTitle></CardHeader><CardContent>{filters}</CardContent></Card>

      <Tabs defaultValue="events">
        <TabsList className="grid h-auto w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones</TabsTrigger>
          <TabsTrigger value="calibrations">Calibraciones</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <HistoryCard title={`${events.total} eventos`} onExport={() => exportCsv("eventos-sebastian.csv", events.items)}>
            {events.items.map((event) => <EventRow key={event.id} event={event} />)}
            {!events.items.length && <EmptyState />}
            <Pagination page={events.page} total={events.total} pageSize={events.pageSize} onPage={setEventPage} />
          </HistoryCard>
        </TabsContent>

        <TabsContent value="sessions">
          <HistoryCard title={`${filteredSessions.length} sesiones clínicas`} onExport={() => exportCsv("sesiones-sebastian.csv", filteredSessions)}>
            {filteredSessions.map((session) => <details key={session.id} className="rounded-xl border bg-card p-4"><summary className="cursor-pointer list-none"><div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-medium">{session.patientName ?? session.patientId}</p><p className="text-xs text-muted-foreground">{new Date(session.startedAt).toLocaleString()} · {session.durationSeconds ?? 0}s</p></div><span className="text-sm">{session.groups?.map((group) => `G${group.groupId}`).join(", ") || "Grupo histórico"}</span><Badge variant={session.status === "completed" ? "default" : session.status === "running" ? "secondary" : "destructive"}>{session.status}</Badge></div></summary><pre className="mt-3 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(session, null, 2)}</pre></details>)}
            {!filteredSessions.length && <EmptyState />}
          </HistoryCard>
        </TabsContent>

        <TabsContent value="calibrations">
          <HistoryCard title={`${calibrations.total} calibraciones`} onExport={() => exportCsv("calibraciones-sebastian.csv", calibrations.items)}>
            {calibrations.items.map((item) => <details key={item.id} className="rounded-xl border bg-card p-4"><summary className="cursor-pointer list-none"><div className="grid gap-2 sm:grid-cols-[100px_120px_1fr_auto] sm:items-center"><span>Grupo {item.groupId}</span><span>{item.sensorType === "pressure" ? "Presión" : "Fuerza"}</span><div><p className="font-mono text-sm">Coef. {item.coefficient ? Number(item.coefficient).toFixed(6) : "-"}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p></div><Badge variant={item.status === "completed" ? "default" : item.status === "failed" ? "destructive" : "secondary"}>{item.status}</Badge></div></summary><pre className="mt-3 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(item, null, 2)}</pre></details>)}
            {!calibrations.items.length && <EmptyState />}
            <Pagination page={calibrations.page} total={calibrations.total} pageSize={calibrations.pageSize} onPage={setCalibrationPage} />
          </HistoryCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventRow({ event }: { event: SystemLog }) {
  return <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer list-none"><div className="grid gap-2 sm:grid-cols-[12px_1fr_auto] sm:items-center"><span className={`h-2.5 w-2.5 rounded-full ${event.level === "error" ? "bg-red-500" : event.level === "warn" ? "bg-amber-500" : "bg-emerald-500"}`} /><div><p className="font-medium">{event.message}</p><p className="text-xs text-muted-foreground">{event.category ?? event.source} · {event.eventType ?? "evento heredado"}{event.groupId ? ` · Grupo ${event.groupId}` : ""}</p></div><time className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</time></div></summary>{event.metadata && <pre className="mt-3 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(event.metadata, null, 2)}</pre>}</details>;
}

function HistoryCard({ title, onExport, children }: { title: string; onExport: () => void; children: ReactNode }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><History className="h-4 w-4" />{title}</CardTitle><Button size="sm" variant="outline" onClick={onExport}><Download className="mr-2 h-4 w-4" />CSV</Button></CardHeader><CardContent className="space-y-2">{children}</CardContent></Card>;
}

function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  return <div className="flex items-center justify-between pt-3"><Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</Button><span className="text-xs text-muted-foreground">Página {page} de {maxPage}</span><Button variant="outline" disabled={page >= maxPage} onClick={() => onPage(page + 1)}>Siguiente</Button></div>;
}

function EmptyState() {
  return <div className="grid place-items-center rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground"><FlaskConical className="mb-2 h-6 w-6" />No se encontraron registros.</div>;
}

function exportCsv(filename: string, rows: unknown[]) {
  const records = rows as Record<string, unknown>[];
  if (!records.length) return;
  const keys = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  const escape = (value: unknown) => `"${String(typeof value === "object" && value !== null ? JSON.stringify(value) : value ?? "").replaceAll('"', '""')}"`;
  const csv = [keys.map(escape).join(","), ...records.map((record) => keys.map((key) => escape(record[key])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
