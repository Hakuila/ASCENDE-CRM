import { z } from "zod";

export const inviteClientSchema = z.object({
  orgName: z.string().min(2, "Informe o nome da empresa."),
  adminName: z.string().min(2, "Informe o nome do responsável."),
  adminEmail: z.string().email("Informe um e-mail válido."),
});

export type InviteClientInput = z.infer<typeof inviteClientSchema>;
