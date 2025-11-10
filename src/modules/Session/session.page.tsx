import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  RotateCcw,
  Thermometer,
  Activity,
  Clock,
  BarChart3,
} from "lucide-react";

import { DashboardHeader } from "@/components/headerPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { sessionStore } from "./data/session.store";
import type { Session, SessionData } from "./session.interface";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatShortDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function PatientSessionsPage() {
  const { id: patientId } = useParams<{ id: string }>();

  const { sessions, isLoading, error, fetchByPatient } = sessionStore();

  useEffect(() => {
    if (patientId) {
      fetchByPatient(patientId);
    }
  }, [patientId, fetchByPatient]);

  const onReload = () => {
    if (patientId) {
      fetchByPatient(patientId);
    }
  };

  const { patientName, totalSessions, totalRecords, lastSession } =
    useMemo(() => {
      if (!sessions || sessions.length === 0) {
        return {
          patientName: "Paciente",
          totalSessions: 0,
          totalRecords: 0,
          lastSession: undefined as Session | undefined,
        };
      }

      const first = sessions[0];
      const name = first.patient
        ? `${first.patient.firstName} ${first.patient.lastName}`
        : "Paciente";

      const recordsCount = sessions.reduce(
        (acc, s) => acc + (s.records?.length ?? 0),
        0,
      );

      return {
        patientName: name,
        totalSessions: sessions.length,
        totalRecords: recordsCount,
        lastSession: first,
      };
    }, [sessions]);

  return (
    <>
      {/* Header principal */}
      <div className="space-y-6">
        <DashboardHeader
          title={`Sesiones · ${patientName}`}
          description="Historial de sesiones de compresión y telemetría del dispositivo."
          actions={
            <Button
              size="icon"
              variant="outline"
              onClick={onReload}
              title="Recargar"
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          }
        />
      </div>

      <div className="mt-4 space-y-6">
        {/* Errores */}
        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">
                No se pudieron cargar las sesiones
              </CardTitle>
              <p className="text-sm text-destructive/90">{error}</p>
            </CardHeader>
          </Card>
        )}

        {/* Resumen superior */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Total de sesiones */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de sesiones
              </CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-semibold">{totalSessions}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Sesiones registradas para este paciente.
              </p>
            </CardContent>
          </Card>

          {/* Registros totales */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Registros de telemetría
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-semibold">{totalRecords}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Lecturas de presión y temperatura almacenadas.
              </p>
            </CardContent>
          </Card>

          {/* Última sesión */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Última sesión
              </CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-40" />
              ) : lastSession ? (
                <>
                  <div className="text-sm font-semibold">
                    {formatShortDate(lastSession.startedAt)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Presión objetivo:{" "}
                    <span className="font-medium">
                      {lastSession.targetPressure.toFixed(1)} unidades
                    </span>
                    , mantenimiento:{" "}
                    <span className="font-medium">
                      {lastSession.holdTimeSeconds}s
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin sesiones registradas aún.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs principales: sesiones vs registros planos (si quisieras otra vista luego) */}
        <Tabs defaultValue="sessions" className="w-full">
          {/* Vista por sesiones */}
          <TabsContent value="sessions" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sesiones de compresión</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detalle de cada sesión con sus lecturas de presión y
                  temperatura del sensor.
                </p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este paciente aún no tiene sesiones registradas.
                  </p>
                ) : (
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full space-y-2"
                  >
                    {sessions.map((session) => (
                      <AccordionItem key={session.id} value={session.id}>
                        <AccordionTrigger className="flex items-center justify-between gap-4">
                          <div className="flex flex-col items-start gap-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {formatShortDate(session.startedAt)}
                              </span>
                              {session.endedAt ? (
                                <Badge
                                  variant="outline"
                                  className="text-[11px]"
                                >
                                  Cerrada
                                </Badge>
                              ) : (
                                <Badge className="text-[11px]">Activa</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Presión objetivo:{" "}
                              <span className="font-medium">
                                {session.targetPressure.toFixed(1)}
                              </span>{" "}
                              · Mantenimiento:{" "}
                              <span className="font-medium">
                                {session.holdTimeSeconds}s
                              </span>{" "}
                              · Registros:{" "}
                              <span className="font-medium">
                                {session.records?.length ?? 0}
                              </span>
                            </p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <SessionRecordsTable
                            records={session.records ?? []}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Placeholder por ahora */}
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>Vista plana de registros</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Esta vista puede consolidar todos los registros de todas las
                  sesiones en una sola tabla o gráfica. Se puede implementar más
                  adelante.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

/**
 * Tabla pequeña de registros de una sesión
 */
interface SessionRecordsTableProps {
  records: SessionData[];
}

function SessionRecordsTable({ records }: SessionRecordsTableProps) {
  if (!records || records.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No hay registros de telemetría para esta sesión.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-md border">
      <div className="grid grid-cols-4 gap-2 px-3 py-2 text-[11px] font-medium text-muted-foreground bg-muted/60">
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Presión
        </div>
        <div className="flex items-center gap-1">
          <Thermometer className="h-3 w-3" />
          Temp.
        </div>
        <div>Ciclo</div>
        <div>Registrado</div>
      </div>
      <div className="divide-y">
        {records.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-4 gap-2 px-3 py-2 text-xs text-foreground"
          >
            <div>{r.measuredPressure.toFixed(2)}</div>
            <div>{r.temperature.toFixed(2)} °C</div>
            <div>{r.cycleIndex ?? "—"}</div>
            <div className="text-muted-foreground">
              {formatDate(r.recordedAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
