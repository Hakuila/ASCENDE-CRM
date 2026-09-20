import { z } from "zod";

// P2-06: campos numéricos agora rejeitam negativo — investimento, impressões
// e cliques negativos não fazem sentido de domínio e passavam antes.
function nonNegativeNumberString(message: string) {
  return z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => {
        if (!v) return true;
        const n = Number(v.replace(",", "."));
        return !Number.isNaN(n) && n >= 0;
      },
      { message }
    );
}

function nonNegativeIntegerString(message: string) {
  return z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => {
        if (!v) return true;
        const n = Number(v);
        return Number.isInteger(n) && n >= 0;
      },
      { message }
    );
}

export const campaignSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da campanha.").max(200, "Nome muito longo."),
  platform: z
    .string()
    .trim()
    .min(2, "Informe a plataforma (ex.: Meta Ads, Google Ads).")
    .max(100, "Nome da plataforma muito longo."),
  externalId: z.string().trim().max(255, "ID externo muito longo.").optional().or(z.literal("")),
  spend: nonNegativeNumberString("Investimento deve ser numérico e não negativo."),
  impressions: nonNegativeIntegerString("Impressões deve ser um número inteiro e não negativo."),
  clicks: nonNegativeIntegerString("Cliques deve ser um número inteiro e não negativo."),
});

export type CampaignInput = z.infer<typeof campaignSchema>;
