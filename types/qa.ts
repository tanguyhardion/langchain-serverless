import { z } from "zod";

export const QASchema = z.object({
  question: z.string(),
  answer: z.string(),
  contextLarge: z.string(),
  contextMedium: z.string(),
  contextSmall: z.string(),
});

export const QAListObjectSchema = z.object({
  items: z.array(QASchema),
});

export type QASchemaType = z.infer<typeof QASchema>;
