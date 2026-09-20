import { z } from "zod";

export const organizationProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa.").max(200, "Nome muito longo."),
  legalName: z.string().trim().max(200, "Razão social muito longa.").optional().or(z.literal("")),
  cnpj: z.string().trim().max(20, "CNPJ muito longo.").optional().or(z.literal("")),
  // P2-06: logoUrl não era validado como URL — qualquer texto passava.
  logoUrl: z
    .string()
    .trim()
    .max(2048, "Endereço muito longo.")
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().url().safeParse(v).success, {
      message: "Informe uma URL válida para o logo.",
    }),
});

export const inviteTeamMemberSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(200, "Nome muito longo."),
  email: z.string().trim().email("Informe um e-mail válido.").max(255, "E-mail muito longo."),
  role: z.enum(["client_admin", "salesperson"]),
});

export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>;
export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
