import { z } from "zod";

export const inviteClientSchema = z.object({
  orgName: z.string().trim().min(2, "Informe o nome da empresa.").max(200, "Nome muito longo."),
  adminName: z
    .string()
    .trim()
    .min(2, "Informe o nome do responsável.")
    .max(200, "Nome muito longo."),
  adminEmail: z.string().trim().email("Informe um e-mail válido.").max(255, "E-mail muito longo."),
});

export type InviteClientInput = z.infer<typeof inviteClientSchema>;
