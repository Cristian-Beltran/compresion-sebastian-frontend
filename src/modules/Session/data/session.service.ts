// src/services/session/session.service.ts
import axios from "@/lib/axios";
import type {
  Session,
  CreateSessionDto,
  CreateSessionDataDto,
  SessionData,
} from "../session.interface";

const BASE_URL = "/sessions";

export const sessionService = {
  /** Crea una sesión para un paciente con la configuración del protocolo */
  create: async (data: CreateSessionDto): Promise<Session> => {
    const res = await axios.post(BASE_URL, data);
    return res.data;
  },

  /** Agrega un registro de datos a una sesión existente */
  addData: async (
    sessionId: string,
    data: CreateSessionDataDto,
  ): Promise<SessionData> => {
    const res = await axios.post(`${BASE_URL}/${sessionId}/data`, data);
    return res.data;
  },

  /** Obtiene una sesión específica con sus registros y datos del paciente */
  findOne: async (sessionId: string): Promise<Session> => {
    const res = await axios.get(`${BASE_URL}/${sessionId}`);
    return res.data;
  },

  /** Todas las sesiones del sistema con sus registros */
  findAll: async (): Promise<Session[]> => {
    const res = await axios.get(BASE_URL);
    return res.data;
  },

  /** Todas las sesiones de un paciente con sus registros */
  findByPatient: async (patientId: string): Promise<Session[]> => {
    const res = await axios.get(`${BASE_URL}/by-patient/${patientId}`);
    return res.data;
  },
};
