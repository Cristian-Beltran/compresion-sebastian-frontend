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
    age: z
      .preprocess(
        (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
        z.number().int().min(0).max(120).optional(),
      ),
    sex: z.enum(["masculino", "femenino", "otro"]).optional(),
  });
  type PatientFormValues = any;

  const { create, update } = userPatientStore();
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      fullname: "",
      age: undefined,
      sex: undefined,
    },
  });

  useEffect(() => {
    if (user) {
      const { user: base } = user;
      form.reset({
        fullname: base.fullname,
        age: user.age,
        sex: user.sex,
      });
    } else {
      form.reset({
        fullname: "",
        age: undefined,
        sex: undefined,
      });
    }
  }, [user, form, isOpen]);

  const onSubmit = async (data: PatientFormValues) => {
    try {
      if (user) {
        await update(user.user.id, {
          fullname: data.fullname,
          age: data.age,
          sex: data.sex,
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
        toast.error("No se pudo guardar el paciente");
        return;
      }
      toast.error(error.response?.data.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{user ? "Editar paciente" : "Crear paciente"}</DialogTitle>
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
