import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  "Pacientes",
  "Tratamientos clínicos",
  "Historial clínico",
  "Diagnóstico de sensores",
  "Control de mantenimiento",
  "Calibración de protocolos",
  "Alertas técnicas",
  "Gestión de usuarios",
  "Registros globales",
  "Configuración general",
];

const roles = ["Médico/Enfermería", "Técnico Biomédico", "Administrador"];

const matrix: Record<string, boolean[]> = {
  Pacientes: [true, false, true],
  "Tratamientos clínicos": [true, false, true],
  "Historial clínico": [true, false, true],
  "Diagnóstico de sensores": [false, true, true],
  "Control de mantenimiento": [false, true, true],
  "Calibración de protocolos": [false, true, true],
  "Alertas técnicas": [true, true, true],
  "Gestión de usuarios": [false, false, true],
  "Registros globales": [false, false, true],
  "Configuración general": [false, false, true],
};

export function AdminPermissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Gobierno del sistema
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Roles y permisos
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Matriz de alcance funcional para cada perfil de acceso.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Matriz de permisos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Módulo</th>
                  {roles.map((role) => (
                    <th key={role} className="px-4 py-3 text-center font-semibold">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((module) => (
                  <tr key={module} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{module}</td>
                    {matrix[module].map((allowed, index) => (
                      <td key={index} className="px-4 py-3 text-center">
                        <span className={allowed ? "text-accent font-bold" : "text-muted-foreground"}>
                          {allowed ? "✓" : "—"}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
