import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "@/lib/axios";

type UserRow = {
  id: string;
  fullname: string;
  email: string;
  type: "admin" | "doctor";
  status: "ACTIVE" | "INACTIVE" | "DELETED";
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "doctor">("all");
  const [selected, setSelected] = useState<UserRow | null>(null);

  const [createForm, setCreateForm] = useState({
    fullname: "",
    email: "",
    password: "",
    role: "doctor",
  });

  const [editForm, setEditForm] = useState({ fullname: "", email: "" });
  const [password, setPassword] = useState("");

  const load = async () => {
    const res = await axios.get("/admin/users");
    setUsers(res.data);
    if (selected) {
      const fresh = res.data.find((x: UserRow) => x.id === selected.id) ?? null;
      setSelected(fresh);
      if (fresh) setEditForm({ fullname: fresh.fullname, email: fresh.email });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const byRole = roleFilter === "all" ? true : u.type === roleFilter;
      const text = `${u.fullname} ${u.email}`.toLowerCase();
      return byRole && text.includes(search.toLowerCase());
    });
  }, [users, search, roleFilter]);

  const selectUser = (user: UserRow) => {
    setSelected(user);
    setEditForm({ fullname: user.fullname, email: user.email });
    setPassword("");
  };

  const createUser = async () => {
    await axios.post("/admin/users", createForm);
    setCreateForm({ fullname: "", email: "", password: "", role: "doctor" });
    await load();
  };

  const saveProfile = async () => {
    if (!selected) return;
    await axios.put(`/admin/users/${selected.id}`, editForm);
    await load();
  };

  const savePassword = async () => {
    if (!selected || !password) return;
    await axios.patch(`/admin/users/${selected.id}/password`, { password });
    setPassword("");
  };

  const toggleStatus = async () => {
    if (!selected) return;
    await axios.patch(`/admin/users/${selected.id}/status`, {
      status: selected.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Gestion de usuarios</h2>

      <Card className="border-cyan-200/30 bg-gradient-to-br from-card to-card/70">
        <CardHeader>
          <CardTitle>Crear usuario</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Nombre completo"
            value={createForm.fullname}
            onChange={(e) => setCreateForm((p) => ({ ...p, fullname: e.target.value }))}
          />
          <Input
            placeholder="Correo"
            value={createForm.email}
            onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
          />
          <Input
            placeholder="Contrasena"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
          />
          <div className="flex gap-2">
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={createForm.role}
              onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
            >
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
            <Button onClick={() => void createUser()}>Crear</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Listado de usuarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Buscar por nombre o correo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="h-10 rounded-md border bg-background px-3"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
              >
                <option value="all">Todos</option>
                <option value="admin">Admin</option>
                <option value="doctor">Doctor</option>
              </select>
              <div className="text-sm text-muted-foreground flex items-center">{filtered.length} usuarios</div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Correo</th>
                    <th className="px-3 py-2">Rol</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2">{user.fullname}</td>
                      <td className="px-3 py-2">{user.email}</td>
                      <td className="px-3 py-2 uppercase">{user.type}</td>
                      <td className="px-3 py-2">
                        <span className={user.status === "ACTIVE" ? "text-emerald-500" : "text-amber-500"}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => selectUser(user)}>
                          Gestionar
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
          <CardHeader>
            <CardTitle>Edicion y seguridad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selected && <p className="text-sm text-muted-foreground">Selecciona un usuario para editarlo.</p>}
            {selected && (
              <>
                <p className="text-sm font-medium">{selected.fullname}</p>
                <Input
                  placeholder="Nombre"
                  value={editForm.fullname}
                  onChange={(e) => setEditForm((p) => ({ ...p, fullname: e.target.value }))}
                />
                <Input
                  placeholder="Correo"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                />
                <Button className="w-full" onClick={() => void saveProfile()}>
                  Guardar cambios
                </Button>

                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cambiar contrasena</p>
                  <Input
                    type="password"
                    placeholder="Nueva contrasena"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button variant="outline" className="w-full" onClick={() => void savePassword()}>
                    Actualizar contrasena
                  </Button>
                </div>

                <div className="border-t border-border pt-3">
                  <Button variant="destructive" className="w-full" onClick={() => void toggleStatus()}>
                    {selected.status === "ACTIVE" ? "Inactivar usuario" : "Activar usuario"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
