import { z } from "zod";

export const dealSchema = z.object({
  title: z.string().min(2, "Informe um título para a oportunidade."),
  value: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Number(v.replace(",", "."))), {
      message: "Valor deve ser numérico.",
    }),
  expectedCloseDate: z.string().optional().or(z.literal("")),
});

export type DealInput = z.infer<typeof dealSchema>;
