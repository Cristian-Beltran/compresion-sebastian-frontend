import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "@/lib/axios";
import { Input } from "@/components/ui/input";

type AlertRow = {
  id: string;
  severity: "info" | "warn" | "critical";
  message: string;
  active: boolean;
  createdAt: string;
};

export function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<"all" | "info" | "warn" | "critical">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = async () => {
    const res = await axios.get("/alerts");
    setAlerts(res.data);
  };

  useEffect(() => {
    void load();
  }, []);

  const resolveAlert = async (id: string) => {
    await axios.patch(`/alerts/${id}/resolve`);
    await load();
  };

  const active = alerts.filter((a) => a.active);
  const filteredHistory = alerts.filter((a) => {
    const bySeverity = severity === "all" ? true : a.severity === severity;
    return bySeverity && a.message.toLowerCase().includes(query.toLowerCase());
  });
  const maxPage = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const rows = filteredHistory.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Alertas del sistema</h2>
      <Card>
        <CardHeader>
          <CardTitle>Alertas activas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {active.length === 0 && <p>Sin alertas activas.</p>}
          {active.map((row) => (
            <div key={row.id} className="rounded border border-border p-3 text-sm flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">[{row.severity}] {row.message}</p>
                <p className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</p>
              </div>
              <Button variant="outline" onClick={() => void resolveAlert(row.id)}>
                Resolver
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Historial de alertas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Buscar alerta" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
            >
              <option value="all">Todas</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {rows.map((row) => (
            <div key={row.id} className="rounded border border-border p-3 text-sm">
              <p className="font-medium">[{row.severity}] {row.message}</p>
              <p className="text-xs text-muted-foreground">Estado: {row.active ? "activa" : "resuelta"}</p>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
            <span className="text-xs text-muted-foreground">Pagina {Math.min(page, maxPage)} de {maxPage}</span>
            <Button variant="outline" disabled={page >= maxPage} onClick={() => setPage((p) => Math.min(maxPage, p + 1))}>Siguiente</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
