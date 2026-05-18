import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "@/lib/axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type LogRow = {
  id: string;
  level: string;
  source: string;
  message: string;
  createdAt: string;
};

export function AdminHistoryPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    axios.get("/logs?limit=150").then((res) => setLogs(res.data));
  }, []);

  const filtered = logs.filter((log) => {
    const byLevel = level === "all" ? true : log.level === level;
    const text = `${log.source} ${log.message}`.toLowerCase();
    return byLevel && text.includes(query.toLowerCase());
  });

  const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, maxPage);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Historial tecnico</h2>
      <Card>
        <CardHeader>
          <CardTitle>Logs del sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 md:grid-cols-3">
            <Input placeholder="Buscar evento" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
            <div className="text-sm text-muted-foreground flex items-center">{filtered.length} registros</div>
          </div>

          {rows.map((log) => (
            <div key={log.id} className="rounded border border-border p-3 text-sm">
              <p className="font-medium">[{log.level}] {log.source}</p>
              <p className="text-muted-foreground">{log.message}</p>
              <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
            <span className="text-xs text-muted-foreground">Pagina {currentPage} de {maxPage}</span>
            <Button variant="outline" disabled={currentPage >= maxPage} onClick={() => setPage((p) => Math.min(maxPage, p + 1))}>Siguiente</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
