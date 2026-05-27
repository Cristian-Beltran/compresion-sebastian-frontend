import type { User } from "@/types/user.interface";

export interface Patient {
  id: string;
  user: User;
  age?: number;
  sex?: "masculino" | "femenino" | "otro";
  treatedLimb?: string;
  mobilityLevel?: "independiente" | "movilidad_reducida" | "inmovil";
}

export interface CreatePatient {
  fullname: string;
  email: string;
  password?: string;
  address?: string;
  deviceId?: string;
  age?: number;
  sex?: "masculino" | "femenino" | "otro";
  treatedLimb?: string;
  mobilityLevel?: "independiente" | "movilidad_reducida" | "inmovil";
}
