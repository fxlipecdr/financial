import { z } from "zod";

export const DEFAULT_PIN = "123456";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "O usuário deve ter pelo menos 3 caracteres")
    .max(30, "O usuário deve ter no máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_.-]+$/, "O usuário deve conter apenas letras, números ou caracteres (. - _)"),
  pin: z
    .string()
    .min(4, "O PIN deve conter no mínimo 4 dígitos")
    .max(6, "O PIN deve conter no máximo 6 dígitos")
    .regex(/^\d+$/, "O PIN deve conter apenas dígitos numéricos"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "O nome deve ter no mínimo 2 caracteres")
    .max(60, "O nome deve ter no máximo 60 caracteres"),
  username: z
    .string()
    .min(3, "O usuário deve ter pelo menos 3 caracteres")
    .max(30, "O usuário deve ter no máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_.-]+$/, "O usuário deve conter apenas letras, números ou caracteres (. - _)"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const changePinSchema = z
  .object({
    newPin: z
      .string()
      .min(4, "O novo PIN deve conter no mínimo 4 dígitos")
      .max(6, "O novo PIN deve conter no máximo 6 dígitos")
      .regex(/^\d+$/, "O novo PIN deve conter apenas números"),
    confirmPin: z.string().min(1, "Confirme o seu novo PIN"),
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: "Os PINs informados não coincidem",
    path: ["confirmPin"],
  })
  .refine((data) => data.newPin !== DEFAULT_PIN, {
    message: "O novo PIN não pode ser igual ao PIN padrão (123456)",
    path: ["newPin"],
  });

export type ChangePinFormData = z.infer<typeof changePinSchema>;
