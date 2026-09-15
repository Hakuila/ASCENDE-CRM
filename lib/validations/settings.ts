import { z } from "zod";

export const organizationProfileSchema = z.object({
  name: z.string().min(2, "Informe o nome da empresa."),
  legalName: z.string().trim().optional().or(z.literal("")),
  cnpj: z.string().trim().optional().or(z.literal("")),
  logoUrl: z.string().trim().optional().or(z.literal("")),
});

export const inviteTeamMemberSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  email: z.string().email("Informe um e-mail válido."),
  role: z.enum(["client_admin", "salesperson"]),
});

export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>;
export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
