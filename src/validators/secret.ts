import { z } from "zod";

export const createSecretSchema = z.object({
  content: z
    .string()
    .min(1, "Secret content cannot be empty")
    .max(25000, "Secret content exceeds 25,000 characters"),

  expiresInMinutes: z
    .number()
    .int("Must be whole minutes")
    .min(1, "Minimum expiration is 1 minute")
    .max(30, "Maximum expiration is 30 minutes"),

  title: z.string().trim().max(100).optional(),

  webhookUrl: z.string().url().optional().or(z.literal("")),
});

export type CreateSecretInput = z.infer<typeof createSecretSchema>;
