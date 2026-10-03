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
import { Eye, EyeOff, Plus, Search } from "lucide-react";

type UserRow = {
  id: string;
  fullname: string;
  email: string;
  type: "admin" | "doctor" | "technical";
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  createdAt?: string;
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  doctor: "Médico / Enfermería",
  technical: "Técnico Biomédico",
};

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "doctor" | "technical">("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullname: "",
    email: "",
    password: "",
    role: "doctor" as "admin" | "doctor" | "technical",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ fullname: "", email: "", role: "doctor" as string });

  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusUser, setStatusUser] = useState<UserRow | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [statusError, setStatusError] = useState("");

  const load = async () => {
    const res = await axios.get("/admin/users");
    setUsers(res.data);
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

  const handleCreate = async () => {
    if (!createForm.fullname || !createForm.email || !createForm.password) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }
    setCreateConfirmOpen(true);
  };

  const confirmCreate = async () => {
    try {
      await axios.post("/admin/users", {
        fullname: createForm.fullname,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
      });
      toast.success("Usuario creado correctamente");
      setCreateConfirmOpen(false);
      setCreateOpen(false);
      setCreateForm({ fullname: "", email: "", password: "", role: "doctor" });
      await load();
    } catch {
      toast.error("Error al crear usuario");
    }
  };

  const openEdit = (user: UserRow) => {
    setEditUser(user);
    setEditForm({ fullname: user.fullname, email: user.email, role: user.type });
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editUser) return;
    setEditConfirmOpen(true);
  };

  const confirmEdit = async () => {
    if (!editUser) return;
    try {
      await axios.put(`/admin/users/${editUser.id}`, {
        fullname: editForm.fullname,
        email: editForm.email,
      });
      toast.success("Usuario actualizado");
      setEditConfirmOpen(false);
      setEditOpen(false);
      await load();
    } catch {
      toast.error("Error al actualizar usuario");
    }
  };

  const openReset = (user: UserRow) => {
    setResetUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setResetOpen(true);
  };

  const handleReset = () => {
    setResetError("");
    if (newPassword.length < 8) {
      setResetError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Las contraseñas no coinciden");
      return;
    }
    setResetConfirmOpen(true);
  };

  const confirmReset = async () => {
    if (!resetUser) return;
    try {
      await axios.patch(`/admin/users/${resetUser.id}/password`, { password: newPassword });
      toast.success("Contraseña restablecida correctamente");
      setResetConfirmOpen(false);
      setResetOpen(false);
    } catch {
      toast.error("Error al restablecer contraseña");
    }
  };

  const openStatus = (user: UserRow) => {
    setStatusUser(user);
    setAdminPassword("");
    setStatusError("");
    setStatusOpen(true);
  };

  const handleStatus = async () => {
    if (!statusUser) return;
    setStatusError("");
    if (!adminPassword) {
      setStatusError("Ingrese su contraseña de administrador");
      return;
    }
    try {
      const verifyRes = await axios.post("/admin/users/verify-password", {
        password: adminPassword,
      });
      if (!verifyRes.data.valid) {
        setStatusError("Contraseña incorrecta");
        return;
      }
      await axios.patch(`/admin/users/${statusUser.id}/status`, {
        status: statusUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      toast.success(
        `${statusUser.fullname} fue ${statusUser.status === "ACTIVE" ? "desactivado" : "activado"} correctamente`
      );
      setStatusOpen(false);
      await load();
    } catch {
      setStatusError("Contraseña de administrador incorrecta");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Gestión de accesos</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Usuarios</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cree cuentas, asigne perfiles y administre el estado de acceso.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, usuario o rol"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <select
              className="h-10 w-48 rounded-md border bg-background px-3"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            >
              <option value="all">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="doctor">Médico / Enfermería</option>
              <option value="technical">Técnico Biomédico</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Registro</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {user.fullname.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium">{user.fullname}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">{roleLabels[user.type] ?? user.type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {user.status === "ACTIVE" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openReset(user)}>
                          Contraseña
                        </Button>
                        <Button
                          size="sm"
                          variant={user.status === "ACTIVE" ? "destructive" : "outline"}
                          onClick={() => openStatus(user)}
                        >
                          {user.status === "ACTIVE" ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear usuario</DialogTitle>
            <DialogDescription>
              Asigne el perfil de acceso correspondiente a sus funciones.
            </DialogDescription>
          </DialogHeader>
          <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre completo</Label>
                <Input
                  value={createForm.fullname}
                  onChange={(e) => setCreateForm({ ...createForm, fullname: e.target.value })}
                  placeholder="Ej: Dr. Juan Pérez"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Correo electrónico</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="usuario@sebastian.local"
                  autoComplete="off"
                />
              </div>
              <PasswordInput
                id="create-password"
                label="Contraseña temporal"
                value={createForm.password}
                onChange={(v) => setCreateForm({ ...createForm, password: v })}
                placeholder="Mínimo 8 caracteres"
              />
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, role: e.target.value as "admin" | "doctor" | "technical" })
                  }
                >
                  <option value="doctor">Médico / Enfermería</option>
                  <option value="technical">Técnico Biomédico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear usuario</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createConfirmOpen} onOpenChange={setCreateConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar creación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de crear el usuario {createForm.fullname} con rol {roleLabels[createForm.role]}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmCreate}>Sí, crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Actualice los datos del usuario.
            </DialogDescription>
          </DialogHeader>
          <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleEdit(); }}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre completo</Label>
                <Input
                  value={editForm.fullname}
                  onChange={(e) => setEditForm({ ...editForm, fullname: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Correo electrónico</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={editForm.role}
                  disabled
                >
                  <option value="doctor">Médico / Enfermería</option>
                  <option value="technical">Técnico Biomédico</option>
                  <option value="admin">Administrador</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  El rol no se puede cambiar después de la creación.
                </p>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editConfirmOpen} onOpenChange={setEditConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar edición</DialogTitle>
            <DialogDescription>
              ¿Está seguro de guardar los cambios para {editForm.fullname}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmEdit}>Sí, guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>
              {resetUser?.fullname} · {resetUser?.email}
            </DialogDescription>
          </DialogHeader>
          <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleReset(); }}>
            <div className="space-y-4">
              <PasswordInput
                id="new-password"
                label="Nueva contraseña"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Mínimo 8 caracteres"
              />
              <PasswordInput
                id="confirm-password"
                label="Confirmar contraseña"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repita la contraseña"
              />
              {resetError && <p className="text-sm text-destructive">{resetError}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setResetOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar contraseña</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar restablecimiento</DialogTitle>
            <DialogDescription>
              ¿Está seguro de restablecer la contraseña de {resetUser?.fullname}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmReset}>Sí, restablecer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusUser?.status === "ACTIVE" ? "Desactivar" : "Activar"} usuario
            </DialogTitle>
            <DialogDescription>
              Confirme la acción para la cuenta {statusUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleStatus(); }}>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                {statusUser?.status === "ACTIVE"
                  ? `${statusUser?.fullname} no podrá iniciar sesión mientras permanezca desactivado.`
                  : `${statusUser?.fullname} recuperará inmediatamente el acceso al sistema.`}
              </div>
              <PasswordInput
                id="admin-password"
                label="Contraseña del administrador"
                value={adminPassword}
                onChange={setAdminPassword}
                placeholder="Ingrese su contraseña para confirmar"
              />
              {statusError && <p className="text-sm text-destructive">{statusError}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setStatusOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={statusUser?.status === "ACTIVE" ? "destructive" : "default"}
              >
                {statusUser?.status === "ACTIVE" ? "Sí, desactivar" : "Sí, activar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
