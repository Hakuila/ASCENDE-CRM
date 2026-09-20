import { z } from "zod";

export const metaIntegrationSchema = z.object({
  pageId: z
    .string()
    .trim()
    .min(3, "Informe o ID da Página do Facebook.")
    .max(64, "ID da Página muito longo."),
  pageAccessToken: z
    .string()
    .trim()
    .min(10, "Informe o token de acesso da Página.")
    .max(2048, "Token muito longo."),
});

export type MetaIntegrationInput = z.infer<typeof metaIntegrationSchema>;
