import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import axios from "@/lib/axios";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PatientRow = {
  id: string;
  fullname: string;
  age?: number;
  sex?: "masculino" | "femenino" | "otro";
  document?: string;
  phone?: string;
  diagnosis?: string;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  registeredAt?: string;
};

type Treatment = {
  id: string;
  patientId: string;
  patientName?: string;
  intensity?: string;
  status: string;
  cycleCount: number;
  cycleTarget?: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds?: number;
  medicalReport?: string | null;
  groups?: Array<{
    groupId: number;
    zone: string;
    targetPressureKpa: number;
    cycleTarget: number;
    cycleCount?: number;
  }> | null;
};

const zoneLabels: Record<string, string> = {
  pantorrilla_izquierda: "Pantorrilla izquierda",
  pantorrilla_derecha: "Pantorrilla derecha",
  pie_izquierdo: "Pie izquierdo",
  pie_derecho: "Pie derecho",
};

export function DoctorPatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullname: "",
    age: "",
    sex: "" as "masculino" | "femenino" | "otro" | "",
    document: "",
    phone: "",
    diagnosis: "",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<PatientRow | null>(null);
  const [editForm, setEditForm] = useState({
    fullname: "",
    age: "",
    sex: "" as "masculino" | "femenino" | "otro" | "",
    document: "",
    phone: "",
    diagnosis: "",
  });

  const [fichaOpen, setFichaOpen] = useState(false);
  const [fichaPatient, setFichaPatient] = useState<PatientRow | null>(null);
  const [fichaTreatments, setFichaTreatments] = useState<Treatment[]>([]);

  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionTreatment, setSessionTreatment] = useState<Treatment | null>(null);

  const load = async () => {
    const [patientsRes, treatmentsRes] = await Promise.all([
      axios.get("/doctor/patients"),
      axios.get("/doctor/treatments/history"),
    ]);
    setPatients(patientsRes.data);
    setTreatments(treatmentsRes.data);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      patients.filter((p) =>
        `${p.fullname} ${p.document ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [patients, search],
  );

  const handleCreate = async () => {
    if (!createForm.fullname) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      await axios.post("/doctor/patients", {
        fullname: createForm.fullname,
        age: createForm.age ? Number(createForm.age) : undefined,
        sex: createForm.sex || undefined,
        document: createForm.document || undefined,
        phone: createForm.phone || undefined,
        diagnosis: createForm.diagnosis || undefined,
      });
      toast.success("Paciente registrado correctamente");
      setCreateOpen(false);
      setCreateForm({ fullname: "", age: "", sex: "", document: "", phone: "", diagnosis: "" });
      await load();
    } catch {
      toast.error("Error al registrar paciente");
    }
  };

  const openEdit = (patient: PatientRow) => {
    setEditPatient(patient);
    setEditForm({
      fullname: patient.fullname,
      age: patient.age != null ? String(patient.age) : "",
      sex: patient.sex ?? "",
      document: patient.document ?? "",
      phone: patient.phone ?? "",
      diagnosis: patient.diagnosis ?? "",
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editPatient) return;
    try {
      await axios.put(`/doctor/patients/${editPatient.id}`, {
        fullname: editForm.fullname,
        age: editForm.age ? Number(editForm.age) : undefined,
        sex: editForm.sex || undefined,
        document: editForm.document || undefined,
        phone: editForm.phone || undefined,
        diagnosis: editForm.diagnosis || undefined,
      });
      toast.success("Datos del paciente actualizados");
      setEditOpen(false);
      await load();
    } catch {
      toast.error("Error al actualizar paciente");
    }
  };

  const openFicha = async (patient: PatientRow) => {
    setFichaPatient(patient);
    const patientTreatments = treatments
      .filter((t) => t.patientId === patient.id)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    setFichaTreatments(patientTreatments);
    setFichaOpen(true);
  };

  const openSession = (treatment: Treatment) => {
    setSessionTreatment(treatment);
    setSessionOpen(true);
  };

  const patientSessions = useMemo(
    () => (fichaPatient ? treatments.filter((t) => t.patientId === fichaPatient.id) : []),
    [fichaPatient, treatments],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Gestión clínica</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Pacientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Busque, registre y consulte la ficha clínica de cada paciente.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar paciente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de pacientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o documento"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Paciente</th>
                  <th className="px-4 py-3 font-semibold">Edad</th>
                  <th className="px-4 py-3 font-semibold">Documento</th>
                  <th className="px-4 py-3 font-semibold">Teléfono</th>
                  <th className="px-4 py-3 font-semibold">Sesiones</th>
                  <th className="px-4 py-3 font-semibold">Última terapia</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => {
                  const sessions = treatments.filter((t) => t.patientId === patient.id);
                  const lastSession = sessions[0];
                  return (
                    <tr key={patient.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {patient.fullname.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium">{patient.fullname}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{patient.age ?? "-"} años</td>
                      <td className="px-4 py-3 text-muted-foreground">{patient.document ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{patient.phone ?? "-"}</td>
                      <td className="px-4 py-3">{sessions.length}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lastSession ? new Date(lastSession.startedAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openFicha(patient)}>
                            Ver ficha
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(patient)}>
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No se encontraron pacientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar nuevo paciente</DialogTitle>
            <DialogDescription>Complete los datos básicos y clínicos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nombre completo</Label>
              <Input
                value={createForm.fullname}
                onChange={(e) => setCreateForm({ ...createForm, fullname: e.target.value })}
                placeholder="Ej: Juan Pérez López"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Edad</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={createForm.age}
                onChange={(e) => setCreateForm({ ...createForm, age: e.target.value })}
                placeholder="Ej: 45"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={createForm.sex}
                onChange={(e) => setCreateForm({ ...createForm, sex: e.target.value as typeof createForm.sex })}
              >
                <option value="">Seleccionar...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Documento (CI)</Label>
              <Input
                value={createForm.document}
                onChange={(e) => setCreateForm({ ...createForm, document: e.target.value })}
                placeholder="Ej: 5489217"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="Ej: 712 452 80"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Diagnóstico u observaciones</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={createForm.diagnosis}
                onChange={(e) => setCreateForm({ ...createForm, diagnosis: e.target.value })}
                placeholder="Ej: Insuficiencia venosa periférica"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Registrar paciente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar paciente</DialogTitle>
            <DialogDescription>Actualice los datos de la ficha.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nombre completo</Label>
              <Input
                value={editForm.fullname}
                onChange={(e) => setEditForm({ ...editForm, fullname: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Edad</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={editForm.age}
                onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={editForm.sex}
                onChange={(e) => setEditForm({ ...editForm, sex: e.target.value as typeof editForm.sex })}
              >
                <option value="">Seleccionar...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Documento (CI)</Label>
              <Input
                value={editForm.document}
                onChange={(e) => setEditForm({ ...editForm, document: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Diagnóstico u observaciones</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={editForm.diagnosis}
                onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fichaOpen} onOpenChange={setFichaOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{fichaPatient?.fullname}</DialogTitle>
            <DialogDescription>
              Ficha clínica · CI {fichaPatient?.document ?? "N/A"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Datos personales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Edad</span>
                  <span className="font-medium">{fichaPatient?.age ?? "-"} años</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sexo</span>
                  <span className="font-medium">{fichaPatient?.sex ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teléfono</span>
                  <span className="font-medium">{fichaPatient?.phone ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registro</span>
                  <span className="font-medium">
                    {fichaPatient?.registeredAt
                      ? new Date(fichaPatient.registeredAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Información clínica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">{fichaPatient?.diagnosis ?? "Sin diagnóstico registrado"}</p>
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">Tratamientos</span>
                  <span className="font-medium">{patientSessions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Última terapia</span>
                  <span className="font-medium">
                    {patientSessions[0]
                      ? new Date(patientSessions[0].startedAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historial de sesiones</CardTitle>
            </CardHeader>
            <CardContent>
              {fichaTreatments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sin terapias registradas
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-left">
                      <tr>
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2">Protocolo</th>
                        <th className="px-3 py-2">Zonas</th>
                        <th className="px-3 py-2">Estado</th>
                        <th className="px-3 py-2">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fichaTreatments.slice(0, 10).map((t) => (
                        <tr key={t.id} className="border-t">
                          <td className="px-3 py-2">
                            {new Date(t.startedAt).toLocaleDateString()}
                            <br />
                            <small className="text-muted-foreground">
                              {new Date(t.startedAt).toLocaleTimeString()}
                            </small>
                          </td>
                          <td className="px-3 py-2">{(t.intensity ?? "-").toUpperCase()}</td>
                          <td className="px-3 py-2">{t.groups?.length ?? 1} zonas</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                t.status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : t.status === "interrupted"
                                    ? "bg-amber-500/10 text-amber-600"
                                    : "bg-blue-500/10 text-blue-600"
                              }`}
                            >
                              {t.status === "completed"
                                ? "Completado"
                                : t.status === "interrupted"
                                  ? "Interrumpido"
                                  : "En curso"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Button size="sm" variant="outline" onClick={() => openSession(t)}>
                              Ver registro
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Sesión · {sessionTreatment?.patientName ?? fichaPatient?.fullname}
            </DialogTitle>
            <DialogDescription>
              {sessionTreatment
                ? `${new Date(sessionTreatment.startedAt).toLocaleDateString()} a las ${new Date(sessionTreatment.startedAt).toLocaleTimeString()}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {sessionTreatment && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duración</span>
                      <span className="font-medium">{sessionTreatment.durationSeconds ?? 0}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Zonas</span>
                      <span className="font-medium">{sessionTreatment.groups?.length ?? 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado</span>
                      <span
                        className={`font-medium ${
                          sessionTreatment.status === "completed"
                            ? "text-emerald-600"
                            : sessionTreatment.status === "interrupted"
                              ? "text-amber-600"
                              : "text-blue-600"
                        }`}
                      >
                        {sessionTreatment.status === "completed"
                          ? "Completado"
                          : sessionTreatment.status === "interrupted"
                            ? "Interrumpido"
                            : "En curso"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ciclos</span>
                      <span className="font-medium">
                        {sessionTreatment.cycleCount} / {sessionTreatment.cycleTarget ?? "-"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Protocolo</span>
                      <span className="font-medium">{(sessionTreatment.intensity ?? "-").toUpperCase()}</span>
                    </div>
                    {sessionTreatment.groups?.map((g) => (
                      <div key={g.groupId} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {zoneLabels[g.zone] ?? `Grupo ${g.groupId}`}
                        </span>
                        <span className="font-medium">{g.targetPressureKpa} kPa</span>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reporte médico</span>
                      <span className="font-medium">
                        {sessionTreatment.medicalReport ? "Con reporte" : "Sin reporte"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {sessionTreatment.medicalReport && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Registro médico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{sessionTreatment.medicalReport}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Presión por grupo</CardTitle>
                </CardHeader>
                <CardContent className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={sessionTreatment.groups?.map((g) => ({
                        name: zoneLabels[g.zone] ?? `G${g.groupId}`,
                        pressure: g.targetPressureKpa,
                        cycles: g.cycleCount ?? sessionTreatment.cycleCount,
                      })) ?? []}
                    >
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} unit=" kPa" />
                      <Tooltip />
                      <Line type="monotone" dataKey="pressure" stroke="#1673c8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
