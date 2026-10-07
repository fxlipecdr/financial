import { z } from "zod";

export const DEFAULT_PIN = "fkzw5229";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "O usuário deve ter pelo menos 3 caracteres")
    .max(30, "O usuário deve ter no máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_.-]+$/, "O usuário deve conter apenas letras, números ou caracteres (. - _)"),
  pin: z
    .string()
    .min(4, "A senha deve conter pelo menos 4 caracteres")
    .max(32, "A senha deve conter no máximo 32 caracteres"),
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
      .min(4, "A nova senha deve conter no mínimo 4 caracteres")
      .max(32, "A nova senha deve conter no máximo 32 caracteres"),
    confirmPin: z.string().min(1, "Confirme a sua nova senha"),
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: "As senhas informadas não coincidem",
    path: ["confirmPin"],
  })
  .refine((data) => data.newPin !== DEFAULT_PIN, {
    message: "A nova senha não pode ser igual à senha padrão",
    path: ["newPin"],
  });

export type ChangePinFormData = z.infer<typeof changePinSchema>;
