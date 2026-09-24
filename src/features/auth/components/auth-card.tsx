"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  User as UserIcon,
  KeyRound,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import {
  loginSchema,
  registerSchema,
  LoginFormData,
  RegisterFormData,
  DEFAULT_PIN,
} from "../schemas/auth.schemas";
import { useAuthStore } from "../stores/auth.store";
import { ChangePinStep } from "./change-pin-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthCardProps {
  onAuthenticated?: () => void;
}

export function AuthCard({ onAuthenticated }: AuthCardProps) {
  const [activeTab, setActiveTab] = React.useState<"login" | "register">("login");
  const [showPin, setShowPin] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const { theme, setTheme } = useTheme();

  const pendingChangePinUser = useAuthStore((state) => state.pendingChangePinUser);
  const login = useAuthStore((state) => state.login);
  const registerUser = useAuthStore((state) => state.register);

  // Form de Login
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "usuario",
      pin: DEFAULT_PIN,
    },
  });

  // Form de Cadastro
  const {
    register: registerRegister,
    handleSubmit: handleSubmitRegister,
    reset: resetRegister,
    formState: { errors: registerErrors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
    },
  });

  const onLoginSubmit = (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const res = login(data.username, data.pin);

      if (!res.success) {
        toast.error(res.error || "Falha na autenticação");
        return;
      }

      if (res.mustChangePin) {
        toast.info("Primeiro acesso identificado", {
          description: "Por favor, cadastre seu novo PIN pessoal para continuar.",
        });
        return;
      }

      toast.success("Autenticado com sucesso!");
      if (onAuthenticated) {
        onAuthenticated();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const res = registerUser(data.username, data.name);

      if (!res.success) {
        toast.error(res.error || "Falha ao cadastrar usuário");
        return;
      }

      toast.success("Usuário cadastrado com sucesso!", {
        description: `Seu PIN padrão inicial é: ${res.defaultPin}. Efetue o login para cadastrar seu PIN pessoal.`,
        duration: 7000,
      });

      resetRegister();
      setActiveTab("login");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="relative mx-auto w-full max-w-md p-4">
      {/* Botão de Tema sutil no canto */}
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="text-muted-foreground hover:text-foreground"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>

      <Card className="border-border bg-card shadow-lg">
        {pendingChangePinUser ? (
          <CardContent className="pt-6">
            <ChangePinStep onSuccess={onAuthenticated} />
          </CardContent>
        ) : (
          <>
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-5" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                Controle Financeiro
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Acesse o sistema com seu nome de usuário e PIN de segurança
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as "login" | "register")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="text-xs font-medium">
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger value="register" className="text-xs font-medium">
                    Criar Conta
                  </TabsTrigger>
                </TabsList>

                {/* ABA DE LOGIN */}
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Nome de Usuário</Label>
                      <div className="relative">
                        <Input
                          id="login-username"
                          type="text"
                          autoComplete="username"
                          placeholder="ex: usuario"
                          className="pl-9"
                          {...registerLogin("username")}
                        />
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      </div>
                      {loginErrors.username && (
                        <p className="text-xs text-destructive">
                          {loginErrors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-pin">PIN de Segurança</Label>
                        <span className="text-[11px] text-muted-foreground">
                          4 a 6 dígitos
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          id="login-pin"
                          type={showPin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="••••••"
                          className="pl-9 pr-10 tracking-widest"
                          {...registerLogin("pin")}
                        />
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                          aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                        >
                          {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {loginErrors.pin && (
                        <p className="text-xs text-destructive">{loginErrors.pin.message}</p>
                      )}
                    </div>

                    <div className="rounded-md border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">Credencial Padrão:</span>{" "}
                      usuário: <code className="rounded bg-muted px-1 py-0.5">usuario</code> | PIN:{" "}
                      <code className="rounded bg-muted px-1 py-0.5">{DEFAULT_PIN}</code>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      <LogIn className="size-4" />
                      {isLoading ? "Validando..." : "Entrar no Sistema"}
                    </Button>
                  </form>
                </TabsContent>

                {/* ABA DE CADASTRO */}
                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={handleSubmitRegister(onRegisterSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Nome Completo</Label>
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="Seu nome ou apelido"
                        {...registerRegister("name")}
                      />
                      {registerErrors.name && (
                        <p className="text-xs text-destructive">
                          {registerErrors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-username">Nome de Usuário Escolhido</Label>
                      <div className="relative">
                        <Input
                          id="reg-username"
                          type="text"
                          autoComplete="username"
                          placeholder="usuario_novo"
                          className="pl-9"
                          {...registerRegister("username")}
                        />
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      </div>
                      {registerErrors.username && (
                        <p className="text-xs text-destructive">
                          {registerErrors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="rounded-md border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">Aviso do Primeiro Acesso:</span>{" "}
                      Novos cadastros recebem o PIN temporário{" "}
                      <code className="rounded bg-muted px-1 py-0.5">{DEFAULT_PIN}</code>. A alteração para um novo PIN exclusivo será solicitada imediatamente no primeiro login.
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      <UserPlus className="size-4" />
                      {isLoading ? "Cadastrando..." : "Criar Conta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
