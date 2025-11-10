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
      message: "Por favor ingrese un correo electrónico válido.",
    })
    .min(1, { message: "El correo electrónico es obligatorio." }),
  password: z.string().min(6, {
    message: "La contraseña debe tener al menos 6 caracteres.",
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
      navigate("/");
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
      <div className="min-h-screen flex items-center justify-center ">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2  animate-spin" />
          <p className="text-xs ">
            Inicializando panel de control de compresión…
          </p>
        </div>
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <AuthLayout
      title="Iniciar sesión en VasoFlow"
      subtitle="Gestione la compresión neumática y el monitoreo de presión de banda desde una única consola."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 sm:space-y-6"
        >
          {serverError && (
            <Alert variant="destructive" className="border-red-500/40">
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
                  <FormLabel className="text-xs font-medium ">
                    Correo corporativo
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ">
                        <Mail className="h-4 w-4" />
                      </span>
                      <Input
                        placeholder="usuario@vasoflow.clinic"
                        className="h-11 pl-10 text-sm "
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
                  <div className="flex items-center justify-between mb-1.5">
                    <FormLabel className="text-xs font-medium ">
                      Contraseña de acceso
                    </FormLabel>
                    <div className="flex items-center gap-1 text-[10px] ">
                      <ShieldCheck className="h-3 w-3 " />
                      <span>Sesión cifrada</span>
                    </div>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ">
                        <Lock className="h-4 w-4" />
                      </span>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 pl-10 pr-10 text-sm  "
                        autoComplete="current-password"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full "
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"}
                        </span>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center justify-between text-xs ">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full " />
              <span>Conexión segura al módulo de control</span>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl text-sm font-medium tracking-wide "
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando credenciales…
              </>
            ) : (
              "Acceder al panel de compresión"
            )}
          </Button>

          <div className="border-t  pt-4 text-[11px]  space-y-1">
            <p>
              El acceso está restringido a personal autorizado. No comparta sus
              credenciales con terceros.
            </p>
            <p className="">
              Cada acción realizada sobre la banda de compresión y los ciclos de
              presión queda registrada para efectos de trazabilidad clínica.
            </p>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}
