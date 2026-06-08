import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "@/lib/axios";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AdminControlPage() {
  const [status, setStatus] = useState<any>(null);
  const [pulseMs, setPulseMs] = useState(500);

  const sendManual = async (
    command: string,
    payload?: Record<string, unknown>,
  ) => {
    try {
      await axios.post("/device/manual-command", { command, payload });
      const res = await axios.get("/mqtt/status");
      setStatus(res.data);
      toast.success(`Comando ${command} enviado`);
    } catch (error) {
      console.error(error);
      toast.error(`No se pudo enviar ${command}`);
    }
  };

  useEffect(() => {
    const load = async () => {
      const res = await axios.get("/mqtt/status");
      setStatus(res.data);
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
    })) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Control manual del sistema</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-cyan-200/30 bg-gradient-to-br from-card to-card/70">
          <CardHeader>
            <CardTitle>Control de actuadores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => void sendManual("START_TREATMENT")}>Iniciar ciclo</Button>
              <Button variant="destructive" onClick={() => void sendManual("STOP_TREATMENT")}>Parada emergencia</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="border-emerald-500/40 text-emerald-400" onClick={() => void sendManual("PUMP_ON")}>Bomba ON</Button>
              <Button variant="outline" className="border-zinc-500/40" onClick={() => void sendManual("PUMP_OFF")}>Bomba OFF</Button>
              <Button variant="outline" className="border-cyan-500/40 text-cyan-400" onClick={() => void sendManual("VALVE_OPEN")}>Valvula abrir</Button>
              <Button variant="outline" className="border-zinc-500/40" onClick={() => void sendManual("VALVE_CLOSE")}>Valvula cerrar</Button>
            </div>

            <div className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                <span>Pulso de valvula</span>
                <span className="font-mono text-cyan-400">{pulseMs} ms</span>
              </div>
              <input
                type="range"
                min={100}
                max={2000}
                step={100}
                value={pulseMs}
                onChange={(e) => setPulseMs(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <Button className="w-full" onClick={() => void sendManual("VALVE_PULSE", { durationMs: pulseMs })}>
                Enviar pulso
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-200/30 bg-gradient-to-br from-card to-card/70">
          <CardHeader>
            <CardTitle>Indicadores en tiempo real</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Estado</span>
              <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-cyan-400">{status?.status?.state ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Presion actual</span>
              <span className="font-mono">{status?.status?.pressureKpa ?? 0} kPa</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Temperatura</span>
              <span className="font-mono">{status?.status?.temperatureC ?? 0} C</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Fuerza</span>
              <span className="font-mono">{Number(status?.status?.forceNewtons ?? 0).toFixed(2)} N</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Config objetivo</span>
              <span className="font-mono">
                {status?.status?.targetPressureKpa ?? 0} kPa / {Math.floor((status?.status?.configuredHoldTimeMs ?? 0) / 1000)} s
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Release / Ciclos</span>
              <span className="font-mono">
                {Math.floor((status?.status?.configuredReleaseTimeMs ?? 0) / 1000)} s / {status?.status?.configuredCycleTarget ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Ultimo ACK</span>
              <span className="font-mono text-xs">
                {status?.status?.lastAck?.command
                  ? `${status.status.lastAck.command} ${status.status.lastAck.result ?? ""}`
                  : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Conexion MQTT</span>
              <span className={status?.status?.connected ? "text-emerald-400" : "text-red-400"}>
                {status?.status?.connected ? "ACTIVA" : "DESCONECTADA"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Curva de presion</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <XAxis dataKey="idx" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="pressure"
                  stroke="#00d4ff"
                  fill="#00d4ff33"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Curva de temperatura</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <XAxis dataKey="idx" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="temp"
                  stroke="#22c55e"
                  fill="#22c55e33"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
