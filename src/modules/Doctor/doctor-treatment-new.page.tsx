import { Check, Play, Settings2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import axios from "@/lib/axios";
import { isAxiosError } from "axios";
import { toast } from "sonner";

type Intensity = "low" | "medium" | "high" | "custom";
type ZoneKey = "leftCalf" | "rightCalf" | "leftFoot" | "rightFoot";
type TreatmentZone = "pantorrilla_izquierda" | "pantorrilla_derecha" | "pie_izquierdo" | "pie_derecho";
type PatientRow = { id: string; fullname: string; mobilityLevel?: string };
type GroupConfig = { groupId: 1 | 2 | 3 | 4; zone: TreatmentZone; intensity: Intensity; targetPressureKpa: number; inflateTimeSeconds: number; holdTimeSeconds: number; releaseTimeSeconds: number; cycleTarget: number };
type Preset = Omit<GroupConfig, "groupId" | "zone">;

const ZONES: Record<ZoneKey, { groupId: 1 | 2 | 3 | 4; name: string; zone: TreatmentZone; path: string }> = {
  leftCalf: { groupId: 1, name: "Pantorrilla izquierda", zone: "pantorrilla_izquierda", path: "M104 55c-5 44-4 89 1 134l8 111c1 15 8 26 19 31l28-1c7-6 10-14 10-26l-2-111c4-49 2-95-5-138z" },
  rightCalf: { groupId: 2, name: "Pantorrilla derecha", zone: "pantorrilla_derecha", path: "M267 55c-7 43-9 89-5 138l-2 111c0 12 3 20 10 26l28 1c11-5 18-16 19-31l8-111c5-45 6-90 1-134z" },
  leftFoot: { groupId: 3, name: "Pie izquierdo", zone: "pie_izquierdo", path: "M117 338c-6 23-14 43-24 61-5 9-1 16 10 18l65 2c9-1 13-6 10-15l-13-65z" },
  rightFoot: { groupId: 4, name: "Pie derecho", zone: "pie_derecho", path: "M265 339l-13 65c-3 9 1 14 10 15l65-2c11-2 15-9 10-18-10-18-18-38-24-61z" },
};

const DEFAULTS: Record<Exclude<Intensity, "custom">, Preset> = {
  low: { intensity: "low", targetPressureKpa: 3, inflateTimeSeconds: 15, holdTimeSeconds: 8, releaseTimeSeconds: 3, cycleTarget: 20 },
  medium: { intensity: "medium", targetPressureKpa: 5, inflateTimeSeconds: 15, holdTimeSeconds: 10, releaseTimeSeconds: 3, cycleTarget: 8 },
  high: { intensity: "high", targetPressureKpa: 7, inflateTimeSeconds: 15, holdTimeSeconds: 12, releaseTimeSeconds: 3, cycleTarget: 30 },
};
const customFallback: Preset = { ...DEFAULTS.medium, intensity: "custom" };

const fromPreset = (zone: ZoneKey, preset: Preset): GroupConfig => ({ ...preset, groupId: ZONES[zone].groupId, zone: ZONES[zone].zone });
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function DoctorTreatmentNewPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [online, setOnline] = useState(false);
  const [presets, setPresets] = useState(DEFAULTS);
  const [customProfile, setCustomProfile] = useState<Preset>(customFallback);
  const [groups, setGroups] = useState<Partial<Record<ZoneKey, GroupConfig>>>({});
  const [activeZone, setActiveZone] = useState<ZoneKey | null>(null);
  const [draft, setDraft] = useState<GroupConfig | null>(null);
  const [patientId, setPatientId] = useState("");
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = async () => {
    const [patientRes, liveRes, configurationsRes, profileRes] = await Promise.all([
      axios.get("/doctor/patients"), axios.get("/doctor/dashboard/live"), axios.get("/configurations"), axios.get("/doctor/treatment-profile"),
    ]);
    setPatients(patientRes.data);
    setOnline(Boolean(liveRes.data?.status?.online ?? liveRes.data?.status?.connected));
    if (Array.isArray(configurationsRes.data)) {
      const next = { ...DEFAULTS };
      configurationsRes.data.forEach((row: Record<string, unknown>) => {
        if (row.intensity === "low" || row.intensity === "medium" || row.intensity === "high") {
          next[row.intensity] = { intensity: row.intensity, targetPressureKpa: number(row.targetPressureKpa), inflateTimeSeconds: number(row.inflateTimeSeconds) || 15, holdTimeSeconds: number(row.holdTimeSeconds), releaseTimeSeconds: 3, cycleTarget: number(row.cycleTarget) };
        }
      });
      setPresets(next);
    }
    if (profileRes.data?.targetPressureKpa) setCustomProfile({ ...customFallback, ...profileRes.data, intensity: "custom", releaseTimeSeconds: 3 });
  };

  useEffect(() => { void load().catch(() => toast.error("No se pudo cargar la información clínica")); }, []);
  const configured = useMemo(() => Object.entries(groups) as Array<[ZoneKey, GroupConfig]>, [groups]);

  const chooseZone = (zone: ZoneKey) => {
    const current = groups[zone];
    setActiveZone(zone);
    setDraft(current ?? fromPreset(zone, presets.medium));
  };
  const changeTab = (intensity: Intensity) => {
    if (!activeZone) return;
    setDraft(fromPreset(activeZone, intensity === "custom" ? customProfile : presets[intensity]));
  };
  const acceptZone = async () => {
    if (!activeZone || !draft) return;
    const next = { ...draft, releaseTimeSeconds: 3 };
    setGroups((current) => ({ ...current, [activeZone]: next }));
    if (next.intensity === "custom") {
      const profile: Preset = { ...next, intensity: "custom" };
      setCustomProfile(profile);
      try { await axios.put("/doctor/treatment-profile", profile); } catch { toast.error("No se pudo guardar el perfil personalizado"); }
    }
    setActiveZone(null); setDraft(null);
    toast.success(`${ZONES[activeZone].name} configurada`);
  };
  const removeZone = () => { if (activeZone) setGroups((current) => { const next = { ...current }; delete next[activeZone]; return next; }); setActiveZone(null); setDraft(null); };
  const requestStart = () => {
    if (!patientId) return toast.error("Selecciona un paciente antes de comenzar");
    if (!configured.length) return toast.error("Configura al menos una zona de tratamiento");
    setStartConfirmOpen(true);
  };
  const start = async () => {
    setStarting(true);
    try {
      const intensity: Intensity = configured.every(([, item]) => item.intensity === configured[0][1].intensity) ? configured[0][1].intensity : "custom";
      const response = await axios.post("/doctor/treatments/start", { patientId, intensity, groups: configured.map(([, item]) => item) });
      setStartConfirmOpen(false);
      navigate(`/doctor/treatments/${response.data.id}/active`);
    } catch (error) { toast.error((isAxiosError(error) && error.response?.data?.message) || "No se pudo iniciar la terapia"); } finally { setStarting(false); }
  };

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#1673c8]">Terapia neumática secuencial</p><h1 className="mt-1 text-3xl font-extrabold">Nueva sesión</h1><p className="mt-1 text-sm text-muted-foreground">Configure cada zona y luego seleccione al paciente para comenzar.</p></div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${online ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"}`}>{online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}Equipo {online ? "conectado" : "sin conexión"}</span></header>
    <section className="grid gap-4 xl:grid-cols-[minmax(430px,1.2fr)_minmax(330px,.8fr)]">
      <Card className="overflow-hidden border-[#dbe3ec]"><CardHeader><CardTitle>Seleccione las zonas de tratamiento</CardTitle><p className="text-sm text-muted-foreground">Verde: configurada · Rojo: configuración en curso.</p></CardHeader><CardContent className="p-4"><div className="relative grid min-h-[430px] place-items-center rounded-xl border bg-slate-50"><svg className="h-[400px] w-full max-w-[430px]" viewBox="0 0 430 470">{Object.entries(ZONES).map(([key, zone]) => { const state = activeZone === key ? "fill-[#e85b63]" : groups[key as ZoneKey] ? "fill-[#39aa82]" : "fill-[#d7dee5] hover:fill-[#ef8e92]"; return <path key={key} d={zone.path} className={`cursor-pointer stroke-white stroke-[3] transition ${state}`} onClick={() => chooseZone(key as ZoneKey)}><title>{zone.name}</title></path>; })}</svg></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(ZONES).map(([key, zone]) => <button type="button" key={key} onClick={() => chooseZone(key as ZoneKey)} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold"><span className={`h-2.5 w-2.5 rounded-full ${activeZone === key ? "bg-red-500" : groups[key as ZoneKey] ? "bg-emerald-600" : "bg-slate-300"}`} /><span>{zone.name}</span><span className="ml-auto text-[10px] text-muted-foreground">{activeZone === key ? "Configurando" : groups[key as ZoneKey] ? "Configurada" : "Sin seleccionar"}</span></button>)}</div></CardContent></Card>
      <div className="space-y-4"><Card><CardHeader><CardTitle className="flex gap-2 text-base"><Settings2 className="h-4 w-4 text-[#1673c8]" />Configuración seleccionada</CardTitle></CardHeader><CardContent>{!draft || !activeZone ? <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">Seleccione una zona. La configuración del protocolo aparecerá aquí.</div> : <ZoneConfigurator zone={ZONES[activeZone].name} draft={draft} onTab={changeTab} onChange={(patch) => setDraft({ ...draft, ...patch })} onAccept={() => void acceptZone()} onRemove={removeZone} />}</CardContent></Card>
      <Card><CardHeader><CardTitle>Paciente e inicio</CardTitle></CardHeader><CardContent className="space-y-3"><label className="grid gap-1.5 text-sm font-bold">Paciente<select className="h-11 rounded-lg border bg-background px-3 font-normal" value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="">Seleccione paciente…</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullname}{patient.mobilityLevel ? ` · ${patient.mobilityLevel.replaceAll("_", " ")}` : ""}</option>)}</select></label><Button className="h-12 w-full bg-[#0b5cab] font-extrabold hover:bg-[#1673c8]" disabled={!online || !configured.length || !patientId} onClick={requestStart}><Play className="h-4 w-4" />COMENZAR TRATAMIENTO</Button></CardContent></Card></div>
    </section>
    <Dialog open={startConfirmOpen} onOpenChange={setStartConfirmOpen}><DialogContent><DialogHeader><DialogTitle>¿Comenzar terapia?</DialogTitle><DialogDescription>Se iniciará el tratamiento para {patients.find((patient) => patient.id === patientId)?.fullname} con {configured.length} zona(s) configurada(s).</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setStartConfirmOpen(false)}>Cancelar</Button><Button onClick={() => void start()} disabled={starting}>{starting ? "INICIANDO…" : "Sí, comenzar"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function ZoneConfigurator({ zone, draft, onTab, onChange, onAccept, onRemove }: { zone: string; draft: GroupConfig; onTab: (intensity: Intensity) => void; onChange: (patch: Partial<GroupConfig>) => void; onAccept: () => void; onRemove: () => void }) {
  const fields: Array<[keyof GroupConfig, string, string, number, number, number?]> = [["targetPressureKpa", "Presión objetivo", "kPa", 1, 40, .5], ["inflateTimeSeconds", "Inflado", "s", 1, 60], ["holdTimeSeconds", "Mantenimiento", "s", 1, 60], ["cycleTarget", "Ciclos", "", 1, 100]];
  return <div className="space-y-4"><div><p className="text-xs font-bold uppercase text-[#1673c8]">{zone}</p><h3 className="font-extrabold">Configuración independiente</h3></div><div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"><button className={`rounded-md px-2 py-2 text-xs font-bold ${draft.intensity !== "custom" ? "bg-background shadow" : ""}`} onClick={() => onTab("medium")}>Predefinida</button><button className={`rounded-md px-2 py-2 text-xs font-bold ${draft.intensity === "custom" ? "bg-background shadow" : ""}`} onClick={() => onTab("custom")}>Personalizada</button></div>{draft.intensity !== "custom" && <select className="h-10 w-full rounded-md border bg-background px-3" value={draft.intensity} onChange={(event) => onTab(event.target.value as Intensity)}><option value="low">Baja intensidad</option><option value="medium">Media intensidad</option><option value="high">Alta intensidad</option></select>}<div className="grid grid-cols-2 gap-2">{fields.map(([key, label, unit, min, max, step]) => <label key={key} className="grid gap-1 text-xs font-bold">{label}<span className="relative"><input className="h-10 w-full rounded-lg border bg-background px-2 pr-7 text-sm font-normal" type="number" min={min} max={max} step={step} disabled={draft.intensity !== "custom"} value={draft[key] as number} onChange={(event) => onChange({ [key]: Number(event.target.value) })} /><small className="absolute right-2 top-3 text-muted-foreground">{unit}</small></span></label>)}</div><p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">Liberación fija de 3 segundos entre ciclos.</p><div className="grid grid-cols-[1fr_auto] gap-2"><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onAccept}><Check className="h-4 w-4" />Aceptar configuración</Button><Button variant="outline" onClick={onRemove}>Quitar</Button></div></div>;
}
