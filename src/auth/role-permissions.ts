export type Role = "technical" | "doctor" | "admin";
export type Permission =
  | "patients.read"
  | "patients.write"
  | "sessions.read"
  | "sessions.write"
  | "telemetry.read"
  | "telemetry.write"
  | "device.control"
  | "calibration.write"
  | "users.write"
  | "logs.read";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  technical: [
    "telemetry.read",
    "telemetry.write",
    "device.control",
    "calibration.write",
    "logs.read",
  ],
  doctor: [
    "patients.read",
    "patients.write",
    "sessions.read",
    "sessions.write",
    "telemetry.read",
  ],
  admin: [
    "patients.read",
    "patients.write",
    "sessions.read",
    "sessions.write",
    "telemetry.read",
    "telemetry.write",
    "device.control",
    "calibration.write",
    "users.write",
    "logs.read",
  ],
};
