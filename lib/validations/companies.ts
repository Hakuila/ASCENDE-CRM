import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(2, "Informe o nome da empresa."),
  document: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "E-mail inválido.",
    }),
  phone: z.string().trim().optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type CompanyInput = z.infer<typeof companySchema>;
