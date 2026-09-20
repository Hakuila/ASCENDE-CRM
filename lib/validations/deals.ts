import { z } from "zod";

// yyyy-mm-dd, formato que <input type="date"> sempre envia.
const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

export const dealSchema = z.object({
  title: z.string().trim().min(2, "Informe um título para a oportunidade.").max(200, "Título muito longo."),
  // P2-06: valor negativo não faz sentido de domínio para uma oportunidade.
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
  expectedCloseDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || dateStringRegex.test(v), { message: "Data inválida." }),
});

export type DealInput = z.infer<typeof dealSchema>;
