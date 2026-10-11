import type React from "react";
import BaseLayout from "./base";
import Header from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";

const DashboardLayout: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    const key = `venoflow-welcome-${user.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      setWelcomeOpen(true);
    }
  }, [user]);
  const copy = user?.type === "doctor"
    ? "Tu panel clínico está listo para gestionar pacientes y tratamientos."
    : user?.type === "technical"
      ? "Tu panel técnico está listo para supervisar el equipo y sus actuadores."
      : "Tu panel administrativo está listo para gestionar la plataforma VenoFlow.";
  return (
    <BaseLayout showThemeToggle={false}>
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col pl-[260px]">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-[1600px] px-6 py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {welcomeOpen && user && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><div className="w-full max-w-md rounded-2xl bg-card p-7 shadow-2xl"><p className="eyebrow text-primary">VenoFlow</p><h2 className="mt-2 text-2xl font-bold">{user.type === "doctor" ? "Dr." : ""} {user.fullname}, bienvenido</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p><Button className="mt-6 w-full" onClick={() => setWelcomeOpen(false)}>Continuar</Button></div></div>}
    </BaseLayout>
  );
};

export default DashboardLayout;
