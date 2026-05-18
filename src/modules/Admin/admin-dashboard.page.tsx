import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "@/lib/axios";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type LogRow = {
  id: string;
  source: string;
  level: string;
  message: string;
  createdAt: string;
};

export function AdminDashboardPage() {
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const [mqttRes, logsRes] = await Promise.all([
        axios.get("/mqtt/status"),
        axios.get("/logs?limit=8"),
      ]);
      setStatus(mqttRes.data);
      setLogs(logsRes.data);
    };

    void load();
    const timer = setInterval(() => void load(), 2000);
    return () => clearInterval(timer);
  }, []);

  const history =
    status?.history?.map((item: any, idx: number) => ({
      idx,
      pressure: Number(item.pressureKpa ?? 0),
      temp: Number(item.temperatureC ?? 0),
      film: Number(item.filmPercent ?? 0),
    })) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard tecnico</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Estado del sistema</CardTitle>
          </CardHeader>
          <CardContent>
            ESP32: {status?.status?.connected ? "conectado" : "desconectado"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Presion actual</CardTitle>
          </CardHeader>
          <CardContent>{status?.status?.pressureKpa ?? 0} kPa</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Temperatura</CardTitle>
          </CardHeader>
          <CardContent>{status?.status?.temperatureC ?? 0} C</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estado del ciclo</CardTitle>
          </CardHeader>
          <CardContent>{status?.status?.state ?? "-"}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Presion en tiempo real</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="idx" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="pressure" stroke="#00d4ff" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Temperatura y fuerza</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="idx" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="temp" stroke="#22c55e" dot={false} />
                <Line type="monotone" dataKey="film" stroke="#f59e0b" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultimos logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">[{log.level}] {log.source}</p>
              <p className="text-muted-foreground">{log.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
