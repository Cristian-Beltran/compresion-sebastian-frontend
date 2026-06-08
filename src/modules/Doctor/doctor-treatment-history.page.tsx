import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "@/lib/axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
};

export function DoctorTreatmentHistoryPage() {
  const [items, setItems] = useState<Treatment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    axios.get("/doctor/treatments/history").then((res) => setItems(res.data));
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const byStatus = statusFilter === "all" ? true : item.status === statusFilter;
        const text = `${item.patientId} ${item.patientName ?? ""} ${item.intensity ?? ""} ${item.treatmentZone ?? ""} ${item.mobilityLevel ?? ""}`.toLowerCase();
        return byStatus && text.includes(search.toLowerCase());
      }),
    [items, search, statusFilter],
  );

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
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tratamientos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Registro de tratamientos</h2>
      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="Buscar por paciente, intensidad, zona o movilidad"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="aborted">Aborted</option>
            </select>
            <Button onClick={downloadCsv}>Descargar CSV</Button>
          </div>

          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-3 py-2">Paciente</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Intensidad</th>
                  <th className="px-3 py-2">Zona</th>
                  <th className="px-3 py-2">Movilidad</th>
                  <th className="px-3 py-2">Config</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Ciclos</th>
                  <th className="px-3 py-2">Duracion</th>
                  <th className="px-3 py-2">Inicio</th>
                  <th className="px-3 py-2">Fin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2">{item.patientId}</td>
                    <td className="px-3 py-2">{item.patientName ?? "-"}</td>
                    <td className="px-3 py-2 uppercase">{item.intensity ?? "-"}</td>
                    <td className="px-3 py-2">{item.treatmentZone?.replace("_", " ") ?? "-"}</td>
                    <td className="px-3 py-2">{item.mobilityLevel?.replace("_", " ") ?? "-"}</td>
                    <td className="px-3 py-2">
                      {item.targetPressureKpa ?? "-"} kPa / {item.holdTimeSeconds ?? "-"}s / {item.releaseTimeSeconds ?? "-"}s / {item.cycleTarget ?? "-"} ciclos
                    </td>
                    <td className="px-3 py-2">{item.status}</td>
                    <td className="px-3 py-2">{item.cycleCount}</td>
                    <td className="px-3 py-2">{item.durationSeconds ?? 0}s</td>
                    <td className="px-3 py-2">{new Date(item.startedAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{item.endedAt ? new Date(item.endedAt).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
