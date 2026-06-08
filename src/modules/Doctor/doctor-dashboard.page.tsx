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

function stateMeta(state?: string) {
  const value = (state ?? "-").toUpperCase();
  switch (value) {
    case "INFLA":
      return { label: "Inflando", className: "bg-cyan-500/15 text-cyan-400" };
    case "MANTIENE":
      return { label: "Manteniendo", className: "bg-emerald-500/15 text-emerald-400" };
    case "DESINFLA":
      return { label: "Desinflando", className: "bg-amber-500/15 text-amber-400" };
    case "LISTO":
      return { label: "Listo", className: "bg-emerald-500/15 text-emerald-400" };
    case "ERROR":
      return { label: "Error", className: "bg-red-500/15 text-red-400" };
    case "MENU":
      return { label: "En espera", className: "bg-zinc-500/15 text-zinc-300" };
    default:
      return { label: value, className: "bg-zinc-500/15 text-zinc-300" };
  }
}

export function DoctorDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [live, setLive] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const [s, l] = await Promise.all([
        axios.get("/doctor/dashboard/summary"),
        axios.get("/doctor/dashboard/live"),
      ]);
      setSummary(s.data);
      setLive(l.data);
    };
    void load();
    const timer = setInterval(() => void load(), 2000);
    return () => clearInterval(timer);
  }, []);

  const history =
    live?.history?.map((item: any, idx: number) => ({
      idx,
      pressure: Number(item.pressureKpa ?? 0),
      temp: Number(item.temperatureC ?? 0),
    })) ?? [];
  const phase = stateMeta(live?.status?.state);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Panel clinico</h2>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader><CardTitle>Estado sistema</CardTitle></CardHeader>
          <CardContent>
            <span className={`rounded-full px-2 py-1 text-xs ${phase.className}`}>{phase.label}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Presion actual</CardTitle></CardHeader>
          <CardContent>{live?.status?.pressureKpa ?? 0} kPa</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Temp. actual</CardTitle></CardHeader>
          <CardContent>{live?.status?.temperatureC ?? 0} C</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Fuerza actual</CardTitle></CardHeader>
          <CardContent>{Number(live?.status?.forceNewtons ?? 0).toFixed(2)} N</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pacientes</CardTitle></CardHeader>
          <CardContent>{summary?.patientsCount ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Presion en tiempo real</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Temperatura en tiempo real</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="idx" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="temp" stroke="#22c55e" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ultimos pacientes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {summary?.latestPatients?.map((p: any) => (
              <div key={p.id} className="rounded border p-2 text-sm">
                {p.fullname ?? p.user?.fullname}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tratamiento activo</CardTitle></CardHeader>
          <CardContent>
            {summary?.activeTreatment
              ? `Paciente ${summary.activeTreatment.patientName} | Intensidad ${summary.activeTreatment.intensity ?? "-"} | ${summary.activeTreatment.durationSeconds}s`
              : "No hay tratamiento activo"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Ultimos tratamientos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {summary?.latestTreatments?.map((t: any) => (
            <div key={t.id} className="rounded border p-3 text-sm flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{t.patientName}</p>
                <p className="text-muted-foreground">{(t.intensity ?? "-").toUpperCase()} · {t.status}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{new Date(t.startedAt).toLocaleString()}</p>
                <p>{t.durationSeconds}s</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
