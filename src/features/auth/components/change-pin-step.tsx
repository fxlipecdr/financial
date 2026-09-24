"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ShieldCheck, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { changePinSchema, ChangePinFormData, DEFAULT_PIN } from "../schemas/auth.schemas";
import { useAuthStore } from "../stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChangePinStepProps {
  onSuccess?: () => void;
}

export function ChangePinStep({ onSuccess }: ChangePinStepProps) {
  const [showNewPin, setShowNewPin] = React.useState(false);
  const [showConfirmPin, setShowConfirmPin] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const pendingUser = useAuthStore((state) => state.pendingChangePinUser);
  const changePin = useAuthStore((state) => state.changePin);
  const cancelChangePin = useAuthStore((state) => state.cancelChangePin);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePinFormData>({
    resolver: zodResolver(changePinSchema),
    defaultValues: {
      newPin: "",
      confirmPin: "",
    },
  });

  if (!pendingUser) {
    return null;
  }

  const onSubmit = (data: ChangePinFormData) => {
    setIsSubmitting(true);

    try {
      const result = changePin(pendingUser.username, pendingUser.pin, data.newPin);

      if (!result.success) {
        toast.error(result.error || "Erro ao atualizar PIN");
        return;
      }

      toast.success("PIN pessoal configurado com sucesso!", {
        description: "Você já está conectado ao sistema.",
      });

      if (onSuccess) {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Criar Novo PIN Pessoal
        </h2>
        <p className="text-xs text-muted-foreground">
          Olá, <strong className="text-foreground">{pendingUser.name}</strong> (@{pendingUser.username}).
          Detectamos que este é o seu primeiro acesso. Por segurança, substitua o PIN padrão antes de continuar.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Aviso de Segurança:</span> O PIN deve possuir entre 4 e 6 números e não pode ser igual ao PIN temporário (<code className="rounded bg-muted px-1 py-0.5">{DEFAULT_PIN}</code>).
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPin">Novo PIN Numérico</Label>
          <div className="relative">
            <Input
              id="newPin"
              type={showNewPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              placeholder="Digite de 4 a 6 dígitos"
              className="pr-10"
              {...register("newPin")}
            />
            <button
              type="button"
              onClick={() => setShowNewPin(!showNewPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showNewPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.newPin && (
            <p className="text-xs text-destructive">{errors.newPin.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPin">Confirme o Novo PIN</Label>
          <div className="relative">
            <Input
              id="confirmPin"
              type={showConfirmPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              placeholder="Repita o novo PIN"
              className="pr-10"
              {...register("confirmPin")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPin(!showConfirmPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirmPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPin && (
            <p className="text-xs text-destructive">{errors.confirmPin.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <Lock className="size-4" />
            {isSubmitting ? "Salvando novo PIN..." : "Confirmar e Acessar"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={cancelChangePin}
            className="w-full text-xs text-muted-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Voltar para o login
          </Button>
        </div>
      </form>
    </div>
  );
}
