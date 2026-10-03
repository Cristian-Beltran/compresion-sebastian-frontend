import { useCallback, useEffect, useState } from "react";
import axios from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, FlaskConical, History, ListFilter } from "lucide-react";
import { toast } from "sonner";

type TechnicalLog = {
  id: string;
  createdAt: string;
  actorName: string;
  action: string;
  result: string;
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export function TechnicalHistoryPage() {
  const [logs, setLogs] = useState<Paged<TechnicalLog>>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadLogs = useCallback(async () => {
    const params = new URLSearchParams({ page: String(currentPage), pageSize: "20" });
    if (query) params.set("search", query);
    if (dateFrom) params.set("dateFrom", new Date(`${dateFrom}T00:00:00`).toISOString());
    if (dateTo) params.set("dateTo", new Date(`${dateTo}T23:59:59`).toISOString());
    const response = await axios.get<Paged<TechnicalLog>>(`/logs/technical?${params}`);
    setLogs(response.data);
  }, [currentPage, dateFrom, dateTo, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLogs(), 250);
    return () => window.clearTimeout(timer);
  }, [loadLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, dateFrom, dateTo]);

  const exportPdf = () => {
    toast.success("Exportando historial técnico a PDF...");
  };

  const exportExcel = () => {
    toast.success("Exportando historial técnico a Excel...");
  };

  const maxPage = Math.max(1, Math.ceil(logs.total / logs.pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Auditoría técnica</p>
          <h2 className="text-2xl font-semibold tracking-tight">Historial técnico</h2>
          <p className="text-sm text-muted-foreground">Registro de acciones realizadas por el personal técnico.</p>
        </div>
        <Badge variant="outline" className="w-fit">Retención técnica: 180 días</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListFilter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <Input className="xl:col-span-2" placeholder="Buscar por usuario o acción" value={query} onChange={(event) => setQuery(event.target.value)} />
            <Input aria-label="Fecha desde" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <Input aria-label="Fecha hasta" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {logs.total} registros técnicos
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportPdf}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button size="sm" variant="outline" onClick={exportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 font-semibold">Fecha</th>
                  <th className="pb-3 pr-4 font-semibold">Hora</th>
                  <th className="pb-3 pr-4 font-semibold">Usuario</th>
                  <th className="pb-3 pr-4 font-semibold">Acción realizada</th>
                  <th className="pb-3 font-semibold">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {logs.items.map((log) => {
                  const date = new Date(log.createdAt);
                  return (
                    <tr key={log.id} className="border-b border-border/40">
                      <td className="py-3 pr-4">{date.toLocaleDateString()}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{date.toLocaleTimeString()}</td>
                      <td className="py-3 pr-4">{log.actorName}</td>
                      <td className="py-3 pr-4">{log.action}</td>
                      <td className="py-3">
                        <Badge
                          variant={
                            log.result.toLowerCase().includes("ok") || log.result.toLowerCase().includes("éxito")
                              ? "default"
                              : log.result.toLowerCase().includes("fail") || log.result.toLowerCase().includes("error")
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {log.result}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {!logs.items.length && (
                  <tr>
                    <td colSpan={5}>
                      <div className="grid place-items-center rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        <FlaskConical className="mb-2 h-6 w-6" />
                        No se encontraron registros.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-3">
            <Button variant="outline" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {currentPage} de {maxPage}
            </span>
            <Button variant="outline" disabled={currentPage >= maxPage} onClick={() => setCurrentPage((p) => Math.min(maxPage, p + 1))}>
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
