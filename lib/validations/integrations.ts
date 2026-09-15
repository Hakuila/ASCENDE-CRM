import { z } from "zod";

export const metaIntegrationSchema = z.object({
  pageId: z.string().min(3, "Informe o ID da Página do Facebook."),
  pageAccessToken: z.string().min(10, "Informe o token de acesso da Página."),
});

export type MetaIntegrationInput = z.infer<typeof metaIntegrationSchema>;
