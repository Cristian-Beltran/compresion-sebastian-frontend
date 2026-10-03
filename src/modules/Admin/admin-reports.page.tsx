import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  FileDown,
  Sheet,
  Users,
  Workflow,
} from "lucide-react";

export function AdminReportsPage() {
  const [treatmentsCount, setTreatmentsCount] = useState(0);
  const [patientsCount, setPatientsCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    axios.get("/doctor/treatments/history").then((res) => {
      setTreatmentsCount(Array.isArray(res.data) ? res.data.length : res.data?.total ?? 0);
    }).catch(() => {});
    axios.get("/doctor/patients").then((res) => {
      setPatientsCount(Array.isArray(res.data) ? res.data.length : res.data?.total ?? 0);
    }).catch(() => {});
    axios.get("/alerts").then((res) => {
      setAlertsCount(Array.isArray(res.data) ? res.data.length : res.data?.total ?? 0);
    }).catch(() => {});
  }, []);

  const weeklyTreatments = [
    { name: "Lun", value: 12 },
    { name: "Mar", value: 19 },
    { name: "Mié", value: 8 },
    { name: "Jue", value: 15 },
    { name: "Vie", value: 22 },
    { name: "Sáb", value: 6 },
    { name: "Dom", value: 3 },
  ];

  const moduleActivity = [
    { name: "Pacientes", value: 84 },
    { name: "Tratamientos", value: 120 },
    { name: "Historial", value: 65 },
    { name: "Alertas", value: 42 },
    { name: "Usuarios", value: 18 },
    { name: "Config.", value: 13 },
  ];

  const handleExportPdf = () => {
    toast("Exportando reportes a PDF...");
  };

  const handleExportExcel = () => {
    toast("Exportando reportes a Excel...");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Analítica general
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Reportes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Indicadores de uso clínico, técnico y administrativo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportPdf}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportExcel}>
            <Sheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tratamientos"
          value={treatmentsCount}
          icon={<Workflow className="h-5 w-5" />}
          accentColor="primary"
        />
        <MetricCard
          label="Pacientes atendidos"
          value={patientsCount}
          icon={<Users className="h-5 w-5" />}
          accentColor="secondary"
        />
        <MetricCard
          label="Alertas técnicas"
          value={alertsCount}
          icon={<Activity className="h-5 w-5" />}
          accentColor="destructive"
        />
        <MetricCard
          label="Accesos al sistema"
          value={342}
          icon={<BarChart3 className="h-5 w-5" />}
          accentColor="accent"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">Tratamientos por semana</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTreatments}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#627184" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#627184" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #dbe3ec",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#1673c8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">Actividad por módulo</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleActivity}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#627184" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#627184" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #dbe3ec",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#14a37f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
