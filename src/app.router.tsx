import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "./layouts/dashboard";
import LoginPage from "./pages/login";
import NotFoundPage from "./pages/not-found";
import { AuthProvider } from "./auth/ProtectedRoute";
import RoleHomePage from "./pages/role-home";
import { AdminDashboardPage } from "./modules/Admin/admin-dashboard.page";
import { AdminControlPage } from "./modules/Admin/admin-control.page";
import { AdminCalibrationPage } from "./modules/Admin/admin-calibration.page";
import { AdminHistoryPage } from "./modules/Admin/admin-history.page";
import { AdminAlertsPage } from "./modules/Admin/admin-alerts.page";
import { AdminUsersPage } from "./modules/Admin/admin-users.page";
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
      { path: "admin/control", element: <AdminControlPage /> },
      { path: "admin/calibration", element: <AdminCalibrationPage /> },
      { path: "admin/history", element: <AdminHistoryPage /> },
      { path: "admin/alerts", element: <AdminAlertsPage /> },
      { path: "admin/users", element: <AdminUsersPage /> },
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
