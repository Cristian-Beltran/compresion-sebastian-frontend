import type React from "react";
import BaseLayout from "./base";
import Header from "@/components/dashboard/Header";
import { Outlet } from "react-router-dom";

const DashboardLayout: React.FC = () => {
  // ya no usamos sidebar, pero dejo el estado por si quieres algún overlay futuro

  return (
    <BaseLayout showThemeToggle={false}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header con navegación */}
        <Header />

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </BaseLayout>
  );
};

export default DashboardLayout;
