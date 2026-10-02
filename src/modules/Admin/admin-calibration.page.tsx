import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, FlaskConical, Gauge, History, Save, Wrench } from "lucide-react";
import type { Calibration, DeviceStatus, GroupTelemetry } from "./admin.types";

type ConfigRow = {
  id: string;
  intensity: "low" | "medium" | "high";
  targetPressureKpa: number;
  inflateTimeSeconds: number;
  holdTimeSeconds: number;
  releaseTimeSeconds: number;
  cycleTarget: number;
};

const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
  (error instanceof Error ? error.message : "Operación fallida");

export function AdminCalibrationPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [latest, setLatest] = useState<Calibration[]>([]);
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [groupId, setGroupId] = useState(1);
  const [sensorType, setSensorType] = useState<"pressure" | "force">("pressure");
  const [referenceValue, setReferenceValue] = useState(5);
  const [referenceUnit, setReferenceUnit] = useState<"kPa" | "N" | "kg">("kPa");
  const [notes, setNotes] = useState("");
  const [activeCalibration, setActiveCalibration] = useState<Calibration | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [configResponse, historyResponse, latestResponse, statusResponse] = await Promise.all([
      axios.get<ConfigRow[]>("/configurations"),
      axios.get<{ items: Calibration[] }>("/calibrations?page=1&pageSize=100"),
      axios.get<Calibration[]>("/calibrations/latest"),
      axios.get<DeviceStatus>("/device/status"),
    ]);
    setConfigs(configResponse.data);
    setCalibrations(historyResponse.data.items);
    setLatest(latestResponse.data);
    setStatus(statusResponse.data);
  };

  useEffect(() => {
    void load().catch((error) => toast.error(errorMessage(error)));
  }, []);

  useEffect(() => {
    setReferenceUnit(sensorType === "pressure" ? "kPa" : "N");
    setReferenceValue(sensorType === "pressure" ? 5 : 10);
    setActiveCalibration(null);
  }, [sensorType, groupId]);

  const saveProfile = async (row: ConfigRow) => {
    try {
      await axios.patch(`/configurations/${row.intensity}`, {
        targetPressureKpa: row.targetPressureKpa,
        inflateTimeSeconds: row.inflateTimeSeconds,
        holdTimeSeconds: row.holdTimeSeconds,
        releaseTimeSeconds: row.releaseTimeSeconds,
        cycleTarget: row.cycleTarget,
      });
      toast.success(`Perfil ${profileLabel(row.intensity)} actualizado`);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const updateProfile = (id: string, key: keyof ConfigRow, value: number) =>
    setConfigs((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));

  const enterMaintenance = async () => {
    setBusy(true);
    try {
      await axios.post("/device/maintenance/enter");
      toast.success("Modo mantenimiento confirmado");
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const tare = async () => {
    setBusy(true);
    try {
      const response = await axios.post<Calibration>("/calibrations/tare", { groupId, sensorType, notes });
      setActiveCalibration(response.data);
      toast.success("Cero estable registrado. Aplique ahora la referencia conocida.");
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const completeCalibration = async () => {
    if (!activeCalibration) return;
    setBusy(true);
    try {
      const response = await axios.post<Calibration>("/calibrations/reference", {
        calibrationId: activeCalibration.id,
        referenceValue,
        referenceUnit,
        notes,
      });
      toast.success(`Calibración completada. Coeficiente ${Number(response.data.coefficient ?? 0).toFixed(5)}`);
      setActiveCalibration(null);
      setNotes("");
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const selectedLive = status?.groups?.find((group) => group.groupId === groupId);
  const calibrationReady = Boolean(status?.online && status.maintenanceMode && !status.treatmentRunning);
  const latestMap = useMemo(
    () => new Map(latest.map((item) => [`${item.groupId}:${item.sensorType}`, item])),
    [latest],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Configuración trazable</p>
        <h2 className="text-2xl font-semibold tracking-tight">Calibración y perfiles</h2>
        <p className="text-sm text-muted-foreground">Ajustes clínicos y calibración física individual de los ocho sensores.</p>
      </div>

      <Tabs defaultValue="sensors" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="sensors"><FlaskConical className="mr-2 h-4 w-4" />Sensores</TabsTrigger>
          <TabsTrigger value="profiles"><Gauge className="mr-2 h-4 w-4" />Perfiles</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="sensors" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">Estado de calibración</p>
                <p className="text-sm text-muted-foreground">ESP32 {status?.online ? "online" : "offline"} · versión {status?.calibrationVersion ?? 0}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={status?.maintenanceMode ? "default" : "outline"}>{status?.maintenanceMode ? "Mantenimiento activo" : "Modo normal"}</Badge>
                {!status?.maintenanceMode && (
                  <Button disabled={!status?.online || status?.treatmentRunning || busy} onClick={() => void enterMaintenance()}>
                    <Wrench className="mr-2 h-4 w-4" />Activar mantenimiento
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader><CardTitle>Asistente guiado</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm"><span className="text-muted-foreground">Grupo</span><select className="h-10 w-full rounded-md border bg-background px-3" value={groupId} onChange={(event) => setGroupId(Number(event.target.value))}>{[1,2,3,4].map((value) => <option key={value} value={value}>Grupo {value}</option>)}</select></label>
                  <label className="space-y-1 text-sm"><span className="text-muted-foreground">Sensor</span><select className="h-10 w-full rounded-md border bg-background px-3" value={sensorType} onChange={(event) => setSensorType(event.target.value as "pressure" | "force")}><option value="pressure">Presión MPS20</option><option value="force">Fuerza FSR</option></select></label>
                </div>

                <LiveReading group={selectedLive} sensorType={sensorType} />

                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span><div><p className="font-medium">Puesta a cero</p><p className="text-xs text-muted-foreground">Retire presión o carga del sensor y espere una lectura estable.</p></div></div>
                  <Button className="w-full" variant="outline" disabled={!calibrationReady || busy || Boolean(activeCalibration)} onClick={() => void tare()}>Registrar cero</Button>
                </div>

                <div className={`rounded-xl border p-4 ${activeCalibration ? "border-primary/40 bg-primary/5" : "opacity-60"}`}>
                  <div className="mb-3 flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span><div><p className="font-medium">Referencia conocida</p><p className="text-xs text-muted-foreground">Aplique una presión o peso certificado y espere estabilidad.</p></div></div>
                  <div className="grid grid-cols-[1fr_110px] gap-2">
                    <Input type="number" min={0.01} step={0.1} value={referenceValue} onChange={(event) => setReferenceValue(Number(event.target.value))} disabled={!activeCalibration} />
                    <select className="h-10 rounded-md border bg-background px-3" value={referenceUnit} disabled={!activeCalibration || sensorType === "pressure"} onChange={(event) => setReferenceUnit(event.target.value as "kPa" | "N" | "kg")}><option value={sensorType === "pressure" ? "kPa" : "N"}>{sensorType === "pressure" ? "kPa" : "N"}</option>{sensorType === "force" && <option value="kg">kg</option>}</select>
                  </div>
                  <Input className="mt-2" placeholder="Observaciones opcionales" value={notes} onChange={(event) => setNotes(event.target.value)} />
                  <Button className="mt-3 w-full" disabled={!activeCalibration || busy} onClick={() => void completeCalibration()}><CheckCircle2 className="mr-2 h-4 w-4" />Calcular y guardar coeficiente</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Matriz de sensores</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {[1,2,3,4].flatMap((group) => (["pressure", "force"] as const).map((sensor) => {
                  const item = latestMap.get(`${group}:${sensor}`);
                  const live = status?.groups?.find((entry) => entry.groupId === group);
                  const available = sensor === "pressure" ? live?.pressureSensorAvailable : live?.forceSensorAvailable;
                  return <div key={`${group}-${sensor}`} className="rounded-xl border p-4"><div className="flex items-center justify-between"><p className="font-medium">G{group} · {sensor === "pressure" ? "Presión" : "Fuerza"}</p><span className={`h-2.5 w-2.5 rounded-full ${available ? "bg-emerald-500" : "bg-red-500"}`} /></div><p className="mt-2 font-mono text-sm">{item?.coefficient ? Number(item.coefficient).toFixed(5) : "Sin calibración"}</p><p className="mt-1 text-xs text-muted-foreground">{item?.completedAt ? new Date(item.completedAt).toLocaleString() : "No existe registro"}</p></div>;
                }))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {configs.map((row) => (
              <Card key={row.id}>
                <CardHeader><CardTitle>{profileLabel(row.intensity)}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <ProfileField label="Presión objetivo" unit="kPa" value={row.targetPressureKpa} min={1} max={40} step={0.5} onChange={(value) => updateProfile(row.id, "targetPressureKpa", value)} />
                  <ProfileField label="Tiempo de inflado" unit="s" value={row.inflateTimeSeconds} min={1} max={60} onChange={(value) => updateProfile(row.id, "inflateTimeSeconds", value)} />
                  <ProfileField label="Mantener presión" unit="s" value={row.holdTimeSeconds} min={1} max={60} onChange={(value) => updateProfile(row.id, "holdTimeSeconds", value)} />
                  <ProfileField label="Liberación" unit="s" value={row.releaseTimeSeconds} min={1} max={60} onChange={(value) => updateProfile(row.id, "releaseTimeSeconds", value)} />
                  <ProfileField label="Ciclos" unit="" value={row.cycleTarget} min={1} max={100} onChange={(value) => updateProfile(row.id, "cycleTarget", value)} />
                  <Button className="w-full" onClick={() => void saveProfile(row)}><Save className="mr-2 h-4 w-4" />Guardar perfil</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Calibraciones realizadas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {calibrations.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border p-3 text-sm sm:grid-cols-[100px_120px_1fr_auto]"><span>Grupo {item.groupId}</span><span>{item.sensorType === "pressure" ? "Presión" : "Fuerza"}</span><span className="text-muted-foreground">Coeficiente {item.coefficient ? Number(item.coefficient).toFixed(6) : "-"} · usuario {item.actorUserId.slice(0, 8)}</span><Badge variant={item.status === "completed" ? "default" : item.status === "failed" ? "destructive" : "secondary"}>{item.status}</Badge></div>)}
              {!calibrations.length && <p className="text-sm text-muted-foreground">No hay calibraciones registradas.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LiveReading({ group, sensorType }: { group?: GroupTelemetry; sensorType: "pressure" | "force" }) {
  const pressure = sensorType === "pressure";
  return <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4"><div><p className="text-xs uppercase text-muted-foreground">Lectura actual</p><p className="mt-1 font-mono text-xl font-semibold">{pressure ? `${Number(group?.pressureKpa ?? 0).toFixed(3)} kPa` : `${Number(group?.forceNewtons ?? 0).toFixed(3)} N`}</p></div><div><p className="text-xs uppercase text-muted-foreground">Valor crudo</p><p className="mt-1 font-mono text-xl font-semibold">{pressure ? group?.pressureRaw ?? 0 : group?.forceRaw ?? 0}</p></div></div>;
}

function ProfileField({ label, unit, value, min, max, step = 1, onChange }: { label: string; unit: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <label className="block space-y-1"><span className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><span className="font-mono text-foreground">{value} {unit}</span></span><input className="w-full accent-primary" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><Input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function profileLabel(value: ConfigRow["intensity"]) {
  return value === "low" ? "Intensidad baja" : value === "medium" ? "Intensidad media" : "Intensidad alta";
}
