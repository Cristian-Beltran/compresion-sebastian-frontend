import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "@/lib/axios";

type PatientRow = {
  id: string;
  fullname: string;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
};

export function DoctorPatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PatientRow | null>(null);
  const [createName, setCreateName] = useState("");
  const [editName, setEditName] = useState("");

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
    });
    setCreateName("");
    await load();
  };

  const select = (row: PatientRow) => {
    setSelected(row);
    setEditName(row.fullname);
  };

  const save = async () => {
    if (!selected) return;
    await axios.put(`/doctor/patients/${selected.id}`, { fullname: editName });
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
        <CardContent className="flex gap-2">
          <Input
            placeholder="Nombre completo"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
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
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2">{row.fullname}</td>
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
