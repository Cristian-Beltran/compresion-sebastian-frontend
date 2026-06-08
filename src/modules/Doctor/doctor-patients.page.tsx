import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "@/lib/axios";

type PatientRow = {
  id: string;
  fullname: string;
  age?: number;
  sex?: "masculino" | "femenino" | "otro";
  status: "ACTIVE" | "INACTIVE" | "DELETED";
};

export function DoctorPatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PatientRow | null>(null);
  const [createName, setCreateName] = useState("");
  const [createAge, setCreateAge] = useState("");
  const [createSex, setCreateSex] = useState<PatientRow["sex"] | "">("");
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editSex, setEditSex] = useState<PatientRow["sex"] | "">("");

  const load = async () => {
    const res = await axios.get("/doctor/patients");
    setPatients(res.data);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      patients.filter((p) =>
        p.fullname.toLowerCase().includes(search.toLowerCase()),
      ),
    [patients, search],
  );

  const create = async () => {
    await axios.post("/doctor/patients", {
      fullname: createName,
      age: createAge === "" ? undefined : Number(createAge),
      sex: createSex || undefined,
    });
    setCreateName("");
    setCreateAge("");
    setCreateSex("");
    await load();
  };

  const select = (row: PatientRow) => {
    setSelected(row);
    setEditName(row.fullname);
    setEditAge(row.age === undefined || row.age === null ? "" : String(row.age));
    setEditSex(row.sex ?? "");
  };

  const save = async () => {
    if (!selected) return;
    await axios.put(`/doctor/patients/${selected.id}`, {
      fullname: editName,
      age: editAge === "" ? undefined : Number(editAge),
      sex: editSex || undefined,
    });
    await load();
  };

  const toggleStatus = async () => {
    if (!selected) return;
    await axios.patch(`/doctor/patients/${selected.id}/status`, {
      status: selected.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Pacientes</h2>

      <Card>
        <CardHeader><CardTitle>Registro de paciente</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr_120px_180px_auto]">
          <Input
            placeholder="Nombre completo"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <Input
            min={0}
            max={120}
            placeholder="Edad"
            type="number"
            value={createAge}
            onChange={(e) => setCreateAge(e.target.value)}
          />
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={createSex}
            onChange={(e) => setCreateSex(e.target.value as PatientRow["sex"] | "")}
          >
            <option value="">Sexo</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </select>
          <Button onClick={() => void create()}>Registrar</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Listado de pacientes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Buscar paciente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    <th className="px-3 py-2">ID paciente</th>
                    <th className="px-3 py-2">Nombre completo</th>
                    <th className="px-3 py-2">Edad</th>
                    <th className="px-3 py-2">Sexo</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                      <td className="px-3 py-2">{row.fullname}</td>
                      <td className="px-3 py-2">{row.age ?? "-"}</td>
                      <td className="px-3 py-2">{row.sex ?? "-"}</td>
                      <td className="px-3 py-2">{row.status}</td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => select(row)}>
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Edicion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!selected && <p className="text-sm text-muted-foreground">Selecciona paciente.</p>}
            {selected && (
              <>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                <Input
                  min={0}
                  max={120}
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                />
                <select
                  className="h-10 rounded-md border bg-background px-3"
                  value={editSex}
                  onChange={(e) => setEditSex(e.target.value as PatientRow["sex"] | "")}
                >
                  <option value="">Sexo</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
                <Button className="w-full" onClick={() => void save()}>Guardar cambios</Button>
                <Button variant="destructive" className="w-full" onClick={() => void toggleStatus()}>
                  {selected.status === "ACTIVE" ? "Inactivar" : "Activar"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
