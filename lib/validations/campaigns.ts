import { z } from "zod";

export const campaignSchema = z.object({
  name: z.string().min(2, "Informe o nome da campanha."),
  platform: z.string().min(2, "Informe a plataforma (ex.: Meta Ads, Google Ads)."),
  externalId: z.string().trim().optional().or(z.literal("")),
  spend: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Number(v.replace(",", "."))), {
      message: "Investimento deve ser numérico.",
    }),
  impressions: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Number(v)), { message: "Impressões deve ser numérico." }),
  clicks: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Number(v)), { message: "Cliques deve ser numérico." }),
});

export type CampaignInput = z.infer<typeof campaignSchema>;
