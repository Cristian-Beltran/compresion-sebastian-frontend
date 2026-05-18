import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "@/lib/axios";

type ConfigRow = {
  id: string;
  intensity: "low" | "medium" | "high";
  targetPressureKpa: number;
  holdTimeSeconds: number;
  releaseTimeSeconds: number;
  cycleTarget: number;
};

export function AdminCalibrationPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([]);

  const load = async () => {
    const res = await axios.get("/configurations");
    setConfigs(res.data);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (row: ConfigRow) => {
    await axios.patch(`/configurations/${row.intensity}`, {
      targetPressureKpa: row.targetPressureKpa,
      holdTimeSeconds: row.holdTimeSeconds,
      releaseTimeSeconds: row.releaseTimeSeconds,
      cycleTarget: row.cycleTarget,
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Calibracion y configuraciones</h2>
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones de terapia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {configs.map((row, index) => (
            <div key={row.id} className="rounded-xl border border-cyan-300/20 bg-gradient-to-br from-card to-card/70 p-4 space-y-4">
              <p className="font-semibold uppercase">{index === 0 ? "Baja" : index === 1 ? "Media" : "Alta"} intensidad</p>
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <span>Presion objetivo</span>
                    <span className="font-mono text-cyan-400">{row.targetPressureKpa} kPa</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={0.5}
                    value={row.targetPressureKpa}
                    onChange={(e) =>
                      setConfigs((prev) =>
                        prev.map((item) =>
                          item.id === row.id
                            ? { ...item, targetPressureKpa: Number(e.target.value) }
                            : item,
                        ),
                      )
                    }
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <span>Tiempo de mantenimiento</span>
                    <span className="font-mono text-cyan-400">{row.holdTimeSeconds} s</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={60}
                    step={1}
                    value={row.holdTimeSeconds}
                    onChange={(e) =>
                      setConfigs((prev) =>
                        prev.map((item) =>
                          item.id === row.id
                            ? { ...item, holdTimeSeconds: Number(e.target.value) }
                            : item,
                        ),
                      )
                    }
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <span>Tiempo de desinflado</span>
                    <span className="font-mono text-cyan-400">{row.releaseTimeSeconds} s</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={row.releaseTimeSeconds}
                    onChange={(e) =>
                      setConfigs((prev) =>
                        prev.map((item) =>
                          item.id === row.id
                            ? { ...item, releaseTimeSeconds: Number(e.target.value) }
                            : item,
                        ),
                      )
                    }
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <span>Ciclos objetivo</span>
                    <span className="font-mono text-cyan-400">{row.cycleTarget}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    step={1}
                    value={row.cycleTarget}
                    onChange={(e) =>
                      setConfigs((prev) =>
                        prev.map((item) =>
                          item.id === row.id
                            ? { ...item, cycleTarget: Number(e.target.value) }
                            : item,
                        ),
                      )
                    }
                    className="w-full accent-violet-500"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={row.targetPressureKpa}
                  onChange={(e) =>
                    setConfigs((prev) =>
                      prev.map((item) =>
                        item.id === row.id
                          ? { ...item, targetPressureKpa: Number(e.target.value) }
                          : item,
                      ),
                    )
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                />
                <input
                  type="number"
                  value={row.holdTimeSeconds}
                  onChange={(e) =>
                    setConfigs((prev) =>
                      prev.map((item) =>
                        item.id === row.id
                          ? { ...item, holdTimeSeconds: Number(e.target.value) }
                          : item,
                      ),
                    )
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                />
                <input
                  type="number"
                  value={row.releaseTimeSeconds}
                  onChange={(e) =>
                    setConfigs((prev) =>
                      prev.map((item) =>
                        item.id === row.id
                          ? { ...item, releaseTimeSeconds: Number(e.target.value) }
                          : item,
                      ),
                    )
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                />
                <input
                  type="number"
                  value={row.cycleTarget}
                  onChange={(e) =>
                    setConfigs((prev) =>
                      prev.map((item) =>
                        item.id === row.id
                          ? { ...item, cycleTarget: Number(e.target.value) }
                          : item,
                      ),
                    )
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <Button onClick={() => void save(row)}>Guardar perfil</Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Calibracion de sensores</CardTitle>
        </CardHeader>
        <CardContent>
          Calibracion por sensor con historial y usuario responsable.
        </CardContent>
      </Card>
    </div>
  );
}
