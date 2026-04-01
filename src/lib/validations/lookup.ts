import { z } from "zod";

export const createLookupValueSchema = z.object({
  value: z.string().min(1, "Value is required").max(200),
  label: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).optional(),
  parentValueId: z.string().optional().nullable(),
});

export const updateLookupValueSchema = z.object({
  value: z.string().min(1).max(200).optional(),
  label: z.string().max(200).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  parentValueId: z.string().optional().nullable(),
});

export type CreateLookupValueInput = z.infer<typeof createLookupValueSchema>;
export type UpdateLookupValueInput = z.infer<typeof updateLookupValueSchema>;
