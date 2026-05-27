import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { Patient } from "./patient.interface";
import { userPatientStore } from "./data/patient.store";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: Patient | null;
}

export default function PatientFormModal({ isOpen, onClose, user }: Props) {
  const patientSchema = z.object({
    fullname: z.string().min(2, "Nombre requerido"),
    email: z.string().email("Correo Requerido"),
    password: user
      ? z.string().optional() // en edición no valida contraseña
      : z.string().min(6, "Contraseña requerida"), // en creación sí
    address: z.string().optional(),
    age: z
      .preprocess(
        (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
        z.number().int().min(0).max(120).optional(),
      ),
    sex: z.enum(["masculino", "femenino", "otro"]).optional(),
    treatedLimb: z.string().optional(),
    mobilityLevel: z
      .enum(["independiente", "movilidad_reducida", "inmovil"])
      .optional(),
  });
  type PatientFormValues = any;

  const { create, update } = userPatientStore();
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      fullname: "",
      email: "",
      address: "",
      age: undefined,
      sex: undefined,
      treatedLimb: "",
      mobilityLevel: undefined,
    },
  });

  useEffect(() => {
    if (user) {
      const { user: base } = user;
      form.reset({
        fullname: base.fullname,
        email: base.email,
        address: base.address || "",
        age: user.age,
        sex: user.sex,
        treatedLimb: user.treatedLimb || "",
        mobilityLevel: user.mobilityLevel,
      });
    } else {
      form.reset({
        fullname: "",
        email: "",
        address: "",
        age: undefined,
        sex: undefined,
        treatedLimb: "",
        mobilityLevel: undefined,
      });
    }
  }, [user, form, isOpen]);

  const onSubmit = async (data: PatientFormValues) => {
    try {
      if (user) {
        await update(user.user.id, {
          fullname: data.fullname,
          address: data.address,
          email: data.email,
          age: data.age,
          sex: data.sex,
          treatedLimb: data.treatedLimb,
          mobilityLevel: data.mobilityLevel,
        });
      } else {
        await create(data);
      }
      onClose();
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        toast.error("Ha ocurrido un error");
        return;
      }
      if (error.response?.status === 400) {
        toast.error("Correo repetido");
        form.setError("email", { type: "server" }, { shouldFocus: true });
        return;
      }
      toast.error(error.response?.data.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{user ? "Editar usuario" : "Crear Usuario"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="fullname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Correo electronico</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!user && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Dirreción</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edad</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={120}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo</FormLabel>
                    <FormControl>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : e.target.value)
                        }
                      >
                        <option value="">Seleccionar</option>
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                        <option value="otro">Otro</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="treatedLimb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Extremidad tratada</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: pierna izquierda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobilityLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel de movilidad</FormLabel>
                    <FormControl>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : e.target.value)
                        }
                      >
                        <option value="">Seleccionar</option>
                        <option value="independiente">Independiente</option>
                        <option value="movilidad_reducida">Movilidad reducida</option>
                        <option value="inmovil">Inmovil</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {user ? "Editar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
