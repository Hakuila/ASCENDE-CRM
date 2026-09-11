import { z } from "zod";

// Telefone: aceita formatos brasileiros comuns — (11) 91234-5678, 11912345678, +55 11 91234-5678
const phoneRegex = /^[\d\s()+-]{8,20}$/;

export const leadSchema = z.object({
  name: z.string().min(2, "Informe o nome do lead."),
  email: z
    .string()
    .trim()
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
  source: z.string().trim().optional().or(z.literal("")),
  medium: z.string().trim().optional().or(z.literal("")),
  campaign: z.string().trim().optional().or(z.literal("")),
  value: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Number(v.replace(",", "."))), {
      message: "Valor deve ser numérico.",
    }),
  notes: z.string().trim().optional().or(z.literal("")),
  ownerId: z.string().uuid().optional().or(z.literal("")),
  stageId: z.string().uuid().optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;
