import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(2, "Informe o título da tarefa."),
  description: z.string().trim().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
  leadId: z.string().uuid().optional().or(z.literal("")),
});

export type TaskInput = z.infer<typeof taskSchema>;
