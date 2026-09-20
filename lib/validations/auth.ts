import { z } from "zod";

// P2-06: max no e-mail/senha evita payloads desnecessariamente grandes
// batendo no Supabase Auth (e, no caso da senha, no custo de hash/compare).
export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(255, "E-mail muito longo."),
  password: z.string().min(1, "Informe sua senha.").max(200, "Senha muito longa."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(255, "E-mail muito longo."),
});

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(200, "Senha muito longa."),
    confirmPassword: z.string().max(200, "Senha muito longa."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
