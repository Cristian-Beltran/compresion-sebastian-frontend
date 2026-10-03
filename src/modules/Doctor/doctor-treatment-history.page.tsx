import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "@/lib/axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Treatment = {
  id: string;
  patientId: string;
  patientName?: string;
  configId?: string | null;
  intensity?: string;
  treatmentZone?: string;
  mobilityLevel?: string;
  targetPressureKpa?: number;
  holdTimeSeconds?: number;
  releaseTimeSeconds?: number;
  cycleTarget?: number;
  status: string;
  cycleCount: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds?: number;
  medicalReport?: string | null;
  groups?: Array<{
    groupId: number;
    zone: string;
    targetPressureKpa: number;
    inflateTimeSeconds: number;
    holdTimeSeconds: number;
    releaseTimeSeconds: number;
    cycleTarget: number;
    cycleCount?: number;
  }> | null;
};

const zoneLabels: Record<string, string> = {
  pantorrilla_izquierda: "Pantorrilla izquierda",
  pantorrilla_derecha: "Pantorrilla derecha",
  pie_izquierdo: "Pie izquierdo",
  pie_derecho: "Pie derecho",
};

export function DoctorTreatmentHistoryPage() {
  const [items, setItems] = useState<Treatment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTreatment, setDetailTreatment] = useState<Treatment | null>(null);

  useEffect(() => {
    axios.get("/doctor/treatments/history").then((res) => setItems(res.data));
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const byStatus =
          statusFilter === "all" ? true : item.status === statusFilter;
        const groupZones =
          item.groups?.map((group) => group.zone).join(" ") ?? "";
        const text =
          `${item.patientId} ${item.patientName ?? ""} ${item.intensity ?? ""} ${item.treatmentZone ?? ""} ${groupZones} ${item.mobilityLevel ?? ""}`.toLowerCase();
        return byStatus && text.includes(search.toLowerCase());
      }),
    [items, search, statusFilter],
  );

  const openDetail = (treatment: Treatment) => {
    setDetailTreatment(treatment);
    setDetailOpen(true);
  };

  const downloadCsv = () => {
    const header = [
      "id",
      "patientId",
      "patientName",
      "intensity",
      "treatmentZone",
      "mobilityLevel",
      "targetPressureKpa",
      "holdTimeSeconds",
      "releaseTimeSeconds",
      "cycleTarget",
      "status",
      "cycleCount",
      "durationSeconds",
      "startedAt",
      "endedAt",
      "medicalReport",
      "groups",
    ];
    const rows = filtered.map((item) => [
      item.id,
      item.patientId,
      item.patientName ?? "",
      item.intensity ?? "",
      item.treatmentZone ?? "",
      item.mobilityLevel ?? "",
      String(item.targetPressureKpa ?? ""),
      String(item.holdTimeSeconds ?? ""),
      String(item.releaseTimeSeconds ?? ""),
      String(item.cycleTarget ?? ""),
      item.status,
      String(item.cycleCount),
      String(item.durationSeconds ?? 0),
      item.startedAt,
      item.endedAt ?? "",
      item.medicalReport ?? "",
      JSON.stringify(item.groups ?? []),
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tratamientos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = detailTreatment?.groups?.map((g) => ({
    name: zoneLabels[g.zone] ?? `Grupo ${g.groupId}`,
    pressure: g.targetPressureKpa,
    cycles: g.cycleCount ?? detailTreatment.cycleCount,
    target: g.cycleTarget,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Trazabilidad clínica</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          Historial médico
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte sesiones, resultados y eventos asociados a cada paciente.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Historial de sesiones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="Buscar por paciente, protocolo o estado"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="running">En curso</option>
              <option value="completed">Completado</option>
              <option value="interrupted">Interrumpido</option>
              <option value="aborted">Abortado</option>
            </select>
            <Button onClick={downloadCsv}>Descargar CSV</Button>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Paciente</th>
                  <th className="px-4 py-3 font-semibold">Fecha y hora</th>
                  <th className="px-4 py-3 font-semibold">Protocolo</th>
                  <th className="px-4 py-3 font-semibold">Zonas</th>
                  <th className="px-4 py-3 font-semibold">Duración</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Reporte</th>
                  <th className="px-4 py-3 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      {item.patientName ?? item.patientId}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(item.startedAt).toLocaleDateString()}
                      <br />
                      <small className="text-muted-foreground">
                        {new Date(item.startedAt).toLocaleTimeString()}
                      </small>
                    </td>
                    <td className="px-4 py-3">
                      {(item.intensity ?? "-").toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      {item.groups?.length
                        ? item.groups.map((g) => zoneLabels[g.zone] ?? `G${g.groupId}`).join(", ")
                        : (item.treatmentZone?.replaceAll("_", " ") ?? "-")}
                    </td>
                    <td className="px-4 py-3">{item.durationSeconds ?? 0}s</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          item.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : item.status === "interrupted"
                              ? "bg-amber-500/10 text-amber-600"
                              : item.status === "running"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {item.status === "completed"
                          ? "Completado"
                          : item.status === "interrupted"
                            ? "Interrumpido"
                            : item.status === "running"
                              ? "En curso"
                              : "Abortado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.medicalReport ? (
                        <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                          Con reporte
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sin reporte</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => openDetail(item)}>
                        Abrir registro
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No se encontraron tratamientos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Sesión · {detailTreatment?.patientName ?? detailTreatment?.patientId}
            </DialogTitle>
            <DialogDescription>
              {detailTreatment
                ? `${new Date(detailTreatment.startedAt).toLocaleDateString()} a las ${new Date(detailTreatment.startedAt).toLocaleTimeString()}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {detailTreatment && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duración</span>
                      <span className="font-medium">{detailTreatment.durationSeconds ?? 0}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Zonas utilizadas</span>
                      <span className="font-medium">{detailTreatment.groups?.length ?? 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado final</span>
                      <span
                        className={`font-medium ${
                          detailTreatment.status === "completed"
                            ? "text-emerald-600"
                            : detailTreatment.status === "interrupted"
                              ? "text-amber-600"
                              : "text-blue-600"
                        }`}
                      >
                        {detailTreatment.status === "completed"
                          ? "Completado"
                          : detailTreatment.status === "interrupted"
                            ? "Interrumpido"
                            : "En curso"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interrupciones</span>
                      <span className="font-medium">
                        {detailTreatment.status === "completed" ? "Ninguna" : "1 manual"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Protocolo</span>
                      <span className="font-medium">{(detailTreatment.intensity ?? "-").toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Presión objetivo</span>
                      <span className="font-medium">{detailTreatment.targetPressureKpa ?? "-"} kPa</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ciclos completados</span>
                      <span className="font-medium">
                        {detailTreatment.cycleCount} / {detailTreatment.cycleTarget ?? "-"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {detailTreatment.groups && detailTreatment.groups.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Presión y ciclos por zona</CardTitle>
                  </CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="pressure" name="Presión (kPa)" fill="#1673c8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {detailTreatment.medicalReport && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Registro médico</CardTitle>
                      <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        Con reporte
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Observaciones guardadas por el profesional responsable
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{detailTreatment.medicalReport}</p>
                  </CardContent>
                </Card>
              )}

              {!detailTreatment.medicalReport && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Registro médico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {detailTreatment.status === "interrupted"
                        ? "Terapia interrumpida antes de su finalización."
                        : "Terapia concluida correctamente"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
