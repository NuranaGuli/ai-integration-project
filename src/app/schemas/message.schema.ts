import { z } from "zod";

export const MessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(500, "Message is too long"),
  courseLanguage: z
    .enum(["en", "es", "fr", "de", "ja", "ko", "zh", "pt", "it", "ru"])
    .default("en"),
  authorId: z.string().default("user-123"),
});

export type MessageInput = z.infer<typeof MessageSchema>;
