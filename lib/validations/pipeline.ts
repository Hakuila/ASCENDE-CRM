import { z } from "zod";

export const stageSchema = z.object({
  name: z.string().min(2, "Informe o nome da etapa."),
  kind: z.enum(["open", "won", "lost"]),
});

export type StageInput = z.infer<typeof stageSchema>;
