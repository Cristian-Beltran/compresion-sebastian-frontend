import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { downloadExcelReport, downloadPdfReport, fetchAllReportPages } from "@/lib/reports";
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
  const [activity, setActivity] = useState<Array<{ createdAt: string; module?: string; action?: string }>>([]);

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
    fetchAllReportPages<{ createdAt: string; module?: string; action?: string }>("/logs/search", new URLSearchParams()).then(setActivity).catch(() => {});
  }, []);

  const weeklyTreatments = Array.from({ length: 7 }, (_, offset) => { const date = new Date(); date.setDate(date.getDate() - 6 + offset); const key = date.toDateString(); return { name: date.toLocaleDateString("es-ES", { weekday: "short" }), value: activity.filter((row) => new Date(row.createdAt).toDateString() === key && String(row.module ?? "").toLowerCase().includes("tratamiento")).length }; });
  const moduleActivity = Object.entries(activity.reduce<Record<string, number>>((total, row) => { const module = row.module || "Sistema"; total[module] = (total[module] ?? 0) + 1; return total; }, {})).map(([name, value]) => ({ name, value }));
  const summaryRows = [{ indicator: "Tratamientos registrados", value: treatmentsCount }, { indicator: "Pacientes atendidos", value: patientsCount }, { indicator: "Alertas técnicas", value: alertsCount }, { indicator: "Accesos y actividad", value: activity.length }, ...moduleActivity.map((item) => ({ indicator: `Actividad · ${item.name}`, value: item.value }))];
  const report = { filename: "reporte-general-venoflow", title: "Reporte general VenoFlow", subtitle: "Indicadores de uso clínico, técnico y administrativo", section: "Indicadores consolidados", columns: [{ header: "Indicador", key: "indicator", width: 42 }, { header: "Valor", key: "value" }], rows: summaryRows };
  const handleExportPdf = () => downloadPdfReport(report);
  const handleExportExcel = () => void downloadExcelReport(report);

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
          value={activity.length}
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
