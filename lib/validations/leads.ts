import { z } from "zod";

// Telefone: aceita formatos brasileiros comuns — (11) 91234-5678, 11912345678, +55 11 91234-5678
const phoneRegex = /^[\d\s()+-]{8,20}$/;

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do lead.").max(200, "Nome muito longo."),
  email: z
    .string()
    .trim()
    .max(255, "E-mail muito longo.")
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "E-mail inválido.",
    }),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || phoneRegex.test(v), { message: "Telefone inválido." }),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || phoneRegex.test(v), { message: "WhatsApp inválido." }),
  source: z.string().trim().max(255, "Origem muito longa.").optional().or(z.literal("")),
  medium: z.string().trim().max(255, "Mídia muito longa.").optional().or(z.literal("")),
  campaign: z.string().trim().max(255, "Campanha muito longa.").optional().or(z.literal("")),
  // P2-06: valor negativo não faz sentido de domínio para um lead.
  value: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => {
        if (!v) return true;
        const n = Number(v.replace(",", "."));
        return !Number.isNaN(n) && n >= 0;
      },
      { message: "Valor deve ser numérico e não negativo." }
    ),
  notes: z.string().trim().max(5000, "Observações muito longas.").optional().or(z.literal("")),
  ownerId: z.string().uuid().optional().or(z.literal("")),
  stageId: z.string().uuid().optional().or(z.literal("")),
  companyId: z.string().uuid().optional().or(z.literal("")),
  campaignId: z.string().uuid().optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;
