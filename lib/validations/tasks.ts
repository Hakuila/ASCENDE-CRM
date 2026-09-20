import { z } from "zod";

const dateStringRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/;

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Informe o título da tarefa.").max(200, "Título muito longo."),
  description: z.string().trim().max(5000, "Descrição muito longa.").optional().or(z.literal("")),
  dueDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || dateStringRegex.test(v), { message: "Data inválida." }),
  priority: z.enum(["low", "medium", "high"]),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
  leadId: z.string().uuid().optional().or(z.literal("")),
});

export type TaskInput = z.infer<typeof taskSchema>;
