// Crear sesión: configuración del protocolo para un paciente
export interface CreateSessionDto {
  patientId: string;
  targetPressure: number; // presión objetivo de la banda
  holdTimeSeconds: number; // tiempo de mantenimiento de la presión (segundos)
}

// Subir datos de una sesión: mediciones del dispositivo
export interface CreateSessionDataDto {
  measuredPressure: number; // presión medida en la banda
  temperature: number; // temperatura del sensor/sistema (°C)
  cycleIndex?: number; // número de ciclo dentro de la sesión (opcional)
}

export interface SessionData {
  id: string;
  measuredPressure: number;
  temperature: number;
  cycleIndex?: number;
  recordedAt: string; // ISO string desde el backend
}

export interface Session {
  id: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  startedAt: string;
  endedAt?: string | null;

  // Configuración con la que se ejecutó la sesión
  targetPressure: number;
  holdTimeSeconds: number;

  records?: SessionData[];
}
