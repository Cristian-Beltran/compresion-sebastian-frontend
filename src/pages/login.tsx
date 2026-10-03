import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import AuthLayout from "@/layouts/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/auth/useAuth";

const formSchema = z.object({
  email: z
    .string()
    .email({
      message: "Por favor ingrese un correo electronico valido.",
    })
    .min(1, { message: "El correo electronico es obligatorio." }),
  password: z.string().min(6, {
    message: "La contrasena debe tener al menos 6 caracteres.",
  }),
});

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setServerError("");
    try {
      await login({ email: values.email, password: values.password });
      const role = useAuthStore.getState().type;
      const redirectMap: Record<string, string> = {
        admin: "/admin/dashboard",
        technical: "/technical/dashboard",
        doctor: "/doctor/dashboard",
      };
      navigate(redirectMap[role ?? "doctor"] ?? "/doctor/dashboard");
    } catch {
      setServerError(
        "No pudimos validar sus credenciales. Verifique los datos e intente nuevamente.",
      );
      form.setError("email", { type: "server", message: " " });
      form.setError("password", { type: "server", message: " " });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#edf3f8" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary" />
          <p className="text-xs font-semibold text-muted-foreground">
            Inicializando panel de control de compresion...
          </p>
        </div>
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <AuthLayout
      title="Iniciar sesion en Sebastian"
      subtitle="Gestione la compresion neumatica y el monitoreo de presion desde una unica consola."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
        >
          {serverError && (
            <Alert variant="destructive" className="border-destructive/40">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {serverError}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold" style={{ color: "#3a4b5e" }}>
                    Correo corporativo
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </span>
                      <Input
                        placeholder="usuario@sebastian.clinic"
                        className="h-[46px] rounded-[10px] pl-10 text-sm"
                        style={{ borderColor: "#cbd6e2" }}
                        autoComplete="email"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-1.5 flex items-center justify-between">
                    <FormLabel className="text-xs font-bold" style={{ color: "#3a4b5e" }}>
                      Contrasena de acceso
                    </FormLabel>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-accent">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Sesion cifrada</span>
                    </div>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </span>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="......"
                        className="h-[46px] rounded-[10px] pl-10 pr-10 text-sm"
                        style={{ borderColor: "#cbd6e2" }}
                        autoComplete="current-password"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showPassword
                            ? "Ocultar contrasena"
                            : "Mostrar contrasena"}
                        </span>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex h-2 w-2 rounded-full bg-accent" />
            <span className="text-muted-foreground">Conexion segura al modulo de control</span>
          </div>

          <Button
            type="submit"
            className="btn-biomed h-[52px] w-full rounded-[10px] text-base text-white"
            style={{ background: "#0b5cab" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando credenciales...
              </>
            ) : (
              "Acceder al panel de compresion"
            )}
          </Button>

          <div className="space-y-1 border-t border-border pt-4 text-[11px] text-muted-foreground">
            <p>
              El acceso esta restringido a personal autorizado. No comparta sus
              credenciales con terceros.
            </p>
            <p>
              Cada accion realizada sobre la banda de compresion y los ciclos de
              presion queda registrada para efectos de trazabilidad clinica.
            </p>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}
