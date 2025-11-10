import type React from "react";
import type { ReactNode } from "react";
import BaseLayout from "./base";
import { HeartPulse, AudioWaveform, GaugeCircle } from "lucide-react";

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
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center px-4 py-8">
        {/* Fondo decorativo usando solo tokens */}
        <div className="pointer-events-none fixed inset-0 opacity-70">
          <div className="absolute -top-32 -right-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background" />
        </div>

        <div className="relative z-10 w-full max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_minmax(0,1fr)] items-stretch">
            {/* Panel izquierdo: narrativa / producto */}
            <section className="rounded-3xl border border-border bg-card/80 backdrop-blur-xl p-7 sm:p-9 flex flex-col justify-between shadow-xl">
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30">
                    <HeartPulse className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                      VasoFlow
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Sistema neumático de compresión inteligente
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <AudioWaveform className="h-3.5 w-3.5" />
                  Monitor en tiempo real
                </span>
              </div>

              <div className="space-y-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">
                    Control preciso de compresión de banda.
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Administre la compresión y descompresión de una banda
                    neumática en extremidades, manteniendo el flujo sanguíneo
                    bajo parámetros controlados mediante bomba de aire y sensor
                    de presión tipo tensiómetro.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="rounded-2xl border border-border bg-muted/40 p-3 sm:p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <GaugeCircle className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        Presión de banda estable
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Control de ciclos de compresión y relajación para brazo o
                      pierna con parámetros configurables.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/40 p-3 sm:p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <AudioWaveform className="h-4 w-4 text-primary" />
                      <span className="font-medium">Monitoreo continuo</span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Lecturas en tiempo real del tensiómetro integrado en la
                      banda neumática.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span>Dispositivo conectado</span>
                </div>
                <p>
                  Diseñado para entornos clínicos y laboratorios de ensayo
                  controlado.
                </p>
              </div>
            </section>

            {/* Panel derecho: formulario de autenticación */}
            <section className="flex flex-col justify-center">
              <div className="mb-6 text-left">
                <p className="text-xs uppercase tracking-[0.2em] text-primary/80 mb-2">
                  Acceso seguro
                </p>
                <h2 className="text-xl sm:text-2xl font-semibold">{title}</h2>
                {subtitle && (
                  <p className="mt-2 text-sm text-muted-foreground max-w-md">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-5 sm:p-6 shadow-lg">
                {children}
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Uso exclusivo de personal autorizado. Toda operación sobre la
                banda de compresión queda registrada para auditoría.
              </p>
            </section>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default AuthLayout;
