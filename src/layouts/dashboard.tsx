import type React from "react";
import BaseLayout from "./base";
import Header from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Outlet } from "react-router-dom";

const DashboardLayout: React.FC = () => {
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
    </BaseLayout>
  );
};

export default DashboardLayout;
