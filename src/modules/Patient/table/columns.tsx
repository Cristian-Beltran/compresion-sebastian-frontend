import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import type { Patient } from "../patient.interface";

export const columns: ColumnDef<Patient>[] = [
  {
    accessorKey: "user.fullname",
    header: () => "Nombre",
  },
  {
    accessorKey: "user.email",
    header: () => "Correo",
  },
  {
    accessorKey: "user.address",
    header: () => "Dirreción",
  },
  {
    accessorKey: "age",
    header: () => "Edad",
    cell: ({ row }) => row.original.age ?? "-",
  },
  {
    accessorKey: "sex",
    header: () => "Sexo",
    cell: ({ row }) => row.original.sex ?? "-",
  },
  {
    accessorKey: "treatedLimb",
    header: () => "Extremidad tratada",
    cell: ({ row }) => row.original.treatedLimb ?? "-",
  },
  {
    accessorKey: "mobilityLevel",
    header: () => "Movilidad",
    cell: ({ row }) => {
      const value = row.original.mobilityLevel;
      if (value === "independiente") return "Independiente";
      if (value === "movilidad_reducida") return "Movilidad reducida";
      if (value === "inmovil") return "Inmovil";
      return "-";
    },
  },

  {
    accessorKey: "user.createdAt",
    id: "createdAt",
    header: () => "Registrado",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
  },
  {
    accessorKey: "user.status",
    id: "status",
    header: () => "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status");
      return (
        <Badge variant={status === "ACTIVE" ? "default" : "destructive"}>
          {status === "ACTIVE" ? "Habilitado" : "Deshabilitado"}
        </Badge>
      );
    },
  },
];
