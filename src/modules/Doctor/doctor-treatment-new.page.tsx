import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "@/lib/axios";
import { toast } from "sonner";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PatientRow = { id: string; fullname: string; status: string };
type Intensity = "low" | "medium" | "high";

const INTENSITIES: Array<{ key: Intensity; title: string; desc: string }> = [
  { key: "low", title: "Baja intensidad", desc: "Compresion suave y continua" },
  { key: "medium", title: "Media intensidad", desc: "Balance clinico estandar" },
  { key: "high", title: "Alta intensidad", desc: "Compresion avanzada" },
];

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

export function DoctorTreatmentNewPage() {
  const [patientId, setPatientId] = useState("");
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [live, setLive] = useState<any>(null);
  const [activeTreatment, setActiveTreatment] = useState<any>(null);

  const load = async () => {
    const [patientsRes, liveRes, activeRes] = await Promise.all([
      axios.get("/doctor/patients"),
      axios.get("/doctor/dashboard/live"),
      axios.get("/doctor/treatments/active"),
    ]);
    setPatients(patientsRes.data);
    setLive(liveRes.data);
    setActiveTreatment(activeRes.data);
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 2000);
    return () => clearInterval(timer);
  }, []);

  const currentPatientName = useMemo(() => {
    const row = patients.find((p) => p.id === activeTreatment?.patientId);
    return row?.fullname ?? activeTreatment?.patientName ?? activeTreatment?.patientId ?? "-";
  }, [patients, activeTreatment]);

  const history =
    live?.history?.map((item: any, idx: number) => ({
      idx,
      pressure: Number(item.pressureKpa ?? 0),
      temp: Number(item.temperatureC ?? 0),
    })) ?? [];
  const phase = stateMeta(live?.status?.state);

  const start = async () => {
    if (!patientId || !intensity) {
      toast.error("Selecciona paciente e intensidad");
      return;
    }
    try {
      await axios.post("/doctor/treatments/start", { patientId, intensity });
      toast.success("Tratamiento iniciado");
      await load();
    } catch {
      toast.error("No se pudo iniciar el tratamiento");
    }
  };

  const stop = async () => {
    if (!activeTreatment) return;
    try {
      await axios.post(`/doctor/treatments/${activeTreatment.id}/stop`);
      toast.success("Tratamiento detenido");
      await load();
    } catch {
      toast.error("No se pudo detener");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Sistema de tratamiento</h2>

      <Card className="border-cyan-300/20 bg-gradient-to-br from-card to-card/70">
        <CardHeader><CardTitle>Seleccion del protocolo</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {INTENSITIES.map((item) => (
            <button
              key={item.key}
              className={
                "rounded-2xl border p-5 text-left transition-all " +
                (intensity === item.key
                  ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(0,212,255,0.15)]"
                  : "border-border hover:border-cyan-500/40")
              }
              onClick={() => setIntensity(item.key)}
            >
              <p className="text-lg font-semibold">{item.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Paciente y accion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select
              className="h-11 w-full rounded-md border bg-background px-3"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={!!activeTreatment}
            >
              <option value="">Selecciona paciente</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullname}
                </option>
              ))}
            </select>

            {!activeTreatment && (
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={() => void start()}>
                Comenzar tratamiento
              </Button>
            )}
            {activeTreatment && (
              <Button className="w-full" variant="destructive" onClick={() => void stop()}>
                Parar tratamiento activo
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Monitor en tiempo real</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>Paciente activo</span><span>{currentPatientName}</span></div>
            <div className="flex items-center justify-between"><span>Estado</span><span className={`rounded-full px-2 py-1 text-xs ${phase.className}`}>{phase.label}</span></div>
            <div className="flex items-center justify-between"><span>Presion</span><span>{live?.status?.pressureKpa ?? 0} kPa</span></div>
            <div className="flex items-center justify-between"><span>Temperatura</span><span>{live?.status?.temperatureC ?? 0} C</span></div>
            <div className="flex items-center justify-between"><span>Ciclos</span><span>{live?.status?.cycleIndex ?? activeTreatment?.cycleCount ?? 0}</span></div>
            <div className="flex items-center justify-between"><span>Bomba</span><span>{live?.status?.pumpOn ? "ON" : "OFF"}</span></div>
            <div className="flex items-center justify-between"><span>Valvula</span><span>{live?.status?.valveClosed ? "CERRADA" : "ABIERTA"}</span></div>
            <div className="flex items-center justify-between"><span>Hold restante</span><span>{Math.max(0, Math.floor((live?.status?.holdRemainingMs ?? 0) / 1000))} s</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Grafica de presion</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Grafica de temperatura</CardTitle></CardHeader>
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
    </div>
  );
}
