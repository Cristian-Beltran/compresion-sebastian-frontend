import { useCallback, useEffect, useState } from "react";
import axios from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LogRow = {
  id: string;
  user?: string;
  createdAt: string;
  role?: string;
  action?: string;
  module?: string;
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export function AdminLogsPage() {
  const [logs, setLogs] = useState<Paged<LogRow>>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search) params.set("search", search);
    if (moduleFilter !== "all") params.set("module", moduleFilter);
    if (dateFrom) params.set("dateFrom", new Date(`${dateFrom}T00:00:00`).toISOString());
    if (dateTo) params.set("dateTo", new Date(`${dateTo}T23:59:59`).toISOString());
    const response = await axios.get<Paged<LogRow>>(`/logs/search?${params}`);
    setLogs(response.data);
  }, [search, moduleFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, moduleFilter, dateFrom, dateTo]);

  const maxPage = Math.max(1, Math.ceil(logs.total / logs.pageSize));

  const handleExportPdf = () => {
    toast("Exportando registros a PDF...");
  };

  const handleExportExcel = () => {
    toast("Exportando registros a Excel...");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Auditoría
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Registros</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Actividad global realizada por todos los perfiles del sistema.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Registro de actividad</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportPdf}>
              PDF
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportExcel}>
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            <Input
              className="xl:col-span-2"
              placeholder="Buscar por usuario o acción"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <option value="all">Todos los módulos</option>
              <option value="pacientes">Pacientes</option>
              <option value="tratamientos">Tratamientos</option>
              <option value="historial">Historial</option>
              <option value="sensores">Sensores</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="calibracion">Calibración</option>
              <option value="alertas">Alertas</option>
              <option value="usuarios">Usuarios</option>
              <option value="configuracion">Configuración</option>
            </select>
            <Input
              type="date"
              aria-label="Fecha desde"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              aria-label="Fecha hasta"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Fecha y hora</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2">Acción</th>
                  <th className="px-3 py-2">Módulo</th>
                </tr>
              </thead>
              <tbody>
                {logs.items.map((log) => (
                  <tr key={log.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2">{log.user ?? "—"}</td>
                    <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{log.role ?? "—"}</td>
                    <td className="px-3 py-2">{log.action ?? "—"}</td>
                    <td className="px-3 py-2">{log.module ?? "—"}</td>
                  </tr>
                ))}
                {!logs.items.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No se encontraron registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {page} de {maxPage}
            </span>
            <Button variant="outline" disabled={page >= maxPage} onClick={() => setPage(page + 1)}>
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
