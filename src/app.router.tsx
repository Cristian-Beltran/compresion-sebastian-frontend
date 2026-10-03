import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "./layouts/dashboard";
import LoginPage from "./pages/login";
import NotFoundPage from "./pages/not-found";
import { AuthProvider } from "./auth/ProtectedRoute";
import RoleHomePage from "./pages/role-home";
import { AdminDashboardPage } from "./modules/Admin/admin-dashboard.page";
import { AdminUsersPage } from "./modules/Admin/admin-users.page";
import { AdminPermissionsPage } from "./modules/Admin/admin-permissions.page";
import { AdminLogsPage } from "./modules/Admin/admin-logs.page";
import { AdminReportsPage } from "./modules/Admin/admin-reports.page";
import { AdminSettingsPage } from "./modules/Admin/admin-settings.page";
import { TechnicalDashboardPage } from "./modules/Technical/technical-dashboard.page";
import { TechnicalSensorsPage } from "./modules/Technical/technical-sensors.page";
import { TechnicalCalibrationPage } from "./modules/Technical/technical-calibration.page";
import { TechnicalAlertsPage } from "./modules/Technical/technical-alerts.page";
import { TechnicalHistoryPage } from "./modules/Technical/technical-history.page";
import { DoctorDashboardPage } from "./modules/Doctor/doctor-dashboard.page";
import { DoctorPatientsPage } from "./modules/Doctor/doctor-patients.page";
import { DoctorTreatmentNewPage } from "./modules/Doctor/doctor-treatment-new.page";
import { DoctorTreatmentHistoryPage } from "./modules/Doctor/doctor-treatment-history.page";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <AuthProvider>
        <DashboardLayout />
      </AuthProvider>
    ),
    children: [
      { index: true, element: <RoleHomePage /> },
      { path: "admin/dashboard", element: <AdminDashboardPage /> },
      { path: "admin/users", element: <AdminUsersPage /> },
      { path: "admin/permissions", element: <AdminPermissionsPage /> },
      { path: "admin/logs", element: <AdminLogsPage /> },
      { path: "admin/reports", element: <AdminReportsPage /> },
      { path: "admin/settings", element: <AdminSettingsPage /> },
      { path: "technical/dashboard", element: <TechnicalDashboardPage /> },
      { path: "technical/sensors", element: <TechnicalSensorsPage /> },
      { path: "technical/calibration", element: <TechnicalCalibrationPage /> },
      { path: "technical/alerts", element: <TechnicalAlertsPage /> },
      { path: "technical/history", element: <TechnicalHistoryPage /> },
      { path: "doctor/dashboard", element: <DoctorDashboardPage /> },
      { path: "doctor/patients", element: <DoctorPatientsPage /> },
      { path: "doctor/treatments/new", element: <DoctorTreatmentNewPage /> },
      {
        path: "doctor/treatments/history",
        element: <DoctorTreatmentHistoryPage />,
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
