import { z } from "zod";

export const companySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa.").max(200, "Nome muito longo."),
  document: z.string().trim().max(20, "Documento muito longo.").optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(255, "E-mail muito longo.")
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "E-mail inválido.",
    }),
  phone: z.string().trim().max(20, "Telefone muito longo.").optional().or(z.literal("")),
  // P2-06: website não era validado como URL — qualquer texto passava.
  website: z
    .string()
    .trim()
    .max(2048, "Endereço muito longo.")
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().url().safeParse(v).success, {
      message: "Informe uma URL válida (ex.: https://empresa.com.br).",
    }),
  notes: z.string().trim().max(5000, "Observações muito longas.").optional().or(z.literal("")),
});

export type CompanyInput = z.infer<typeof companySchema>;
