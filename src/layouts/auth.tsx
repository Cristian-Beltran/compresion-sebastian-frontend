import type React from "react";
import type { ReactNode } from "react";
import BaseLayout from "./base";
import { Activity, Gauge, HeartPulse } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <BaseLayout>
      <div className="flex min-h-screen w-full" style={{ background: "#edf3f8" }}>
        <div
          className="relative hidden w-[46%] min-w-[360px] flex-col justify-between overflow-hidden p-10 lg:flex"
          style={{ background: "#0b355d" }}
        >
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-[520px] w-[520px] rounded-full"
            style={{ border: "60px solid rgba(255,255,255,0.04)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 h-[350px] w-[350px] rounded-full"
            style={{ border: "40px solid rgba(255,255,255,0.03)" }}
          />

          <div className="relative z-10 flex items-center gap-3">
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl"
              style={{ background: "#1673c8" }}
            >
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1
                className="text-3xl font-black tracking-tight text-white"
                style={{ letterSpacing: "-0.04em" }}
              >
                Sebastian
              </h1>
              <p
                className="text-xs font-extrabold uppercase tracking-[0.12em]"
                style={{ color: "#a9d7ff" }}
              >
                Compresion neumática
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            <div>
              <p
                className="text-xs font-extrabold uppercase tracking-[0.1em]"
                style={{ color: "#a9d7ff" }}
              >
                Panel de control
              </p>
              <h2
                className="mt-2 text-4xl font-black leading-tight text-white"
                style={{ letterSpacing: "-0.04em" }}
              >
                Cuatro circuitos,
                <br />
                un solo sistema.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed" style={{ color: "#d1e5f7" }}>
                Administre la compresion y descompresion de bandas neumaticas en
                extremidades, manteniendo el flujo sanguineo bajo parametros
                controlados mediante bomba de aire y sensor de presion.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Gauge className="mb-2 h-5 w-5" style={{ color: "#78c6ff" }} />
                <p className="text-sm font-bold text-white">Presion estable</p>
                <p className="mt-1 text-xs" style={{ color: "#8da9c2" }}>
                  Ciclos configurables de compresion y relajacion.
                </p>
              </div>
              <div
                className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <HeartPulse className="mb-2 h-5 w-5" style={{ color: "#39aa82" }} />
                <p className="text-sm font-bold text-white">Monitoreo continuo</p>
                <p className="mt-1 text-xs" style={{ color: "#8da9c2" }}>
                  Lecturas en tiempo real via MQTT sobre WSS.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 animate-pulse rounded-full"
              style={{ background: "#39aa82" }}
            />
            <p className="text-xs font-semibold" style={{ color: "#cbe5fb" }}>
              Dispositivo conectado · broker MQTT activo
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-[470px]">
            <div className="mb-6">
              <p className="eyebrow text-primary">Acceso seguro</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>

            <div
              className="rounded-[22px] border border-border bg-card p-8"
              style={{ boxShadow: "0 24px 60px rgba(20, 45, 70, 0.12)" }}
            >
              {children}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Uso exclusivo de personal autorizado. Toda operacion sobre la
              banda de compresion queda registrada para auditoria.
            </p>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default AuthLayout;
