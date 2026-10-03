import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AdminSettingsPage() {
  const [facilityName, setFacilityName] = useState("Laboratorio de Ingeniería Biomédica");
  const [facilityId, setFacilityId] = useState("LAB-BIOMED-01");
  const [alarmNotifications, setAlarmNotifications] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);
  const [calibrationReminder, setCalibrationReminder] = useState(false);
  const [alertSound, setAlertSound] = useState(true);

  const handleSave = () => {
    toast("Configuración guardada correctamente.");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Preferencias de plataforma
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Configuración general</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Identidad visual, establecimiento y notificaciones del sistema.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">Identidad del sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del establecimiento</label>
              <Input
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Identificador institucional</label>
              <Input
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">Interfaz y notificaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              label="Notificaciones de alarmas críticas"
              checked={alarmNotifications}
              onChange={setAlarmNotifications}
            />
            <ToggleRow
              label="Resumen diario de actividad"
              checked={dailySummary}
              onChange={setDailySummary}
            />
            <ToggleRow
              label="Recordatorio de calibración"
              checked={calibrationReminder}
              onChange={setCalibrationReminder}
            />
            <ToggleRow
              label="Sonido para alertas"
              checked={alertSound}
              onChange={setAlertSound}
            />
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave}>Guardar cambios</Button>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
