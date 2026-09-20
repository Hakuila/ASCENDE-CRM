import { z } from "zod";

export const stageSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da etapa.").max(100, "Nome muito longo."),
  kind: z.enum(["open", "won", "lost"]),
});

export type StageInput = z.infer<typeof stageSchema>;
